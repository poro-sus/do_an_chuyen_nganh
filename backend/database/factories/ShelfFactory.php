<?php

namespace Database\Factories;

use App\Models\Shelf;
use Illuminate\Database\Eloquent\Factories\Factory;

class ShelfFactory extends Factory
{
    protected $model = Shelf::class;

    public function definition(): array
    {
        return ['name' => fake()->unique()->bothify('Shelf-####'), 'location' => 'Floor 1'];
    }
}
