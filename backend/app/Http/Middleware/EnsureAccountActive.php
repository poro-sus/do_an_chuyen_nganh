<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->user()?->locked, 403, 'Tài khoản đã bị khóa. Vui lòng liên hệ thư viện.');

        return $next($request);
    }
}
