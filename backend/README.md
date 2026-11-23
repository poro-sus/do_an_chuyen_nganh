# LIBRIVO API

Laravel 13 / Sanctum / Spatie Permission / MySQL. Xem [README toàn dự án](../README.md), [API](../docs/API.md), [phân quyền](../docs/PERMISSIONS.md), [ERD](../docs/ARCHITECTURE.md).

Dùng PHP portable tại `../.tools/php/php.exe`. Trong thư mục backend:

```powershell
& ..\.tools\php\php.exe artisan serve --host=localhost --port=8000
& ..\.tools\php\php.exe artisan test --compact
```

`phpunit.xml` dùng SQLite memory để cô lập tests. `phpunit.mysql.xml` chỉ dùng `librivo_test` cho cạnh tranh nhiều tiến trình. Không chạy migrate:fresh trên dữ liệu thư viện đang dùng.

Scheduler: `artisan schedule:work`; tác vụ `library:expire-holds` mỗi phút. Mail mặc định ghi log. `.env` chứa cấu hình local và được gitignore.
