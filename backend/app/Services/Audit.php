<?php

namespace App\Services;

use App\Models\AuditLog;

class Audit
{
    public static function log(string $action, mixed $subject = null, array $data = []): void
    {
        AuditLog::create(['user_id' => auth()->id(), 'action' => $action, 'subject' => $subject === null ? null : (string) $subject, 'data' => $data, 'ip' => request()?->ip()]);
    }
}
