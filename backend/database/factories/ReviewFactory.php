<?php

namespace Database\Factories;

use App\Models\Book;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewFactory extends Factory
{
    protected $model = Review::class;

    public function definition(): array
    {
        return ['book_id' => Book::factory(), 'user_id' => User::factory(), 'rating' => 4, 'comment' => fake()->sentence()];
    }
}
