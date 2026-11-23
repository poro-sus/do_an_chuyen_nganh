<?php

namespace Database\Seeders;

use App\Models\Book;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BookContentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $entries = json_decode(file_get_contents(database_path('fixtures/book-content.json')), true, 512, JSON_THROW_ON_ERROR);
        DB::transaction(function () use ($entries): void {
            foreach ($entries as $entry) {
                $query = Book::whereNull('editorial');
                if (! empty($entry['isbn'])) {
                    $query->where('isbn', $entry['isbn']);
                } else {
                    $query->where('title', $entry['title']);
                }
                $book = $query->first();
                if (! $book) {
                    continue;
                }
                $book->editorial = $entry['editorial'];
                if (! empty($entry['summary'])) {
                    $book->summary = $entry['summary'];
                }
                if (! $book->year && isset($entry['year'])) {
                    $book->year = $entry['year'];
                }
                $book->save();
            }
        });
    }
}
