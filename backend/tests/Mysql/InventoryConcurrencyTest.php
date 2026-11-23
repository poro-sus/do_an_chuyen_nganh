<?php

namespace Tests\Mysql;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Fine;
use App\Models\Loan;
use App\Models\Setting;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class InventoryConcurrencyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (config('database.default') !== 'mysql' || config('database.connections.mysql.database') !== 'librivo_test') {
            $this->fail('Concurrency tests only run on the dedicated librivo_test MySQL database.');
        }
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    /** Start both PHP services while the parent holds the contended row lock. */
    private function compete(string $action, Loan $first, Loan $second, User $staff, string $lockType = 'book'): array
    {
        $config = config('database.connections.mysql');
        $env = ['APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql', 'DB_HOST' => (string) $config['host'], 'DB_PORT' => (string) $config['port'], 'DB_DATABASE' => 'librivo_test', 'DB_USERNAME' => (string) $config['username'], 'DB_PASSWORD' => (string) $config['password'], 'DB_URL' => false, 'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array', 'QUEUE_CONNECTION' => 'sync'];
        $workers = [];
        DB::beginTransaction();
        try {
            if ($lockType === 'user') {
                User::whereKey($first->user_id)->lockForUpdate()->firstOrFail();
            } else {
                Book::whereKey($first->book_id)->lockForUpdate()->firstOrFail();
            }
            foreach ([$first, $second] as $loan) {
                $process = new Process([PHP_BINARY, base_path('tests/support/circulation-worker.php'), $action, (string) $loan->id, (string) $staff->id], base_path(), $env);
                $process->setTimeout(25);
                $process->start();
                $workers[] = $process;
            }
            $deadline = microtime(true) + 10;
            do {
                $ready = count(array_filter($workers, fn (Process $p) => str_contains($p->getOutput(), 'READY')));
                if ($ready === 2) {
                    break;
                } usleep(10000);
            } while (microtime(true) < $deadline);
            $this->assertSame(2, $ready, 'Both workers should reach the contested transaction.');
        } finally {
            DB::commit();
        }
        $outputs = [];
        foreach ($workers as $worker) {
            $worker->wait();
            $this->assertSame(0, $worker->getExitCode(), $worker->getErrorOutput());
            $outputs[] = $worker->getOutput();
        }
        $this->assertCount(1, array_filter($outputs, fn (string $s) => str_contains($s, 'SUCCESS')));
        $this->assertCount(1, array_filter($outputs, fn (string $s) => str_contains($s, 'REJECTED')));

        return $outputs;
    }

    public function test_concurrent_staff_cannot_allocate_the_last_copy_twice(): void
    {
        $staff = User::factory()->create();
        $a = User::factory()->create();
        $b = User::factory()->create();
        $book = Book::factory()->create();
        BookCopy::factory()->create(['book_id' => $book->id]);
        $s = app(CirculationService::class);
        $first = $s->request($book->id, $a);
        $second = $s->request($book->id, $b);
        $this->compete('approve', $first, $second, $staff);
        $this->assertSame(1, Loan::where('status', 'approved')->count());
        $this->assertSame(1, BookCopy::where('status', 'held')->count());
    }

    public function test_concurrent_approvals_on_different_books_respect_member_limit(): void
    {
        $staff = User::factory()->create();
        $user = User::factory()->create();
        $s = app(CirculationService::class);
        $loans = [];
        foreach (range(1, 2) as $i) {
            $book = Book::factory()->create();
            BookCopy::factory()->create(['book_id' => $book->id]);
            $loans[] = $s->request($book->id, $user);
        }
        Setting::create(['key' => 'max_books', 'value' => '1']);
        $this->compete('approve', $loans[0], $loans[1], $staff, 'user');
        $this->assertSame(1, Loan::where('status', 'approved')->count());
    }

    public function test_concurrent_returns_create_only_one_fine_and_release_once(): void
    {
        $staff = User::factory()->create();
        $user = User::factory()->create();
        $book = Book::factory()->create();
        BookCopy::factory()->create(['book_id' => $book->id]);
        $s = app(CirculationService::class);
        $loan = $s->handoff($s->approve($s->request($book->id, $user), $staff), $staff);
        $loan->update(['due_at' => now()->subDays(3)]);
        $this->compete('return', $loan, $loan, $staff);
        $this->assertSame(1, Fine::count());
        $this->assertSame('returned',$loan->fresh()->status);
        $this->assertSame('available',$book->copies()->first()->status);
    }
}
