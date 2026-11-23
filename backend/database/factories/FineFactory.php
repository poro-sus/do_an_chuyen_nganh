<?php

namespace Database\Factories;

use App\Models\Fine;
use App\Models\Loan;
use Illuminate\Database\Eloquent\Factories\Factory;

class FineFactory extends Factory
{
    protected $model = Fine::class;

    public function definition(): array
    {
        return ['loan_id' => Loan::factory(), 'user_id' => fn (array $a) => Loan::findOrFail($a['loan_id'])->user_id, 'type' => 'overdue', 'amount' => 3000];
    }
}
