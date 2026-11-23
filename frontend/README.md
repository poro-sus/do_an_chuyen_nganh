# LIBRIVO Frontend

React / TypeScript / Vite. Hướng dẫn toàn dự án, tài khoản demo và giới hạn: [README gốc](../README.md).

`npm ci`, `npm run dev` tại thư mục này. Backend phải chạy ở localhost:8000; mở frontend ở **localhost:5173**. Proxy cùng hostname chuyển `/api`, `/sanctum`, `/storage`, `/covers` đến Laravel.

`npm test` chạy Vitest; `npm run build` kiểm tra TypeScript và đóng gói; `npx playwright test` dùng Chrome local và hai server thật. `npm run preview` phục vụ bản build tại cổng 5173 với cùng proxy, sau khi tắt dev server.
