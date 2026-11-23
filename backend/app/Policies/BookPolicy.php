<?php

namespace App\Policies;

use App\Models\Book;
use App\Models\User;

class BookPolicy
{
    public function view(?User $user, Book $book): bool
    {
        return $book->visible || ($user?->can('books.update') ?? false);
    }

    public function create(User $user): bool
    {
        return $user->can('books.create');
    }

    public function update(User $user, Book $book): bool
    {
        return $user->can('books.update');
    }

    public function delete(User $user, Book $book): bool
    {
        return $user->can('books.delete');
    }
}
