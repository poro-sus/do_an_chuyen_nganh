<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Category;
use App\Models\Fine;
use App\Models\Loan;
use App\Models\Setting;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminController extends Controller
{
    public function publicStats(): JsonResponse
    {
        return response()->json(['data' => ['books' => Book::where('visible', true)->count(), 'copies' => BookCopy::whereHas('book', fn ($q) => $q->where('visible', true)->whereNull('books.deleted_at'))->count(), 'members' => User::role('Reader')->count(), 'categories' => Category::count(), 'loans' => Loan::whereIn('status', ['active', 'returned'])->count()]]);
    }

    public function publicSettings(): JsonResponse
    {
        return response()->json(['data' => Setting::whereIn('key', ['library_name', 'logo', 'contact_email', 'contact_phone', 'address', 'opening_hours', 'about', 'policy', 'loan_days', 'max_books', 'fine_per_day', 'hold_hours'])->pluck('value', 'key')]);
    }

    public function dashboard(Request $r): JsonResponse
    {
        $r->validate(['period' => 'sometimes|in:7,30,90,365']);
        $days = $r->integer('period', 30);
        $start = $days === 365 ? now()->subMonths(11)->startOfMonth() : now()->subDays($days - 1)->startOfDay();
        $monthly = $days === 365;
        $fmt = $monthly ? '%Y-%m' : '%Y-%m-%d';
        $borrowed = Loan::where('borrowed_at', '>=', $start)->selectRaw("DATE_FORMAT(borrowed_at, '$fmt') as label,COUNT(*) as count")->groupBy('label')->pluck('count', 'label');
        $returned = Loan::where('returned_at', '>=', $start)->selectRaw("DATE_FORMAT(returned_at, '$fmt') as label,COUNT(*) as count")->groupBy('label')->pluck('count', 'label');
        $chart = [];
        $cursor = $monthly ? $start->copy()->startOfMonth() : $start->copy();
        while ($cursor <= now()) {
            $key = $cursor->format($monthly ? 'Y-m' : 'Y-m-d');
            $chart[] = ['label' => $key, 'borrowed' => (int) ($borrowed[$key] ?? 0), 'returned' => (int) ($returned[$key] ?? 0)];
            $monthly ? $cursor->addMonth() : $cursor->addDay();
        }
        $top = Book::with('authors')->withCount(['loans' => fn ($q) => $q->where('borrowed_at', '>=', $start)])->orderByDesc('loans_count')->limit(10)->get();
        $cats = Category::withCount('books')->orderByDesc('books_count')->get();

        return response()->json(['data' => [
            'kpis' => ['books' => Book::count(), 'copies' => BookCopy::count(), 'available' => BookCopy::where('status', 'available')->count(), 'active' => Loan::where('status', 'active')->count(), 'overdue' => Loan::where('status', 'active')->where('due_at', '<', now())->count(), 'members' => User::role('Reader')->count(), 'monthly_loans' => Loan::where('borrowed_at', '>=', now()->startOfMonth())->count(), 'unpaid' => (int) Fine::selectRaw('COALESCE(SUM(amount-paid_amount-waived_amount),0) as total')->value('total'), 'requests' => Loan::where('status', 'requested')->count(), 'new_members' => User::role('Reader')->where('created_at', '>=', $start)->count()],
            'chart' => $chart, 'top_books' => $top, 'categories' => $cats, 'copy_status' => BookCopy::selectRaw('status,COUNT(*) as count')->groupBy('status')->get(),
            'pending' => Loan::with(['book:id,title,cover', 'user:id,name,member_code'])->where('status', 'requested')->latest()->limit(5)->get(),
            'due_soon' => Loan::with(['book:id,title', 'user:id,name'])->where('status', 'active')->whereBetween('due_at', [now(), now()->addDays(3)])->orderBy('due_at')->limit(5)->get(),
            'overdue_loans' => Loan::with(['book:id,title', 'user:id,name'])->where('status', 'active')->where('due_at', '<', now())->orderBy('due_at')->limit(5)->get(),
            'activity' => AuditLog::with('user:id,name')->latest()->limit(7)->get(),
            'fine_trend' => Fine::where('created_at', '>=', $start)->selectRaw("DATE_FORMAT(created_at, '$fmt') as label,SUM(amount) as amount")->groupBy('label')->orderBy('label')->get(),
            'member_trend' => User::role('Reader')->where('created_at', '>=', $start)->selectRaw("DATE_FORMAT(created_at, '$fmt') as label,COUNT(*) as count")->groupBy('label')->orderBy('label')->get(),
        ]]);
    }

    public function members(Request $r): AnonymousResourceCollection
    {
        $q = User::with(['roles.permissions', 'permissions'])->withCount(['loans', 'loans as active_count' => fn ($q) => $q->where('status', 'active'), 'loans as overdue_count' => fn ($q) => $q->where('status', 'active')->where('due_at', '<', now())]);
        if (! $r->user()->can('users.manage')) {
            $q->role('Reader');
        }
        if ($r->filled('search')) {
            $s = '%'.$r->input('search').'%';
            $q->where(fn ($q) => $q->where('name', 'like', $s)->orWhere('email', 'like', $s)->orWhere('member_code', 'like', $s));
        }
        if ($r->filled('locked')) {
            $q->where('locked', $r->boolean('locked'));
        }

        return UserResource::collection($q->latest()->paginate(20));
    }

    public function member(Request $r, User $user): JsonResponse
    {
        abort_unless($r->user()->can('users.manage') || $user->hasRole('Reader'), 403);

        return response()->json(['data' => ['user' => new UserResource($user), 'loans' => $user->loans()->with(['book', 'copy'])->latest()->limit(100)->get(), 'fines' => $user->fines()->with('payments')->get()]]);
    }

    public function createMember(Request $r): UserResource
    {
        $d = $r->validate(['name' => 'required|string|max:100', 'email' => 'required|email|unique:users', 'phone' => 'nullable|string|max:30', 'password' => 'required|string|min:8|max:128', 'role' => 'sometimes|string|exists:roles,name']);
        $role = $d['role'] ?? 'Reader';
        abort_unless($role === 'Reader' || $r->user()->can('users.manage'), 403);
        $user = DB::transaction(function () use ($d, $role) {
            $user = User::create(collect($d)->except('role')->all() + ['member_code' => 'LV-'.strtoupper(Str::random(8))]);
            $user->assignRole($role);
            Audit::log('members.create', $user->id);

            return $user;
        });

        return new UserResource($user);
    }

    public function updateMember(Request $r, User $user): UserResource
    {
        $d = $r->validate(['name' => 'required|string|max:100', 'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)], 'phone' => 'nullable|string|max:30', 'locked' => 'required|boolean', 'role' => 'sometimes|string|exists:roles,name']);
        DB::transaction(function () use ($d, $user, $r) {
            Role::where('name', 'Super Admin')->lockForUpdate()->firstOrFail();
            $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            abort_unless($r->user()->can('users.manage') || $user->hasRole('Reader'), 403);
            if (isset($d['role']) && $d['role'] !== $user->getRoleNames()->first()) {
                abort_unless($r->user()->can('roles.manage'), 403);
            }
            $demoting = isset($d['role']) && $d['role'] !== 'Super Admin';
            if ($user->hasRole('Super Admin') && ($d['locked'] || $demoting)) {
                abort_if(User::role('Super Admin')->where('locked', false)->where('id', '!=', $user->id)->count() === 0, 422, 'Không thể khóa hoặc hạ quyền Super Admin cuối cùng.');
            }
            abort_if($user->id === $r->user()->id && $d['locked'], 422, 'Không thể tự khóa tài khoản đang sử dụng.');
            $user->update(collect($d)->except('role')->all());
            if (isset($d['role'])) {
                $user->syncRoles([$d['role']]);
            } Audit::log('members.update', $user->id, collect($d)->except('email')->all());
        });

        return new UserResource($user->fresh());
    }

    public function roles(): JsonResponse
    {
        return response()->json(['data' => Role::with('permissions')->get(), 'permissions' => Permission::orderBy('name')->pluck('name')]);
    }

    public function storeRole(Request $r): JsonResponse
    {
        $d = $r->validate(['name' => 'required|string|max:60|unique:roles', 'permissions' => 'required|array', 'permissions.*' => 'exists:permissions,name']);
        $this->checkRolePermissions($d['permissions']);
        $role = DB::transaction(function () use ($d) {
            $role = Role::create(['name' => $d['name'], 'guard_name' => 'web']);
            $role->syncPermissions($d['permissions']);
            Audit::log('roles.create', $role->id);

            return $role;
        });

        return response()->json(['data' => $role->load('permissions')], 201);
    }

    private function checkRolePermissions(array $permissions): void
    {
        abort_if(count(array_intersect($permissions, ['roles.manage', 'users.manage', 'settings.manage', 'audit.view', 'fines.waive'])) > 0, 422, 'Quyền hệ thống nhạy cảm chỉ dành cho Super Admin.');
    }

    public function updateRole(Request $r, Role $role): JsonResponse
    {
        abort_if(in_array($role->name, ['Super Admin', 'Librarian', 'Reader']), 422, 'Vai trò hệ thống được bảo vệ. Hãy tạo vai trò tùy chỉnh.');
        $d = $r->validate(['permissions' => 'required|array', 'permissions.*' => 'exists:permissions,name']);
        $this->checkRolePermissions($d['permissions']);
        $role->syncPermissions($d['permissions']);
        Audit::log('roles.update', $role->id);

        return response()->json(['data' => $role->load('permissions')]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => Setting::pluck('value', 'key')]);
    }

    public function updateSettings(Request $r): JsonResponse
    {
        $d = $r->validate(['library_name' => 'required|string|max:100', 'logo' => ['nullable', 'string', 'max:500', 'regex:~^/storage/[A-Za-z0-9_./-]+$~'], 'contact_email' => 'nullable|email|max:255', 'contact_phone' => 'nullable|string|max:30', 'address' => 'nullable|string|max:1000', 'opening_hours' => 'nullable|string|max:500', 'about' => 'nullable|string|max:10000', 'policy' => 'nullable|string|max:10000', 'loan_days' => 'required|integer|between:1,90', 'max_books' => 'required|integer|between:1,30', 'max_renewals' => 'required|integer|between:0,10', 'fine_per_day' => 'required|integer|between:0,1000000', 'grace_days' => 'required|integer|between:0,30', 'fine_cap' => 'required|integer|between:0,1000000000', 'hold_hours' => 'required|integer|between:1,720']);
        DB::transaction(function () use ($d) {
            foreach ($d as $k => $v) {
                Setting::updateOrCreate(['key' => $k], ['value' => (string) $v]);
            } Audit::log('settings.update', null, $d);
        });

        return $this->settings();
    }

    public function auditLogs(Request $r): JsonResponse
    {
        $q = AuditLog::with('user:id,name');
        if ($r->filled('search')) {
            $q->where('action', 'like', '%'.$r->input('search').'%');
        }

        return JsonResource::collection($q->latest()->paginate(30))->response();
    }
}
