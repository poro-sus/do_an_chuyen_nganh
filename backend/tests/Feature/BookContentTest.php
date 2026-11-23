<?php

namespace Tests\Feature;

use App\Models\Author;
use App\Models\Book;
use App\Models\Category;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\BookContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class BookContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_curated_content_matches_edition_and_preserves_editor_changes(): void
    {
        $book = Book::factory()->create(['isbn' => '9780201616224', 'year' => null]);
        $unrelated = Book::factory()->create();
        $this->seed(BookContentSeeder::class);
        $this->getJson('/api/books/'.$book->id)->assertOk()
            ->assertJsonPath('data.year', 1999)
            ->assertJsonCount(6, 'data.editorial.topics')
            ->assertJsonCount(3, 'data.editorial.introduction');
        $this->assertNull($unrelated->fresh()->editorial);

        $book->refresh()->update(['editorial' => ['headline' => 'Edited by our librarian']]);
        $this->seed(BookContentSeeder::class);
        $this->assertSame('Edited by our librarian', $book->fresh()->editorial['headline']);
    }

    public function test_rating_distribution_includes_reviews_beyond_display_limit(): void
    {
        $book = Book::factory()->create();
        Review::factory()->count(32)->create(['book_id' => $book->id, 'rating' => 5]);
        Review::factory()->count(3)->create(['book_id' => $book->id, 'rating' => 2]);
        $this->getJson('/api/books/'.$book->id)->assertOk()
            ->assertJsonPath('data.reviews_count', 35)
            ->assertJsonCount(30, 'data.reviews')
            ->assertJsonPath('data.review_distribution.0.rating', 5)
            ->assertJsonPath('data.review_distribution.0.count', 32)
            ->assertJsonPath('data.review_distribution.1.count', 3);
    }

    public function test_only_authorized_editor_can_persist_valid_structured_content(): void
    {
        Permission::findOrCreate('books.update', 'web');
        $editor = User::factory()->create();
        $editor->givePermissionTo('books.update');
        $reader = User::factory()->create();
        $book = Book::factory()->create();
        $payload = [
            'title' => $book->title,
            'language' => 'English',
            'author_ids' => [Author::factory()->create()->id],
            'category_ids' => [Category::factory()->create()->id],
            'editorial' => [
                'headline' => 'Read with purpose',
                'topics' => [['title' => 'A practical theme', 'description' => 'A thoughtful introduction.']],
                'sources' => [['title' => 'Publisher', 'url' => 'https://example.com/book']],
            ],
        ];
        $this->actingAs($reader)->putJson('/api/books/'.$book->id, $payload)->assertForbidden();
        $this->actingAs($editor)->putJson('/api/books/'.$book->id, $payload)->assertOk()
            ->assertJsonPath('data.editorial.headline', 'Read with purpose');
        $this->assertSame($payload['editorial'], $book->fresh()->editorial);

        $payload['editorial']['sources'][0]['url'] = 'javascript:alert(1)';
        $this->putJson('/api/books/'.$book->id, $payload)->assertUnprocessable()
            ->assertJsonValidationErrors('editorial.sources.0.url');
        $this->assertSame('https://example.com/book', $book->fresh()->editorial['sources'][0]['url']);
    }
}
