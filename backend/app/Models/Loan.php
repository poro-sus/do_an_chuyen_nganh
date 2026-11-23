<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Loan extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['borrowed_at' => 'datetime', 'due_at' => 'datetime', 'returned_at' => 'datetime', 'approved_at' => 'datetime'];
    }

    protected $appends = ['overdue'];

    public function getOverdueAttribute(): bool
    {
        return $this->status === 'active' && $this->due_at?->isPast();
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class)->withTrashed();
    }

    public function copy(): BelongsTo
    {
        return $this->belongsTo(BookCopy::class, 'book_copy_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function renewals(): HasMany
    {
        return $this->hasMany(LoanRenewal::class);
    }

    public function fines(): HasMany
    {
        return $this->hasMany(Fine::class);
    }
}
