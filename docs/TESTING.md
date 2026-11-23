# Kiểm thử LIBRIVO

Ngày xác minh: 16/11/2026, Windows, PHP 8.4.27, Laravel 13.42.0, MySQL 8.0.44, Node.js 24.13.0, Chrome headless.

| Kiểm tra | Kết quả đã chạy |
|---|---|
| PHPUnit mặc định | 27/27 tests, 103 assertions |
| MySQL cạnh tranh 2 tiến trình | 3/3 tests, 21 assertions |
| Vitest / Testing Library | 10/10 tests |
| Vite + TypeScript build | Thành công |
| Playwright visual suite | Đạt desktop 1440px, mobile 390px, dark mode, search, book detail, cookie login, admin drawer |
| Playwright admin-pages suite | Đạt các trang quản trị/độc giả, CSV/XLSX có nội dung thực, kiểm tra overflow ở 360px |
| Playwright workflow suite | Đạt Admin tạo sách/copy → Reader yêu cầu → Librarian duyệt/bàn giao → Reader khác đặt trước → trả → FIFO ready |
| Pint / Prettier | Đã định dạng source |

Suite backend mặc định dùng SQLite memory và test các quy tắc nghiệp vụ qua API/service. Test MySQL dùng schema riêng `librivo_test`; hai worker PHP đều chờ row lock do tiến trình cha giữ, sau đó tranh chấp thực khi khóa được thả. Không suy luận rằng kiểm thử tuần tự là kiểm thử đồng thời.

Playwright dùng API/Vite thật, không mock API. Các tài khoản dùng cookie riêng trong từng BrowserContext. APIRequestContext trong test phải gửi Origin/Referer và CSRF token giống SPA. Test tạo sách có tiền tố `Hành trình LIBRIVO E2E` kèm timestamp, rồi lưu trữ bằng API; lịch sử được giữ lại. Lệnh `library:archive-e2e` chỉ chạy trong APP_ENV=local để hủy/kết thúc các phiếu thử còn lại và lưu trữ các đầu sách đúng mẫu tên này.

Lần chạy toàn bộ cuối: **3/3 Playwright suites đạt trên bản build production**, qua `vite preview` ở localhost:5173 với proxy Laravel thực; thời gian 1,8 phút. Không có pageerror hoặc API 5xx trong các kịch bản này.

Ảnh screenshot được chụp sau khi dữ liệu tải, counters hoàn tất và các khu vực scroll đã xuất hiện. Các lần QA đã phát hiện và sửa: auth guard mặc định sau logout/register, HTTP 201 cho resource mới, trạng thái ảnh khi chưa tải, kích thước container chịu ảnh hưởng của rem, pagination thống nhất, và API unauthenticated không được phụ thuộc route login của Blade.

Giới hạn kiểm thử: chưa kiểm thử tải lớn, mọi tổ hợp browser/viewport, gửi SMTP thật, khôi phục backup, công cụ quét vật lý và triển khai production. Không có tuyên bố các phần này đã chạy đạt.

Windows setup đã chạy thực tế trên project hiện có: Composer install, npm ci, migrations, seed bảo toàn dữ liệu, storage link có sẵn và frontend build đều thành công. Đã thử start lặp không thêm tiến trình, stop toàn bộ cây tiến trình được ghi nhận, rồi start lại; cả localhost:5173 và localhost:8000/up trả HTTP 200, scheduler chạy nền không báo lỗi. Launcher kiểm tra chủ sở hữu cổng và chỉ dừng các tiến trình do project ghi nhận.
