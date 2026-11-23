<?php

namespace Database\Factories;

use App\Models\Fine;
use App\Models\FinePayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class FinePaymentFactory extends Factory
{
    protected $model = FinePayment::class;

    public function definition(): array
    {
        return ['fine_id' => Fine::factory(), 'handled_by' => User::factory(), 'amount' => 1000, 'type' => 'payment', 'note' => 'Manual receipt'];
    }
}
