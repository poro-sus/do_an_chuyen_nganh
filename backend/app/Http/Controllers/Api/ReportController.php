<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Author;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Category;
use App\Models\Fine;
use App\Models\Loan;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $d = $r->validate(['from' => 'nullable|date', 'to' => 'nullable|date|after_or_equal:from']);
        $from = $d['from'] ?? now()->subDays(30)->toDateString();
        $to = ($d['to'] ?? today()->toDateString()).' 23:59:59';

        return response()->json(['data' => [
            'loans' => Loan::whereBetween('borrowed_at', [$from, $to])->count(), 'returns' => Loan::whereBetween('returned_at', [$from, $to])->count(), 'new_members' => User::role('Reader')->whereBetween('created_at', [$from, $to])->count(),
            'fine_amount' => (int) Fine::whereBetween('created_at', [$from, $to])->sum('amount'), 'collected' => (int) DB::table('fine_payments')->where('type', 'payment')->whereBetween('created_at', [$from, $to])->sum('amount'),
            'inventory' => BookCopy::selectRaw('status,COUNT(*) as count')->groupBy('status')->get(),
            'categories' => Category::withCount('books')->orderByDesc('books_count')->get(),
            'top_books' => Book::with('authors')->withCount(['loans' => fn ($q) => $q->whereBetween('borrowed_at', [$from, $to])])->orderByDesc('loans_count')->limit(10)->get(),
            'active_members' => User::role('Reader')->select(['id', 'name', 'member_code'])->withCount(['loans' => fn ($q) => $q->whereBetween('borrowed_at', [$from, $to])])->orderByDesc('loans_count')->limit(10)->get(),
            'overdue' => Loan::with(['book:id,title', 'user:id,name,member_code'])->where('status', 'active')->where('due_at', '<', now())->orderBy('due_at')->limit(100)->get(),
        ]]);
    }

    /** Prefix untrusted spreadsheet cells to prevent formula injection. */
    private function safeCell(mixed $v): string
    {
        $s = (string) ($v ?? '');

        return preg_match('/^[=+@\-\t\r]/u', $s) ? "'".$s : $s;
    }

    public function export(Request $r): StreamedResponse
    {
        $d = $r->validate(['type' => 'required|in:books,members,loans,fines,inventory', 'format' => 'sometimes|in:csv,xlsx', 'from' => 'nullable|date', 'to' => 'nullable|date|after_or_equal:from']);
        $type = $d['type'];
        if ($type === 'members') {
            abort_unless($r->user()->can('members.manage'), 403);
        }
        $rows = match ($type) {
            'books' => Book::with(['authors', 'categories'])->get()->map(fn ($b) => [$b->id, $b->title, $b->isbn, $b->authors->pluck('name')->join('; '), $b->categories->pluck('name')->join('; '), $b->language]),
            'members' => User::role('Reader')->get()->map(fn ($u) => [$u->id, $u->member_code, $u->name, $u->email, $u->phone, $u->locked ? 'locked' : 'active']),
            'inventory' => BookCopy::with(['book', 'shelf'])->get()->map(fn ($c) => [$c->id, $c->book?->title, $c->barcode, $c->status, $c->condition, $c->shelf?->name]),
            'loans' => Loan::with(['book', 'user', 'copy'])->when($r->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $d['from']))->when($r->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $d['to']))->get()->map(fn ($l) => [$l->id, $l->user->member_code, $l->book?->title, $l->copy?->barcode, $l->status, $l->borrowed_at?->toIso8601String(), $l->due_at?->toIso8601String(), $l->returned_at?->toIso8601String()]),
            'fines' => Fine::with('user')->get()->map(fn ($f) => [$f->id, $f->user->member_code, $f->loan_id, $f->type, $f->amount, $f->paid_amount, $f->waived_amount, $f->amount - $f->paid_amount - $f->waived_amount])
        };
        $headers = match ($type) {
            'books' => ['id', 'title', 'isbn', 'authors', 'categories', 'language'],'members' => ['id', 'member_code', 'name', 'email', 'phone', 'status'],'inventory' => ['id', 'title', 'barcode', 'status', 'condition', 'shelf'],'loans' => ['id', 'member_code', 'title', 'barcode', 'status', 'borrowed_at', 'due_at', 'returned_at'],'fines' => ['id', 'member_code', 'loan_id', 'type', 'amount', 'paid_amount', 'waived_amount', 'balance']
        };
        $format = $d['format'] ?? 'csv';
        Audit::log('reports.export', null, ['type' => $type, 'format' => $format]);

        return response()->streamDownload(function () use ($rows, $headers, $format) {
            if ($format === 'xlsx') {
                $spreadsheet = new Spreadsheet;
                $sheet = $spreadsheet->getActiveSheet();
                foreach (array_merge([$headers], $rows->all()) as $i => $row) {
                    foreach (array_values($row) as $j => $v) {
                        $sheet->setCellValueExplicit([$j + 1, $i + 1], $this->safeCell($v), DataType::TYPE_STRING);
                    }
                } $sheet->getStyle('1:1')->getFont()->setBold(true);
                (new Xlsx($spreadsheet))->save('php://output');
            } else {
                $out = fopen('php://output', 'w');
                fwrite($out, "\xEF\xBB\xBF");
                fputcsv($out, $headers, ',', '"', '');
                foreach ($rows as $row) {
                    fputcsv($out, array_map(fn ($v) => $this->safeCell($v), $row), ',', '"', '');
                } fclose($out);
            }
        }, 'librivo-'.$type.'-'.today()->format('Y-m-d').'.'.$format, ['Content-Type' => $format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8']);
    }

    public function import(Request $r): JsonResponse
    {
        $r->validate(['file' => 'required|file|mimes:csv,txt,xlsx|max:4096']);
        try {
            $sheet = IOFactory::load($r->file('file')->getRealPath())->getActiveSheet();
            $rows = $sheet->toArray(null, false, false, false);
        } catch (\Throwable $e) {
            abort(422, 'Không đọc được tệp. Vui lòng dùng CSV UTF-8 hoặc XLSX.');
        }
        abort_if(count($rows) > 501, 422, 'Mỗi lần nhập tối đa 500 sách.');
        $headers = array_map(fn ($v) => trim((string) $v, "\xEF\xBB\xBF \t\n\r\0\x0B"), array_shift($rows) ?? []);
        abort_unless(count(array_intersect(['title', 'author', 'category', 'language'], $headers)) === 4, 422, 'Cột bắt buộc: title, author, category, language. Tùy chọn: isbn, copies.');
        $valid = [];
        $errors = [];
        $seen = [];
        foreach ($rows as $i => $row) {
            if (! array_filter($row, fn ($v) => $v !== null && $v !== '')) {
                continue;
            } if (count($row) !== count($headers)) {
                $errors['row_'.($i + 2)] = ['Số cột không hợp lệ.'];

                continue;
            } $d = array_combine($headers, $row);
            foreach ($d as $k => $v) {
                $d[$k] = is_string($v) ? trim($v) : $v;
            } if (empty($d['isbn'])) {
                $d['isbn'] = null;
            }
            $v = Validator::make($d, ['title' => 'required|string|max:255', 'author' => 'required|string|max:200', 'category' => 'required|string|max:200', 'language' => 'required|string|max:30', 'isbn' => 'nullable|regex:/^(?:[0-9]{9}[0-9X]|[0-9]{13})$/|unique:books,isbn', 'copies' => 'nullable|integer|between:0,50']);
            if ($v->fails()) {
                $errors['row_'.($i + 2)] = $v->errors()->all();
            } elseif ($d['isbn'] && in_array($d['isbn'], $seen)) {
                $errors['row_'.($i + 2)] = ['ISBN trùng trong tệp.'];
            } else {
                $valid[] = $d;
                if ($d['isbn']) {
                    $seen[] = $d['isbn'];
                }
            }
        }
        if ($errors) {
            return response()->json(['message' => 'Chưa nhập dữ liệu. Vui lòng sửa các dòng lỗi.', 'errors' => $errors], 422);
        }
        DB::transaction(function () use ($valid) {
            foreach ($valid as $d) {
                $a = Author::firstOrCreate(['name' => $d['author']]);
                $c = Category::firstOrCreate(['name' => $d['category']], ['slug' => Str::slug($d['category']).'-'.Str::random(4)]);
                $b = Book::create(['title' => $d['title'], 'slug' => Str::slug($d['title']).'-'.Str::random(6), 'isbn' => $d['isbn'], 'language' => $d['language']]);
                $b->authors()->attach($a);
                $b->categories()->attach($c);
                for ($i = 0; $i < (int) ($d['copies'] ?? 0); $i++) {
                    $b->copies()->create(['barcode' => 'LV-'.strtoupper(Str::random(12)), 'acquired_at' => today()]);
                }
            } Audit::log('books.import', null, ['count' => count($valid)]);
        });

        return response()->json(['message' => 'Đã nhập '.count($valid).' sách.', 'data' => ['count' => count($valid)]]);
    }

    public function backup(): StreamedResponse
    {
        Audit::log('backup.export');

        return response()->streamDownload(function () {
            $data = ['version' => 1, 'generated_at' => now()->toIso8601String(), 'users' => User::all()->makeHidden(['password', 'remember_token'])];
            foreach (['books', 'book_copies', 'authors', 'categories', 'publishers', 'shelves', 'book_authors', 'book_categories', 'loans', 'loan_renewals', 'reservations', 'fines', 'fine_payments', 'favorites', 'reviews', 'settings', 'audit_logs'] as $table) {
                $data[$table] = DB::table($table)->get();
            } echo json_encode($data,JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }, 'librivo-data-backup-'.today()->format('Y-m-d').'.json', ['Content-Type' => 'application/json']);
    }
}
