<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        ResetPassword::createUrlUsing(fn (object $user, string $token) => config('app.frontend_url', 'http://localhost:5173').'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));
    }
}
