<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AuthRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(AuthRequest $r): UserResource
    {
        abort_unless($r->hasSession(), 419, 'Vui lòng mở website từ localhost:5173 và khởi tạo cookie CSRF.');
        if (! Auth::guard('web')->attempt($r->only('email', 'password'), $r->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => 'Email hoặc mật khẩu không chính xác.']);
        }
        if (Auth::guard('web')->user()->locked) {
            Auth::guard('web')->logout();
            abort(403, 'Tài khoản đã bị khóa.');
        }
        $r->session()->regenerate();
        Audit::log('auth.login', $r->user()->id);

        return new UserResource($r->user());
    }

    public function register(Request $r): JsonResponse
    {
        abort_unless($r->hasSession(), 419, 'Vui lòng mở website từ localhost:5173 và khởi tạo cookie CSRF.');
        $data = $r->validate(['name' => 'required|string|max:100', 'email' => 'required|email|max:255|unique:users', 'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()]]);
        $user = DB::transaction(function () use ($data) {
            $u = User::create($data + ['member_code' => 'LV-'.strtoupper(Str::random(8))]);
            $u->assignRole('Reader');

            return $u;
        });
        Auth::guard('web')->login($user);
        $r->session()->regenerate();
        Audit::log('auth.register', $user->id);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function me(Request $r): UserResource
    {
        return new UserResource($r->user());
    }

    public function logout(Request $r): JsonResponse
    {
        Auth::guard('web')->logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->json(['message' => 'Đã đăng xuất.']);
    }

    public function profile(Request $r): UserResource
    {
        $data = $r->validate(['name' => 'required|string|max:100', 'phone' => 'nullable|string|max:30', 'avatar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048']);
        if ($r->hasFile('avatar')) {
            $data['avatar'] = '/storage/'.$r->file('avatar')->store('avatars', 'public');
        }
        $r->user()->update($data);

        return new UserResource($r->user());
    }

    public function password(Request $r): JsonResponse
    {
        $data = $r->validate(['current_password' => 'required|current_password', 'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()]]);
        $r->user()->update(['password' => $data['password']]);
        $r->session()->regenerate();
        Audit::log('auth.password_changed', $r->user()->id);

        return response()->json(['message' => 'Đã đổi mật khẩu.']);
    }

    public function forgot(Request $r): JsonResponse
    {
        $r->validate(['email' => 'required|email']);
        Password::sendResetLink($r->only('email'));

        return response()->json(['message' => 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.']);
    }

    public function reset(Request $r): JsonResponse
    {
        $r->validate(['token' => 'required', 'email' => 'required|email', 'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()]]);
        $status = Password::reset($r->only('email', 'password', 'password_confirmation', 'token'), function (User $u, string $password) {
            $u->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'Liên kết không hợp lệ hoặc đã hết hạn.']);
        }

        return response()->json(['message' => 'Đã đặt lại mật khẩu.']);
    }
}
