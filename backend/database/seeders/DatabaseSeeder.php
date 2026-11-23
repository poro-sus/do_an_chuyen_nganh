<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Author;
use App\Models\Book;
use App\Models\Category;
use App\Models\Fine;
use App\Models\Loan;
use App\Models\Publisher;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\Setting;
use App\Models\Shelf;
use App\Models\User;
use App\Notifications\LibraryNotice;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $staffPermissions = ['dashboard.view', 'books.view', 'books.create', 'books.update', 'taxonomy.manage', 'members.manage', 'loans.approve', 'loans.return', 'fines.collect', 'reports.view', 'reports.export', 'reviews.moderate'];
        $all = array_merge($staffPermissions, ['books.delete', 'users.manage', 'roles.manage', 'settings.manage', 'audit.view', 'fines.waive']);
        foreach ($all as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        foreach (['Super Admin', 'Librarian', 'Reader'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
        Role::findByName('Super Admin')->syncPermissions($all);
        Role::findByName('Librarian')->syncPermissions($staffPermissions);
        Role::findByName('Reader')->syncPermissions(['books.view']);
        $defaults = ['library_name' => 'LIBRIVO', 'loan_days' => 14, 'max_books' => 5, 'max_renewals' => 2, 'fine_per_day' => 3000, 'grace_days' => 0, 'fine_cap' => 150000, 'hold_hours' => 48, 'contact_email' => 'hello@librivo.local', 'contact_phone' => '028 3822 2026', 'address' => 'Không gian đọc LIBRIVO · Thành phố Hồ Chí Minh', 'opening_hours' => 'Thứ 2 – Thứ 7: 08:00 – 20:00', 'about' => 'Một cuốn sách mở ra một thế giới. LIBRIVO kết nối bạn với những ý tưởng, câu chuyện và tri thức đáng khám phá.', 'policy' => 'Giữ gìn sách, trả đúng hạn và tôn trọng không gian đọc chung. Mỗi thành viên được mượn tối đa 5 cuốn trong 14 ngày. Gia hạn cần được thư viện phê duyệt.'];
        foreach ($defaults as $k => $v) {
            Setting::firstOrCreate(['key' => $k], ['value' => (string) $v]);
        }
        if (Book::withTrashed()->exists()) {
            $this->call(BookContentSeeder::class);
            $this->command?->info('Demo data already exists; existing data preserved.');

            return;
        }
        DB::transaction(function (): void {
            $admin = User::firstOrCreate(['email' => 'admin@librivo.local'], ['name' => 'Duy Lê', 'password' => Hash::make('AdminDemo!2026'), 'member_code' => 'LV-ADMIN', 'email_verified_at' => now()]);
            $admin->assignRole('Super Admin');
            $staff = User::firstOrCreate(['email' => 'librarian@librivo.local'], ['name' => 'Ngọc Anh', 'password' => Hash::make('LibraryDemo!2026'), 'member_code' => 'LV-STAFF', 'email_verified_at' => now()]);
            $staff->assignRole('Librarian');
            $reader = User::firstOrCreate(['email' => 'reader@librivo.local'], ['name' => 'Minh An', 'password' => Hash::make('ReaderDemo!2026'), 'member_code' => 'LV-0001', 'email_verified_at' => now()]);
            $reader->assignRole('Reader');
            $readers = collect([$reader]);
            $names = ['Nguyễn Hoàng Anh', 'Trần Minh Châu', 'Lê Gia Huy', 'Phạm Ngọc Linh', 'Vũ Thanh Hà', 'Đặng Đức Minh', 'Bùi Khánh Vy', 'Đỗ Tuấn Kiệt', 'Hồ Phương Thảo', 'Ngô Hải Đăng', 'Dương Minh Khang', 'Lý Thu Trang', 'Võ Quỳnh Anh', 'Nguyễn Bảo Ngọc', 'Trần Quốc Bảo', 'Lê Hương Giang', 'Phạm Thành Đạt', 'Vũ Mai Chi', 'Đặng Anh Khoa', 'Bùi Tú Anh', 'Đỗ Nhật Minh', 'Hồ Ngọc Trâm', 'Ngô Bảo An', 'Dương Anh Tuấn', 'Lý Hoài Nam', 'Võ Thanh Tâm', 'Nguyễn Hà My', 'Trần Phúc An', 'Lê Thảo Nhi', 'Phạm Minh Quân', 'Vũ Như Ý', 'Đặng Quang Huy', 'Bùi Bích Ngọc', 'Đỗ Thiên Phúc'];
            foreach ($names as $i => $name) {
                $u = User::create(['name' => $name, 'email' => 'member'.($i + 2).'@librivo.local', 'password' => Hash::make('ReaderDemo!2026'), 'member_code' => 'LV-'.str_pad($i + 2, 4, '0', STR_PAD_LEFT), 'created_at' => now()->subDays(($i * 9) % 300), 'email_verified_at' => now()]);
                $u->assignRole('Reader');
                $readers->push($u);
            }
            $categoryNames = ['Công nghệ thông tin', 'Lập trình', 'Trí tuệ nhân tạo', 'Khoa học dữ liệu', 'Kinh doanh', 'Kinh tế', 'Tâm lý học', 'Văn học', 'Khoa học', 'Lịch sử', 'Phát triển bản thân', 'Thiết kế', 'Ngoại ngữ', 'Giáo dục', 'Tiểu thuyết'];
            $colors = ['#635BFF', '#3972DF', '#AB62CC', '#4295A0', '#DA9250', '#679664', '#BB746C', '#9C804D', '#5E9CBA', '#B1855D', '#699A74', '#AF6B90', '#5889A5', '#A79058', '#8A78AE'];
            $cats = [];
            foreach ($categoryNames as $i => $name) {
                $cats[$name] = Category::create(['name' => $name, 'slug' => Str::slug($name), 'description' => 'Khám phá bộ sưu tập '.$name.' được tuyển chọn tại LIBRIVO.', 'color' => $colors[$i]]);
            }
            $shelves = [];
            foreach (['A1 · Tri thức & công nghệ', 'A2 · Kinh doanh & phát triển', 'B1 · Văn học thế giới', 'B2 · Văn học Việt Nam', 'C1 · Khoa học & lịch sử'] as $i => $s) {
                $shelves[] = Shelf::create(['name' => $s, 'location' => 'Tầng '.($i < 2 ? '1' : '2').' · Khu '.substr($s, 0, 2)]);
            }
            $fixtures = json_decode(file_get_contents(database_path('fixtures/books.json')), true, 512, JSON_THROW_ON_ERROR);
            $books = collect();
            $descriptions = [
                'Atomic Habits' => 'Thay đổi nhỏ, kết quả lớn. James Clear giới thiệu cách xây dựng thói quen qua những hành động có thể lặp lại mỗi ngày. Một gợi ý đọc cho hành trình phát triển bản thân bền vững.',
                'Clean Code' => 'Chất lượng phần mềm bắt đầu từ những dòng mã dễ hiểu. Robert C. Martin chia sẻ các nguyên tắc giúp lập trình viên viết, đọc và cải thiện mã nguồn.',
                'The Psychology of Money' => 'Tiền bạc gắn với cách chúng ta suy nghĩ và hành xử. Morgan Housel khám phá những góc nhìn về sự giàu có, rủi ro và các quyết định tài chính.',
                'Deep Work' => 'Tìm lại sự tập trung trong một thế giới nhiều gián đoạn. Cal Newport bàn về giá trị của công việc cần tư duy sâu và cách dành không gian cho nó.',
                'The Alchemist' => 'Theo chân Santiago trên hành trình đi tìm kho báu và lắng nghe khát vọng của chính mình. Một câu chuyện của Paulo Coelho về lựa chọn, niềm tin và những cuộc gặp gỡ.',
                'The Hobbit' => 'Một chuyến phiêu lưu bắt đầu ngay trước cửa nhà. Cùng Bilbo Baggins khám phá thế giới kỳ ảo trong tác phẩm của J.R.R. Tolkien.',
            ];
            foreach ($fixtures as $i => $d) {
                $category = $d['category'];
                if (preg_match('/Algorithms|C Programming|Shaders|C\+\+|SICP|computer programming|Software Engineering/i', $d['title'])) {
                    $category = 'Lập trình';
                }
                if (preg_match('/Ai Pro/i', $d['title'])) {
                    $category = 'Trí tuệ nhân tạo';
                } if (preg_match('/Numerical|Information systems/i', $d['title'])) {
                    $category = 'Khoa học dữ liệu';
                }
                if (preg_match('/Thinketh|Deep Work|Atomic|Subtle/i', $d['title'])) {
                    $category = 'Phát triển bản thân';
                }
                $publisher = $d['publisher'] ? Publisher::firstOrCreate(['name' => $d['publisher']]) : null;
                $summary = $descriptions[$d['title']] ?? ('“'.$d['title'].'” — một lựa chọn trong tủ sách '.mb_strtolower($category).' của LIBRIVO. Khám phá tác phẩm của '.implode(', ', array_slice($d['authors'], 0, 2)).' và tìm thêm những góc nhìn cho hành trình tri thức của bạn.');
                $book = Book::create(['title' => $d['title'], 'slug' => Str::slug($d['title']).'-'.($i + 1), 'isbn' => $d['isbn'], 'publisher_id' => $publisher?->id, 'year' => $d['year'], 'pages' => $d['pages'], 'cover' => $d['cover'], 'source' => $d['source'], 'language' => $d['language'] ?? 'Tiếng Anh', 'summary' => $summary, 'description' => $summary, 'price' => null, 'featured' => $i < 12, 'created_at' => now()->subDays($i)]);
                $authorIds = [];
                foreach (array_slice(array_unique($d['authors']), 0, 4) as $name) {
                    $authorIds[] = Author::firstOrCreate(['name' => mb_substr($name, 0, 250)], ['bio' => null])->id;
                } $book->authors()->sync($authorIds);
                $book->categories()->attach($cats[$category]);
                if ($category === 'Lập trình') {
                    $book->categories()->syncWithoutDetaching([$cats['Công nghệ thông tin']->id]);
                }
                for ($j = 0; $j < 1 + $i % 5; $j++) {
                    $book->copies()->create(['barcode' => 'LV-'.str_pad($i + 1, 4, '0', STR_PAD_LEFT).'-'.str_pad($j + 1, 2, '0', STR_PAD_LEFT), 'shelf_id' => $shelves[$i % 5]->id, 'acquired_at' => today()->subDays($i % 100), 'condition' => 'good']);
                } $books->push($book);
            }
            for ($i = 0; $i < 220; $i++) {
                $book = $books[$i % $books->count()];
                $u = $readers[$i % $readers->count()];
                $borrowed = now()->subDays(15 + ($i * 7) % 330);
                $returned = $borrowed->copy()->addDays(3 + $i % 12);
                $loan = Loan::create(['book_id' => $book->id, 'user_id' => $u->id, 'book_copy_id' => $book->copies()->first()->id, 'handled_by' => $staff->id, 'status' => 'returned', 'approved_at' => $borrowed->copy()->subDay(), 'borrowed_at' => $borrowed, 'due_at' => $borrowed->copy()->addDays(14), 'returned_at' => $returned, 'created_at' => $borrowed->copy()->subDays(2), 'updated_at' => $returned]);
                if ($i < 25 && $u->id !== $reader->id) {
                    $fine = Fine::create(['loan_id' => $loan->id, 'user_id' => $u->id, 'type' => 'damage', 'amount' => 15000 + ($i % 5) * 5000, 'reason' => 'Phí xử lý hư hỏng nhẹ trong dữ liệu demo']);
                    if ($i % 3 === 0) {
                        $fine->update(['paid_amount' => $fine->amount]);
                        $fine->payments()->create(['amount' => $fine->amount, 'handled_by' => $staff->id, 'type' => 'payment', 'note' => 'Thu thủ công tại quầy (demo)']);
                    }
                }
            }
            for ($i = 0; $i < 25; $i++) {
                $book = $books[$i];
                $copy = $book->copies()->first();
                $u = $readers[$i % 35];
                $isOverdue = $i > 4 && $i % 4 === 0;
                $borrowed = now()->subDays($isOverdue ? 20 : ($i % 8 + 1));
                Loan::create(['book_id' => $book->id, 'user_id' => $u->id, 'book_copy_id' => $copy->id, 'handled_by' => $staff->id, 'status' => 'active', 'approved_at' => $borrowed->copy()->subDay(), 'borrowed_at' => $borrowed, 'due_at' => $borrowed->copy()->addDays(14), 'created_at' => $borrowed->copy()->subDay()]);
                $copy->update(['status' => 'borrowed']);
            }
            foreach (range(30, 37) as $i) {
                Loan::create(['book_id' => $books[$i]->id, 'user_id' => $readers[($i + 2) % 35]->id, 'created_at' => now()->subHours($i - 29)]);
            }
            foreach ([0, 5, 10] as $i) {
                Reservation::create(['book_id' => $books[$i]->id, 'user_id' => $readers[($i + 8) % 35]->id, 'created_at' => now()->subHours(3)]);
            }
            $holdBook = $books[40];
            $holdCopy = $holdBook->copies()->first();
            $holdCopy->update(['status' => 'held']);
            Reservation::create(['book_id' => $holdBook->id, 'user_id' => $readers[7]->id, 'book_copy_id' => $holdCopy->id, 'status' => 'ready', 'expires_at' => now()->addHours(24)]);
            foreach ($readers->take(10) as $i => $u) {
                $u->favorites()->syncWithoutDetaching([$books[$i]->id, $books[($i + 4) % 100]->id, $books[($i + 9) % 100]->id]);
                $u->notify(new LibraryNotice('Chào mừng đến với LIBRIVO', 'Hành trình tri thức của bạn bắt đầu từ một cuốn sách. Khám phá tủ sách và tìm tác phẩm yêu thích.', '/catalog'));
            }
            foreach (Loan::where('status', 'returned')->limit(24)->get() as $i => $loan) {
                Review::firstOrCreate(['book_id' => $loan->book_id, 'user_id' => $loan->user_id], ['rating' => 4 + ($i % 2), 'comment' => ['Một cuốn sách đáng dành thời gian. Tôi đặc biệt thích những góc nhìn mà tác giả mang lại.', 'Trải nghiệm mượn sách thuận tiện, sách được giữ gìn tốt. Nội dung có nhiều điều để suy ngẫm.', 'Tôi đã tìm được những ý tưởng thú vị từ cuốn sách này. Sẽ giới thiệu cho bạn bè.'][$i % 3]]);
            }
            AuditLog::create(['user_id' => $admin->id, 'action' => 'system.demo_seeded', 'subject' => 'library', 'data' => ['books' => $books->count(), 'readers' => $readers->count()]]);
        });
        $this->call(BookContentSeeder::class);
        $this->command?->info('LIBRIVO: 100 books, 300 copies, 35 readers and linked circulation demo seeded.');
    }
}
