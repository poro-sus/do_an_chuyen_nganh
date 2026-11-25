<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Biểu thức SQL gom nhóm theo tháng/ngày, chạy được trên MySQL (local), PostgreSQL (Render) và SQLite (test).
 * $column luôn là tên cột cố định do code truyền vào, không bao giờ lấy từ người dùng.
 */
final class SqlDate
{
    /** Nhãn 'YYYY-MM' (theo tháng) hoặc 'YYYY-MM-DD' (theo ngày) của một cột thời gian. */
    public static function label(string $column, bool $monthly): string
    {
        return match (DB::connection()->getDriverName()) {
            'pgsql' => "to_char({$column}, '".($monthly ? 'YYYY-MM' : 'YYYY-MM-DD')."')",
            'sqlite' => "strftime('".($monthly ? '%Y-%m' : '%Y-%m-%d')."', {$column})",
            default => "DATE_FORMAT({$column}, '".($monthly ? '%Y-%m' : '%Y-%m-%d')."')",
        };
    }
}
