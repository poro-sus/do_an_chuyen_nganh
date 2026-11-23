# Phân quyền LIBRIVO

4 nhóm truy cập: Guest không đăng nhập, Reader, Librarian, Super Admin. Chỉ 3 role được lưu trong Spatie; Guest là trạng thái chưa xác thực.

| Permission | Reader | Librarian | Super Admin |
|---|---|---|---|
| books.view | Có | Có | Có |
| dashboard.view | — | Có | Có |
| books.create / books.update | — | Có | Có |
| books.delete | — | — | Có |
| taxonomy.manage | — | Có | Có |
| members.manage | — | Reader | Tất cả |
| loans.approve / loans.return | — | Có | Có |
| fines.collect | — | Có | Có |
| fines.waive | — | — | Có |
| reports.view / reports.export | — | Có | Có |
| reviews.moderate | — | Có | Có |
| users.manage / roles.manage | — | — | Có |
| settings.manage / audit.view | — | — | Có |

Reader dùng các endpoint cá nhân theo ownership, không cần quyền nhân viên: mượn, đặt trước, hủy, yêu cầu gia hạn, favorites, reviews, notifications, hồ sơ và phí của chính mình.

Frontend guard dựa trên permission từ `/me`. Backend dùng Sanctum `auth:sanctum`, middleware account active, middleware Spatie permission, BookPolicy/LoanPolicy và scope user tại truy vấn. Ẩn menu không thay thế việc kiểm tra API.

Các vai trò hệ thống được bảo vệ. Super Admin tạo được role tùy chỉnh, cấp các quyền nghiệp vụ và gán role cho tài khoản. Quyền roles/users/settings/audit/fines.waive không cấp cho role tùy chỉnh qua API. Cập nhật tài khoản khóa role Super Admin trong transaction trước khi đếm tài khoản còn mở để chống hạ quyền đồng thời. Không có endpoint xóa audit hoặc xóa tài chính.

Tài khoản bị khóa được giữ nguyên lịch sử, phiếu đang mượn và dư nợ. Nhân viên vẫn được xác nhận trả sách; tài khoản khóa bị chặn đăng nhập và API cá nhân.
