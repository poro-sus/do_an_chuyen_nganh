<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Loan;
use App\Models\User;
use App\Support\SqlDate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Các truy vấn từng phụ thuộc MySQL (DATE_FORMAT, LIKE phân biệt hoa thường) phải chạy được
 * trên MySQL, PostgreSQL (Render) và SQLite (test mặc định). Chạy với DB_CONNECTION=pgsql để kiểm Postgres.
 */
class DatabaseDialectTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $reader;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::findOrCreate('dashboard.view', 'web');
        Permission::findOrCreate('books.view', 'web');
        Role::findOrCreate('Super Admin', 'web')->syncPermissions(['dashboard.view', 'books.view']);
        Role::findOrCreate('Reader', 'web')->syncPermissions(['books.view']);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');
        $this->reader = User::factory()->create();
        $this->reader->assignRole('Reader');
    }

    public function test_dashboard_works_for_every_period(): void
    {
        $book = Book::factory()->create();
        Loan::create(['book_id' => $book->id, 'user_id' => $this->reader->id, 'status' => 'returned', 'borrowed_at' => now()->subDays(2), 'due_at' => now()->addDays(12), 'returned_at' => now()->subDay()]);
        Sanctum::actingAs($this->admin);

        foreach ([7, 30, 90, 365] as $period) {
            $response = $this->getJson('/api/dashboard?period='.$period)->assertOk();
            $chart = collect($response->json('data.chart'));
            $this->assertSame(1, (int) $chart->sum('borrowed'), "Kỳ $period ngày phải đếm đúng 1 lượt mượn");
            $this->assertSame(1, (int) $chart->sum('returned'), "Kỳ $period ngày phải đếm đúng 1 lượt trả");
            $this->assertNotEmpty($response->json('data.member_trend'));
        }
    }

    public function test_reader_summary_groups_history_by_month(): void
    {
        $book = Book::factory()->create();
        Loan::create(['book_id' => $book->id, 'user_id' => $this->reader->id, 'status' => 'returned', 'borrowed_at' => now()->subDays(3), 'due_at' => now()->addDays(11), 'returned_at' => now()]);
        Sanctum::actingAs($this->reader);

        $history = $this->getJson('/api/me/summary')->assertOk()->json('data.history');
        $this->assertSame(now()->format('Y-m'), $history[0]['month']);
        $this->assertSame(1, (int) $history[0]['count']);
    }

    public function test_catalog_search_ignores_letter_case(): void
    {
        Book::factory()->create(['title' => 'Clean Code Handbook']);
        Book::factory()->create(['title' => 'Atomic Habits']);

        foreach (['clean code', 'CLEAN CODE', 'Clean'] as $term) {
            $titles = collect($this->getJson('/api/books?search='.urlencode($term))->assertOk()->json('data'))->pluck('title');
            $this->assertTrue($titles->contains('Clean Code Handbook'), "Tìm '$term' phải ra 'Clean Code Handbook'");
            $this->assertFalse($titles->contains('Atomic Habits'));
        }
    }

    public function test_sql_date_label_uses_the_active_driver_syntax(): void
    {
        $sql = SqlDate::label('created_at', true);
        $driver = DB::connection()->getDriverName();
        $expected = ['pgsql' => 'to_char(', 'sqlite' => 'strftime(', 'mysql' => 'DATE_FORMAT(', 'mariadb' => 'DATE_FORMAT('][$driver] ?? 'DATE_FORMAT(';
        $this->assertStringStartsWith($expected, $sql);
    }
}
