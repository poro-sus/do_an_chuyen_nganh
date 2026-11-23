<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinePayment extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function fine(): BelongsTo
    {
        return $this->belongsTo(Fine::class);
    }
}
