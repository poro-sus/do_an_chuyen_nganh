<?php

namespace Database\Factories;

use App\Models\Loan;
use App\Models\LoanRenewal;
use Illuminate\Database\Eloquent\Factories\Factory;

class LoanRenewalFactory extends Factory
{
    protected $model = LoanRenewal::class;

    public function definition(): array
    {
        return ['loan_id' => Loan::factory(), 'previous_due_at' => now()->addDays(14)];
    }
}
