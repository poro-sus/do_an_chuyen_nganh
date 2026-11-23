<?php

namespace Database\Factories;

use App\Models\BookCopy;
use App\Models\Loan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LoanFactory extends Factory
{
    protected $model = Loan::class;

    public function definition(): array
    {
        return ['book_copy_id' => BookCopy::factory(), 'book_id' => fn (array $a) => BookCopy::findOrFail($a['book_copy_id'])->book_id, 'user_id' => User::factory(), 'status' => 'requested'];
    }
}
