<?php

use App\Http\Middleware\EnsureAccountActive;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        // Render (và hầu hết PaaS) kết thúc HTTPS ở load balancer rồi chuyển tiếp HTTP vào container.
        // Tin X-Forwarded-* để Laravel biết request gốc là https (cookie secure, URL tuyệt đối).
        $middleware->trustProxies(at: '*');
        $middleware->statefulApi();
        $middleware->redirectGuestsTo(fn (Request $request) => config('app.frontend_url').'/login');
        $middleware->alias(['permission' => PermissionMiddleware::class, 'active' => EnsureAccountActive::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $r) => $r->is('api/*') || $r->expectsJson());
    })->create();
