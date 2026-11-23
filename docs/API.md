# LIBRIVO API

Base: `http://localhost:8000/api`. SPA gọi `/api` qua Vite proxy. `Accept: application/json`. Mọi request thay đổi dữ liệu phải khởi tạo `GET /sanctum/csrf-cookie`, gửi cookie session và `X-XSRF-TOKEN`. Không có access token trong localStorage.

## Dạng phản hồi

Model: `{ "data": {...} }`. Collections: `{ "data": [...], "links": {...}, "meta": {"current_page":1,"last_page":3,"per_page":20,"total":45} }`. Các danh mục nhỏ trả `{data:[...]}` tối đa 500 mục.

Lỗi: `{message, errors?}`. HTTP 401 chưa xác thực, 403 trái quyền/khóa, 404 không tồn tại, 419 CSRF, 422 validation hoặc chuyển trạng thái không hợp lệ, 429 rate limit, 503 nguồn metadata tạm ngưng. Loan overdue là thuộc tính suy ra, không phải status được lưu.

## Công khai và auth

| Method | Endpoint | Nội dung |
|---|---|---|
| POST | `/auth/register` | `name,email,password,password_confirmation`; luôn gán Reader |
| POST | `/auth/login` | `email,password,remember?`; 6 lần/phút/IP |
| POST | `/auth/forgot-password` | `email`; phản hồi chung để tránh dò tài khoản |
| POST | `/auth/reset-password` | `email,token,password,password_confirmation` |
| POST | `/auth/logout` | Hủy session hiện tại |
| GET | `/me` | User, vai trò và quyền |
| POST | `/me/profile` | Multipart: `name,phone?,avatar?` |
| PUT | `/me/password` | `current_password,password,password_confirmation` |
| GET | `/public/stats` | Tổng sách, bản sao công khai, độc giả, danh mục, lượt mượn |
| GET | `/public/settings` | Nội dung, logo và chính sách công khai |
| GET | `/books` | `search,category,language,publisher_id,sort,available,featured,page,per_page` |
| GET | `/books/{id}` | Chi tiết, rating thật, shelves; user nhận thêm can_review và phiếu của chính mình |
| GET | `/taxonomy/{type}` | `categories,authors,publishers,shelves`; hỗ trợ search |

Book sort: `newest,title,popular,year,rating`. `per_page` 1–100. Guest và Reader chỉ xem sách visible, chưa bị lưu trữ. `favorites=1` yêu cầu session và chỉ lọc sách của user.

## Sách và kho

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/books` | books.create |
| PUT | `/books/{id}` | books.update |
| DELETE | `/books/{id}` | books.delete; từ chối nếu còn phiếu/đặt trước hoạt động |
| POST | `/uploads/cover` | books.update; `image`, JPG/PNG/WebP ≤4MB |
| GET | `/metadata/isbn?isbn=...` | books.create; Open Library, cache 24 giờ, 20 request/phút |
| GET | `/book-copies` | books.update; lọc `book_id,status,search,page` |
| GET | `/book-copies/{id}` | books.update; lịch sử và kệ |
| POST | `/books/{id}/copies` | books.create; `count:1..50,shelf_id?,condition?,acquired_at?,notes?` |
| PUT | `/book-copies/{id}` | books.update; `status,condition,shelf_id?,notes?` |
| POST/PUT/DELETE | `/taxonomy/{type}` / `/{id}` | taxonomy.manage; FK và cha/con được kiểm tra |
| POST | `/books/import` | books.create; multipart `file` CSV/XLSX ≤4MB, ≤500 dòng |

Book payload: `title,language,author_ids[],category_ids[]` bắt buộc; tùy chọn `isbn,publisher_id,year,pages,summary,description,cover,price,visible,featured,keywords[]`. ISBN unique kể cả bản ghi đã lưu trữ để giữ quy tắc phiên bản.

Không cập nhật trực tiếp bản sao borrowed/held. Dùng luồng trả hoặc hủy phiếu; bản sao lưu trữ chuyển maintenance, lịch sử còn đọc được.

## Lưu thông

| Method | Endpoint | Payload/quy tắc |
|---|---|---|
| GET | `/loans` | `status,search,page`; Reader tự động scope user; `status=overdue` được suy ra |
| POST | `/loan-requests` | `book_id,user_id?`; user_id khác chỉ cho nhân viên có loans.approve |
| POST | `/loans/{id}/approve` | loans.approve; `copy_id?`; ưu tiên bản giữ cho đúng user |
| POST | `/loans/{id}/handoff` | loans.approve; bắt đầu borrowed_at/due_at |
| POST | `/loans/{id}/reject` | loans.approve; `reason` bắt buộc |
| POST | `/loans/{id}/return` | loans.return; `condition:good/worn/damaged/lost`, `damage_fee?` |
| POST | `/loans/{id}/cancel` | Chủ sở hữu hoặc nhân viên; requested/approved |
| POST | `/loans/{id}/renew` | Chủ sở hữu hoặc nhân viên; tạo renewal, chưa sửa due_at |
| GET | `/loan-renewals` | loans.approve; `status,page` |
| PUT | `/loan-renewals/{id}` | loans.approve; `approve:boolean,reason?` |
| GET/POST | `/reservations` | Reader scope own; POST `book_id` khi hết sách |
| DELETE | `/reservations/{id}` | Chủ sở hữu hoặc nhân viên |
| GET | `/fines` | Reader scope own; `status=unpaid` |
| POST | `/fines/{id}/payments` | fines.collect; `amount,type:payment/waiver,note`; waiver cần fines.waive |

Status loan: requested → approved → active → returned; rejected/cancelled kết thúc nhánh. Status reservation: waiting → ready → fulfilled; cancelled/expired là kết thúc. Sách ready được người giữ gửi loan request; approval dùng đúng copy rồi fulfilled. Thời gian giữ mặc định 48 giờ. Scheduler chạy `library:expire-holds` mỗi phút.

Phạt trễ: `max(0, ngày lịch thực trả - ngày lịch hẹn trả - ân hạn) × mức/ngày`, áp dụng cap nếu >0. Dùng múi giờ Asia/Ho_Chi_Minh để tính ngày lịch, số nguyên VND. Tiền thanh toán + miễn giảm không được vượt amount.

## Độc giả

`GET /me/summary`: số lượt đang mượn, yêu cầu, đã trả, quá hạn, yêu thích, đặt trước, chưa đọc, dư nợ và lịch sử theo tháng.

`GET /favorites`, `PUT /favorites/{book}` với `{saved:true/false}`; `GET /reviews`; `PUT /books/{book}/review` với `rating:1..5,comment`; `DELETE /reviews/{review}` cần ownership hoặc reviews.moderate. Đánh giá yêu cầu một lượt mượn đã trả, unique user/book.

`GET /notifications?page=...`; `PUT /notifications/{uuid}/read`; `PUT /notifications/all/read`. Mọi notification query đều scope user.

## Quản trị

`GET /dashboard?period=7|30|90|365`: KPI, chart mượn/trả, top books, categories, trạng thái copy, pending, due_soon, overdue_loans, activity, fine_trend, member_trend.

`GET/POST /members`, `GET/PUT /members/{user}`; tìm `search`, lọc `locked=0/1`, `page`. Librarian chỉ thao tác Reader. Role assignment cần roles.manage, không tự khóa tài khoản đang dùng hoặc làm mất Super Admin mở khóa cuối cùng.

`GET/POST /roles`, `PUT /roles/{id}`; roles hệ thống không bị chỉnh cấu hình quyền. Custom roles chỉ được cấp các permission không nhạy cảm. `GET/PUT /settings`; mọi thay đổi cấu hình và quyền được audit.

`GET /audit-logs?search=&page=`: chỉ đọc. `GET /reports?from=YYYY-MM-DD&to=YYYY-MM-DD`; `GET /reports/export?type=books|members|loans|fines|inventory&format=csv|xlsx`; export loans nhận thêm from/to. `GET /backup`: xuất dữ liệu nghiệp vụ JSON cho Super Admin; không bao gồm credential, session và file upload.

Kiểm tra route thực tế: `php artisan route:list --path=api` trong backend.
