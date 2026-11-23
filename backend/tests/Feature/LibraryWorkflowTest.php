<?php

namespace Tests\Feature;

use App\Models\Author;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Category;
use App\Models\Fine;
use App\Models\Loan;
use App\Models\Setting;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LibraryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $staff;

    private User $reader;

    private User $other;

    private CirculationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $permissions = ['books.view', 'books.create', 'books.update', 'books.delete', 'loans.approve', 'loans.return', 'members.manage', 'users.manage', 'roles.manage', 'settings.manage', 'fines.collect', 'fines.waive', 'taxonomy.manage', 'dashboard.view', 'reports.view', 'reports.export'];
        foreach ($permissions as $p) {
            Permission::findOrCreate($p, 'web');
        }
        Role::findOrCreate('Super Admin', 'web')->syncPermissions($permissions);
        Role::findOrCreate('Librarian', 'web')->syncPermissions(['books.create', 'books.update', 'loans.approve', 'loans.return', 'fines.collect', 'taxonomy.manage', 'members.manage']);
        Role::findOrCreate('Reader', 'web')->syncPermissions(['books.view']);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Super Admin');
        $this->staff = User::factory()->create();
        $this->staff->assignRole('Librarian');
        $this->reader = User::factory()->create();
        $this->reader->assignRole('Reader');
        $this->other = User::factory()->create();
        $this->other->assignRole('Reader');
        $this->service = app(CirculationService::class);
    }

    private function book(int $copies = 1): Book
    {
        $b = Book::factory()->create();
        $b->authors()->attach(Author::factory()->create());
        $b->categories()->attach(Category::factory()->create());
        BookCopy::factory()->count($copies)->create(['book_id' => $b->id]);

        return $b;
    }

    private function active(Book $b, ?User $user = null): Loan
    {
        $l = $this->service->request($b->id, $user ?? $this->reader);
        $l = $this->service->approve($l, $this->staff);

        return $this->service->handoff($l, $this->staff);
    }

    public function test_login_registration_and_logout(): void
    {
        $headers = ['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/'];
        $this->withHeaders($headers)->postJson('/api/auth/login', ['email' => $this->reader->email, 'password' => 'password'])->assertOk()->assertJsonPath('data.roles.0', 'Reader');
        $this->getJson('/api/me')->assertOk();
        $this->postJson('/api/auth/logout')->assertOk();
        $this->postJson('/api/auth/register', ['name' => 'New Reader', 'email' => 'new@librivo.local', 'password' => 'Example123', 'password_confirmation' => 'Example123', 'role' => 'Super Admin'])->assertCreated()->assertJsonPath('data.roles.0', 'Reader');
    }

    public function test_guest_and_reader_are_denied_admin_apis(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $this->actingAs($this->reader)->getJson('/api/dashboard')->assertForbidden();
        $this->postJson('/api/books', ['title' => 'Denied'])->assertForbidden();
        $this->getJson('/api/members')->assertForbidden();
        $this->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_book_create_update_duplicate_isbn_and_copies(): void
    {
        $a = Author::factory()->create();
        $c = Category::factory()->create();
        $payload = ['title' => 'A library book', 'isbn' => '9780132350884', 'language' => 'Tiếng Anh', 'author_ids' => [$a->id], 'category_ids' => [$c->id]];
        $id = $this->actingAs($this->admin)->postJson('/api/books', $payload)->assertCreated()->json('data.id');
        $this->postJson('/api/books', $payload)->assertUnprocessable();
        $payload['title'] = 'Edited';
        $this->putJson('/api/books/'.$id, $payload)->assertOk()->assertJsonPath('data.title', 'Edited');
        $this->postJson('/api/books/'.$id.'/copies', ['count' => 3])->assertCreated();
        $this->getJson('/api/books/'.$id)->assertJsonPath('data.available_count', 3);
    }

    public function test_full_borrow_approve_handoff_return_workflow(): void
    {
        $b = $this->book();
        $id = $this->actingAs($this->reader)->postJson('/api/loan-requests', ['book_id' => $b->id])->assertCreated()->json('data.id');
        $this->actingAs($this->staff)->postJson('/api/loans/'.$id.'/approve')->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertDatabaseHas('book_copies', ['book_id' => $b->id, 'status' => 'held']);
        $this->postJson('/api/loans/'.$id.'/handoff')->assertOk()->assertJsonPath('data.status', 'active');
        $this->actingAs($this->reader)->getJson('/api/loans')->assertJsonPath('data.0.id', $id);
        $this->actingAs($this->staff)->postJson('/api/loans/'.$id.'/return', ['condition' => 'good'])->assertOk();
        $this->assertDatabaseHas('book_copies', ['book_id' => $b->id, 'status' => 'available']);
        $this->getJson('/api/books/'.$b->id)->assertJsonPath('data.available_count', 1);
    }

    public function test_reader_cannot_act_on_another_readers_loan(): void
    {
        $loan = $this->active($this->book());
        $this->actingAs($this->other)->postJson('/api/loans/'.$loan->id.'/renew')->assertForbidden();
        $this->postJson('/api/loans/'.$loan->id.'/cancel')->assertForbidden();
        $this->postJson('/api/loans/'.$loan->id.'/return')->assertForbidden();
        $this->getJson('/api/loans')->assertJsonCount(0, 'data');
    }

    public function test_two_approvals_cannot_allocate_last_copy_twice(): void
    {
        $b = $this->book();
        $a = $this->service->request($b->id, $this->reader);
        $c = $this->service->request($b->id, $this->other);
        $this->service->approve($a, $this->staff);
        $this->actingAs($this->staff)->postJson('/api/loans/'.$c->id.'/approve')->assertUnprocessable();
        $this->postJson('/api/loans/'.$a->id.'/approve')->assertUnprocessable();
        $this->assertEquals(1, Loan::where('status', 'approved')->count());
    }

    public function test_return_is_not_repeatable_and_fine_is_integer_with_cap_and_grace(): void
    {
        $this->travelTo(now()->startOfDay()->addHours(12));
        Setting::create(['key' => 'grace_days', 'value' => '1']);
        Setting::create(['key' => 'fine_cap', 'value' => '10000']);
        $l = $this->active($this->book());
        $l->update(['due_at' => now()->subDays(6)]);
        $this->actingAs($this->staff)->postJson('/api/loans/'.$l->id.'/return')->assertOk();
        $this->assertDatabaseHas('fines', ['loan_id' => $l->id, 'amount' => 10000]);
        $this->postJson('/api/loans/'.$l->id.'/return')->assertUnprocessable();
        $this->assertEquals(1, Fine::count());
    }

    public function test_fifo_reservation_holds_copy_for_only_first_reader(): void
    {
        $b = $this->book();
        $l = $this->active($b);
        $first = $this->service->reserve($b->id, $this->other);
        $third = User::factory()->create();
        $third->assignRole('Reader');
        $second = $this->service->reserve($b->id, $third);
        $this->service->returnBook($l, $this->staff);
        $this->assertSame('ready', $first->fresh()->status);
        $this->assertSame('waiting', $second->fresh()->status);
        $this->assertSame('held', $b->copies()->first()->status);
        $request = $this->service->request($b->id, $this->other);
        $this->service->approve($request, $this->staff);
        $this->assertSame('fulfilled', $first->fresh()->status);
    }

    public function test_duplicate_reservation_rejected_and_expiry_advances_queue(): void
    {
        $b = $this->book();
        $l = $this->active($b);
        $a = $this->service->reserve($b->id, $this->other);
        $this->actingAs($this->other)->postJson('/api/reservations', ['book_id' => $b->id])->assertUnprocessable();
        $u = User::factory()->create();
        $u->assignRole('Reader');
        $c = $this->service->reserve($b->id, $u);
        $this->service->returnBook($l, $this->staff);
        $a->refresh()->update(['expires_at' => now()->subMinute()]);
        $this->artisan('library:expire-holds')->assertSuccessful();
        $this->assertSame('expired', $a->fresh()->status);
        $this->assertSame('ready', $c->fresh()->status);
    }

    public function test_renewal_requires_approval_and_records_previous_and_new_dates(): void
    {
        $l = $this->active($this->book());
        $old = $l->due_at->toIso8601String();
        $renewal = $this->service->requestRenewal($l);
        $this->assertEquals($old, $l->fresh()->due_at->toIso8601String());
        $this->actingAs($this->staff)->putJson('/api/loan-renewals/'.$renewal->id, ['approve' => true])->assertOk();
        $this->assertEquals(1, $l->fresh()->renewal_count);
        $this->assertNotNull($renewal->fresh()->new_due_at);
        $this->putJson('/api/loan-renewals/'.$renewal->id, ['approve' => true])->assertUnprocessable();
    }

    public function test_renewal_refused_when_someone_is_waiting(): void
    {
        $b = $this->book();
        $l = $this->active($b);
        $this->service->reserve($b->id, $this->other);
        $this->actingAs($this->reader)->postJson('/api/loans/'.$l->id.'/renew')->assertUnprocessable();
    }

    public function test_cannot_delete_book_or_modify_copy_with_active_loan(): void
    {
        $b = $this->book();
        $l = $this->active($b);
        $this->actingAs($this->admin)->deleteJson('/api/books/'.$b->id)->assertUnprocessable();
        $this->putJson('/api/book-copies/'.$l->book_copy_id, ['status' => 'available', 'condition' => 'good'])->assertUnprocessable();
    }

    public function test_locked_accounts_and_limits_are_enforced(): void
    {
        Setting::create(['key' => 'max_books', 'value' => '1']);
        $this->active($this->book());
        $this->actingAs($this->reader)->postJson('/api/loan-requests', ['book_id' => $this->book()->id])->assertUnprocessable();
        $this->reader->update(['locked' => true]);
        $this->getJson('/api/loans')->assertForbidden();
    }

    public function test_last_super_admin_is_protected(): void
    {
        $this->actingAs($this->admin)->putJson('/api/members/'.$this->admin->id, ['name' => $this->admin->name, 'email' => $this->admin->email, 'locked' => true])->assertUnprocessable();
        $this->putJson('/api/members/'.$this->admin->id, ['name' => $this->admin->name, 'email' => $this->admin->email, 'locked' => false, 'role' => 'Reader'])->assertUnprocessable();
    }

    public function test_reviews_require_returned_loan_and_upsert_once(): void
    {
        $b = $this->book();
        $this->actingAs($this->reader)->putJson('/api/books/'.$b->id.'/review', ['rating' => 5, 'comment' => 'Very good book'])->assertForbidden();
        $l = $this->active($b);
        $this->service->returnBook($l, $this->staff);
        $this->putJson('/api/books/'.$b->id.'/review', ['rating' => 5, 'comment' => 'Very good book'])->assertOk();
        $this->putJson('/api/books/'.$b->id.'/review', ['rating' => 4, 'comment' => 'Updated review'])->assertOk();
        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_fine_payments_cannot_exceed_balance_and_waivers_need_permission(): void
    {
        $l = $this->active($this->book());
        $l->update(['due_at' => now()->subDays(2)]);
        $this->service->returnBook($l, $this->staff);
        $fine = Fine::firstOrFail();
        $this->actingAs($this->staff)->postJson('/api/fines/'.$fine->id.'/payments', ['amount' => 999999, 'type' => 'payment', 'note' => 'Invalid'])->assertUnprocessable();
        $this->postJson('/api/fines/'.$fine->id.'/payments', ['amount' => 1000, 'type' => 'waiver', 'note' => 'Not authorized'])->assertForbidden();
        $this->postJson('/api/fines/'.$fine->id.'/payments', ['amount' => 1000, 'type' => 'payment', 'note' => 'Cash receipt'])->assertOk();
        $this->assertEquals(1000, $fine->fresh()->paid_amount);
    }

    public function test_hidden_books_are_not_public_and_taxonomy_deletion_restricts_relations(): void
    {
        $b = $this->book();
        $b->update(['visible' => false]);
        $this->getJson('/api/books/'.$b->id)->assertForbidden();
        $this->getJson('/api/books')->assertJsonCount(0, 'data');
        $this->actingAs($this->staff)->deleteJson('/api/taxonomy/authors/'.$b->authors()->first()->id)->assertUnprocessable();
    }

    public function test_cancel_approved_loan_releases_copy(): void
    {
        $b = $this->book();
        $l = $this->service->approve($this->service->request($b->id, $this->reader), $this->staff);
        $this->actingAs($this->reader)->postJson('/api/loans/'.$l->id.'/cancel')->assertOk();
        $this->assertSame('available', $b->copies()->first()->status);
    }

    public function test_unauthenticated_download_returns_json_instead_of_a_missing_login_route(): void
    {
        $this->get('/api/reports/export?type=books')->assertUnauthorized()->assertHeader('Content-Type', 'application/json');
    }

    public function test_import_validates_entire_file_before_writing_and_creates_distinct_copies(): void
    {
        $invalid = "title,author,category,language,copies\nValid title,An Author,Technology,English,2\nInvalid title,Another Author,Science,English,invalid\n";
        $this->actingAs($this->admin)->post('/api/books/import', ['file' => UploadedFile::fake()->createWithContent('books.csv', $invalid)], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount('books', 0);
        $valid = "title,author,category,language,copies\nImported title,An Author,Technology,English,2\n";
        $this->post('/api/books/import', ['file' => UploadedFile::fake()->createWithContent('books.csv', $valid)], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.count', 1);
        $this->assertDatabaseCount('books', 1);
        $this->assertDatabaseCount('book_copies', 2);
        $this->assertSame(2, BookCopy::distinct()->count('barcode'));
    }

    public function test_csv_and_xlsx_exports_preserve_text_and_prevent_formula_injection(): void
    {
        Book::factory()->create(['title' => '=SUM(1,2)']);
        $csv = $this->actingAs($this->admin)->get('/api/reports/export?type=books&format=csv')->assertOk();
        $this->assertStringContainsString("'=SUM(1,2)", $csv->streamedContent());
        $xlsx = $this->get('/api/reports/export?type=books&format=xlsx')->assertOk();
        $this->assertStringStartsWith('PK', $xlsx->streamedContent());
    }

    public function test_upload_accepts_images_and_rejects_executable_files(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin)->post('/api/uploads/cover', ['image' => UploadedFile::fake()->image('cover.png', 40, 60)], ['Accept' => 'application/json'])->assertOk()->assertJsonStructure(['data' => ['url']]);
        $this->post('/api/uploads/cover', ['image' => UploadedFile::fake()->createWithContent('attack.php', '<?php echo 1;')], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_password_reset_uses_a_real_broker_token_and_updates_the_hash(): void
    {
        Notification::fake();
        $this->withHeaders(['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/'])->postJson('/api/auth/forgot-password', ['email' => $this->reader->email])->assertOk();
        $token = null;
        Notification::assertSentTo($this->reader, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });
        $this->assertNotNull($token);
        $this->postJson('/api/auth/reset-password', ['email' => $this->reader->email, 'token' => $token, 'password' => 'NewPassword123', 'password_confirmation' => 'NewPassword123'])->assertOk();
        $this->assertTrue(Hash::check('NewPassword123', $this->reader->fresh()->password));
    }

    public function test_queue_skips_a_member_who_became_locked(): void
    {
        $book = $this->book();
        $loan = $this->active($book);
        $first = $this->service->reserve($book->id, $this->other);
        $next = User::factory()->create();
        $next->assignRole('Reader');
        $second = $this->service->reserve($book->id, $next);
        $this->other->update(['locked' => true]);
        $this->service->returnBook($loan, $this->staff);
        $this->assertSame('cancelled', $first->fresh()->status);
        $this->assertSame('ready', $second->fresh()->status);
    }

    public function test_archiving_a_returned_book_retains_title_in_history_and_removes_available_inventory(): void
    {
        $book = $this->book();
        $title = $book->title;
        $loan = $this->active($book);
        $this->service->returnBook($loan, $this->staff);
        $this->actingAs($this->admin)->deleteJson('/api/books/'.$book->id)->assertOk();
        $this->assertSame($title, $loan->fresh()->book->title);
        $this->assertSame('maintenance', BookCopy::where('book_id', $book->id)->firstOrFail()->status);
        $this->getJson('/api/books/'.$book->id)->assertNotFound();
        $legacy = $this->book();
        $legacy->delete();
        $this->getJson('/api/public/stats')->assertJsonPath('data.copies', 0);
    }
}
