# LIBRIVO — Tiến độ triển khai

- [x] Đọc đặc tả, chọn kiến trúc Laravel API + React SPA + MySQL.
- [x] Chuẩn bị PHP 8.4 portable, Composer, dependencies theo lockfile.
- [x] Migrations, models, permissions, seed 100 đầu sách / 300 bản sao / 35 độc giả.
- [x] Auth cookie Sanctum, hồ sơ/avatar, khôi phục và đổi mật khẩu.
- [x] Catalog, CRUD, metadata có cache, bản sao, taxonomy, CSV/XLSX import/export.
- [x] Transaction mượn, cấp phát, bàn giao, trả, phạt, gia hạn, FIFO và scheduler.
- [x] Dashboard, thành viên, phân quyền, cấu hình/logo, audit và xuất JSON.
- [x] Homepage, catalog, chi tiết, đăng nhập, khu vực độc giả và chính sách.
- [x] Giao diện quản trị, animation, dark mode, responsive 360px trở lên.
- [x] 27 PHPUnit tests, 3 MySQL concurrency tests, 10 frontend tests; E2E và build thực.
- [x] README, ERD, API, phân quyền, setup.bat, start.bat, stop.bat.

Nguồn dữ liệu nghiệp vụ duy nhất: MySQL. localStorage chỉ lưu giao diện sáng/tối.

Giới hạn được ghi rõ trong README: SMTP/xác minh email chưa cấu hình; thông báo hiện là in-app, chưa nhắc hạn email tự động; PDF qua trình duyệt; JSON là xuất dữ liệu nghiệp vụ, không phải bản khôi phục toàn hệ thống; chưa triển khai production hoặc kiểm thử tải lớn.
