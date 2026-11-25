<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Khi deploy bằng Docker, bản build của React nằm ở public/index.html và Laravel phục vụ luôn
// (cùng domain với API nên cookie Sanctum/CSRF hoạt động như khi chạy local qua proxy Vite).
// Khi chưa có bản build (chạy local, chạy test) thì giữ nguyên phản hồi JSON cũ.
$spaIndex = fn () => is_file(public_path('index.html')) ? public_path('index.html') : null;

Route::get('/', function () use ($spaIndex) {
    if ($file = $spaIndex()) {
        return response(file_get_contents($file), 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    return response()->json(['name' => 'LIBRIVO', 'service' => 'Laravel REST API', 'frontend' => config('app.frontend_url'), 'status' => 'ready']);
});

// Mọi đường dẫn GET còn lại trả về React để react-router xử lý (/catalog, /books/xyz, /admin...).
// Các tiền tố của API, file upload và file tĩnh vẫn trả 404 thật, không trả HTML.
Route::fallback(function (Request $request) use ($spaIndex) {
    $file = $spaIndex();
    abort_if(! $file || $request->is('api/*', 'sanctum/*', 'storage/*', 'covers/*', 'assets/*', 'up'), 404);

    return response(file_get_contents($file), 200, ['Content-Type' => 'text/html; charset=utf-8']);
});
