# LIBRIVO — Smart Library Management System

Hệ thống thư viện chạy local trên Windows: **React + TypeScript + Vite**, **Laravel 13**, **MySQL 8**, Sanctum SPA cookie và Spatie Permission. Toàn bộ dữ liệu nghiệp vụ được lưu tại MySQL; localStorage chỉ lưu lựa chọn giao diện sáng/tối.

## Mở ngay trên máy hiện tại

```bat
start.bat
```

- Website: **http://localhost:5173**
- Laravel API: **http://localhost:8000**
- Dừng dịch vụ: `stop.bat`.
- Log chạy nền: `.runtime/`.

Luôn dùng hostname **localhost** trên trình duyệt. `127.0.0.1` chỉ dùng cho kết nối MySQL trong `.env`. Đường dẫn Apache `http://localhost/deadlineDuyLe` được chặn bởi `.htaccess` để bảo vệ source và `.env` trong htdocs; sử dụng Vite ở cổng 5173.

## Tài khoản demo — chỉ dành cho local

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Super Admin | `admin@librivo.local` | `AdminDemo!2026` |
| Librarian | `librarian@librivo.local` | `LibraryDemo!2026` |
| Reader | `reader@librivo.local` | `ReaderDemo!2026` |

Các độc giả bổ sung: `member2@librivo.local` đến `member35@librivo.local`, mật khẩu `ReaderDemo!2026`. Một số tài khoản có phí chưa thanh toán hoặc sách quá hạn để thử quy tắc chặn mượn. Dùng `member30@librivo.local` cho một độc giả khác không có dư nợ ban đầu.

Mật khẩu demo không xuất hiện trong UI. Không dùng các tài khoản và mật khẩu này khi triển khai thật.

## Thiết lập trên Windows

1. Cài Node.js 22+ và chạy MySQL 8.0+.
2. Chạy `setup.bat`. Script tải PHP **8.4** portable vào `.tools/php`, xác minh SHA-256, bật các extension cần thiết, cài Composer sau khi xác minh SHA-384, cài dependencies theo lockfile, tạo database nếu có quyền, generate key khi cần, migrate, seed, tạo storage link, cài và build React.
3. Nếu chưa có `backend/.env`, script sao chép `.env.example` và hỏi mật khẩu MySQL bằng nhập ẩn. Thay host, tên database hoặc user trong `.env` khi cần. `.env.example` không chứa mật khẩu MySQL thật hoặc application key.
4. Chạy `start.bat`, sau đó truy cập http://localhost:5173.

Script giữ nguyên PHP 8.0 của XAMPP. Bộ dependency đã khóa được chạy và kiểm thử bằng PHP 8.4.27, Node.js 24.13 và MySQL 8.0.44. PHP portable có thể yêu cầu Microsoft Visual C++ Redistributable x64 nếu máy mới chưa có runtime.

Seeder giữ dữ liệu hiện có khi thư viện đã có đầu sách; không chạy `migrate:fresh` trên `librivo_db` để cập nhật ứng dụng. `setup.bat` không xóa database.

Chạy thủ công bằng PowerShell, từ thư mục project:

```powershell
& .\.tools\php\php.exe .\.tools\composer.phar install --working-dir=backend
Copy-Item backend\.env.example backend\.env  # chỉ khi chưa có .env
# Điền DB_PASSWORD trong backend/.env trước bước tiếp theo.
& .\.tools\php\php.exe scripts\database.php
Set-Location backend
& ..\.tools\php\php.exe artisan key:generate
& ..\.tools\php\php.exe artisan migrate --seed
& ..\.tools\php\php.exe artisan storage:link
& ..\.tools\php\php.exe artisan serve --host=localhost --port=8000
```

Terminal thứ hai:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Terminal thứ ba nếu không dùng `start.bat`:

```powershell
Set-Location backend
& ..\.tools\php\php.exe artisan schedule:work
```

Scheduler hết hạn giữ sách và chuyển hàng chờ mỗi phút. Thông báo hiện được lưu đồng bộ trong MySQL, nên không cần queue worker để vận hành các luồng đã triển khai.

## Những gì đã triển khai

| Nhóm | Chức năng |
|---|---|
| Xác thực | Đăng ký Reader, đăng nhập/đăng xuất, ghi nhớ phiên, reset mật khẩu qua Laravel broker, đổi mật khẩu, hồ sơ, upload avatar, khóa tài khoản, protected routes, xử lý phiên hết hạn |
| Công khai | Trang chủ, tìm kiếm nhanh Ctrl/Cmd+K, catalog có debounce, lọc/sắp xếp/phân trang server, grid/list, danh mục, chi tiết sách, đánh giá thực, yêu thích, chính sách thư viện |
| Sách & kho | CRUD đầu sách, ẩn/hiện, lưu trữ mềm, nhiều tác giả/danh mục, upload cover, bản sao độc lập, barcode Code 128, in nhãn, lịch sử từng bản, kệ sách, bảo trì/mất, metadata ISBN có cache |
| Lưu thông | Yêu cầu → duyệt/cấp bản → bàn giao → trả; hủy/từ chối; hạn mức; chặn vi phạm; khóa book/user/copy/loan trong transaction |
| Gia hạn & đặt trước | Yêu cầu và quyết định gia hạn có lịch sử; giới hạn số lần; chặn khi có hàng chờ; FIFO, giữ bản, thông báo, hủy, scheduler hết hạn và chuyển người tiếp theo |
| Tài chính | Phạt trễ theo ngày lịch Việt Nam, ân hạn, trần phạt, mất/hư hỏng; thu thủ công, miễn giảm theo quyền; khóa khoản phí khi thanh toán; tiền nguyên VND |
| Quản trị | Dashboard từ MySQL, lọc kỳ 7/30/90/365 ngày; biểu đồ mượn/trả và danh mục; requests, sắp đến hạn, quá hạn; taxonomy CRUD; thành viên/hồ sơ lịch sử; roles tùy chỉnh; bảo vệ vai trò hệ thống và Super Admin cuối |
| Báo cáo | Khoảng ngày, sách/thành viên tích cực, tồn kho, quá hạn, phí; CSV/XLSX thực; import CSV/XLSX validate toàn bộ trước khi ghi; bản xuất dữ liệu JSON; in báo cáo/lưu PDF từ trình duyệt |
| Trải nghiệm | Light/dark mode, font local hỗ trợ tiếng Việt, Motion, counters, sidebar thu gọn/mobile drawer, cover tilt, skeleton, empty/error states, toast, modal có focus trap/Escape, lazy routes, responsive |

Các trang đều dùng API thật. Dashboard không lưu số liệu cố định trong frontend. `loans` chứa cả trạng thái yêu cầu nên không có bảng `loan_requests` trùng nghĩa.

## Dữ liệu khởi tạo và hình ảnh

- Fixture **100 đầu sách**, **15 danh mục**, **300 bản sao**, **35 độc giả** cùng 2 tài khoản quản trị/nghiệp vụ.
- 220 lượt mượn đã trả, 25 lượt đang mượn, 8 yêu cầu ban đầu; thêm hàng chờ, một bản giữ sẵn, phí và biên nhận, 24 đánh giá gắn với lượt mượn hoàn tất, yêu thích và thông báo.
- Số liệu thay đổi khi sử dụng hoặc chạy E2E. Sách E2E được lưu trữ, lịch sử vẫn giữ lại; do đó tổng hiện vật có thể lớn hơn 300 sau kiểm thử.
- Nguồn metadata lưu theo từng sách tại [books.json](backend/database/fixtures/books.json). Dữ liệu chủ yếu từ Open Library; một số tác phẩm Việt Nam chỉ khai báo tên/tác giả, bỏ trống ISBN, năm và NXB chưa xác minh.
- Đã loại các bản ghi ISBN có tiêu đề/tác giả không khớp khi chuẩn bị fixture. Một số bìa nổi bật đã được lưu tại `backend/public/covers`; các bìa còn lại dùng Open Library Covers theo đúng bản ghi nguồn. Mất mạng vẫn truy cập và thao tác được; bìa chưa cache có fallback LIBRIVO theo tên và tác giả.
- Font nằm trong dependencies và được Vite đóng gói, không cần Google Fonts khi vận hành.
- Giá tham khảo để trống nếu chưa biết, không bịa giá sách. Cập nhật giá trước khi cần tính bồi thường mất sách. Phí hư hỏng được nhân viên nhập khi trả.

## Kiểm thử

Từ `backend`:

```powershell
& ..\.tools\php\php.exe artisan test --compact
```

Suite mặc định dùng **SQLite in-memory riêng cho test**, không sửa `librivo_db`. Đã chạy: **27 tests, 103 assertions** đạt. Bao gồm auth, reset mật khẩu, phân quyền/ownership, books/copies, ISBN trùng, trả lặp, phạt, gia hạn, FIFO/hết hạn/khóa người chờ, import atomic, CSV chống công thức, XLSX, upload, giữ lịch sử khi lưu trữ sách và loại sách lưu trữ khỏi số liệu công khai.

Concurrency MySQL thật, từ thư mục project:

```powershell
& .\.tools\php\php.exe scripts\test-database.php
Set-Location backend
& ..\.tools\php\php.exe vendor\phpunit\phpunit\phpunit -c phpunit.mysql.xml
```

Chỉ dùng database **`librivo_test`**; test kiểm tra tên database trước khi migrate. Đã chạy: **3 tests, 21 assertions** đạt, mỗi test sử dụng 2 tiến trình PHP thực tranh chấp row lock. Kiểm tra bản cuối, hạn mức giữa hai sách và trả đồng thời.

Frontend, từ `frontend`:

```powershell
npm test
npm run build
npx playwright test
```

- Vitest/Testing Library: **10 tests** đạt, gồm form validation, API error, fallback bìa và route guards.
- Playwright dùng Chrome đã cài trên Windows, yêu cầu API/Vite đang chạy. **3/3 suite đã chạy đạt trên bản build production bằng Vite preview**: giao diện desktop/mobile/dark mode; các trang quản trị và xuất spreadsheet; luồng nhiều phiên Admin → Reader → Librarian → Reader khác đặt trước → trả → giữ FIFO. Kết quả chi tiết tại [TESTING.md](docs/TESTING.md).
- Ảnh QA tại [docs/screenshots](docs/screenshots). Nếu test lỗi, trace được giữ trong `frontend/test-results` để điều tra; thư mục này được gitignore.
- Laravel Pint và Prettier đã định dạng source. Build TypeScript/Vite thành công.

## Giới hạn hiện tại

- Mail mặc định là **log**: liên kết reset mật khẩu nằm ở `backend/storage/logs/laravel.log`. Chưa cấu hình SMTP, chưa có luồng xác minh email. Nếu cần SMTP, cấu hình `MAIL_*` riêng; không đưa credential vào source.
- Thông báo in-app hoạt động; chưa có tác vụ nhắc hạn tự động qua email. Scheduler hiện xử lý giữ chỗ hết hạn.
- PDF dùng chức năng **In / Save as PDF của trình duyệt**. Chưa có dịch vụ dựng PDF phía server.
- Bản xuất JSON là dữ liệu nghiệp vụ, không phải bản khôi phục toàn hệ thống: không chứa mật khẩu/hash, session, file upload hoặc application key. Cần sao lưu MySQL bằng công cụ quản trị và thư mục storage nếu muốn khôi phục đầy đủ.
- Chưa có cổng thanh toán, WebSocket, quét phần cứng hay phát hành production. Barcode hỗ trợ máy quét nhập như bàn phím vào ô tìm kiếm.
- Dashboard và báo cáo dùng các tổng hợp MySQL tại thời điểm truy vấn; chưa có cập nhật qua WebSocket. Dữ liệu được làm mới khi thao tác hoặc tải lại trang.

## Tài liệu

- [Kiến trúc và ERD](docs/ARCHITECTURE.md)
- [API contracts](docs/API.md)
- [Phân quyền](docs/PERMISSIONS.md)
- [Kiểm thử và phạm vi xác minh](docs/TESTING.md)
- [Checklist triển khai](docs/PROGRESS.md)

Không commit `backend/.env`, `.tools`, `vendor`, `node_modules` và dữ liệu runtime. Khi triển khai production, cần tắt debug, HTTPS, tài khoản MySQL riêng, cookie secure, cấu hình CORS/Sanctum đúng domain và thay toàn bộ tài khoản demo.
#   d o _ a n _ c h u y e n _ n g a n h  
 