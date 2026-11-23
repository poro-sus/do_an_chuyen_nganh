<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookRequest;
use App\Http\Resources\BookResource;
use App\Models\Book;
use App\Models\BookCopy;
use App\Services\Audit;
use App\Services\CirculationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BookController extends Controller
{
    public static function query(): Builder
    {
        return Book::with(['authors', 'categories', 'publisher'])->withCount(['copies', 'copies as available_count' => fn ($q) => $q->where('status', 'available'), 'loans' => fn ($q) => $q->whereIn('status', ['active', 'returned']), 'reviews'])->withAvg('reviews', 'rating');
    }

    public function index(Request $r): AnonymousResourceCollection
    {
        $q = static::query();
        if (! $r->user()?->can('books.update')) {
            $q->where('visible', true);
        }
        if ($r->filled('search')) {
            $term = mb_substr($r->string('search'), 0, 150);
            $q->where(fn ($b) => $b->where('title', 'like', '%'.$term.'%')->orWhere('isbn', 'like', '%'.$term.'%')->orWhereHas('authors', fn ($a) => $a->where('name', 'like', '%'.$term.'%')));
        }
        if ($r->filled('category')) {
            $q->whereHas('categories', fn ($c) => $c->where('categories.id', $r->integer('category')));
        }
        foreach (['language', 'publisher_id'] as $field) {
            if ($r->filled($field)) {
                $q->where($field, $r->input($field));
            }
        }
        if ($r->boolean('available')) {
            $q->whereHas('copies', fn ($c) => $c->where('status', 'available'));
        }
        if ($r->boolean('featured')) {
            $q->where('featured', true);
        }
        if ($r->boolean('favorites')) {
            abort_unless($r->user(), 401);
            $q->whereIn('id', DB::table('favorites')->where('user_id', $r->user()->id)->select('book_id'));
        }
        $sort = ['newest' => ['created_at', 'desc'], 'title' => ['title', 'asc'], 'popular' => ['loans_count', 'desc'], 'year' => ['year', 'desc'], 'rating' => ['reviews_avg_rating', 'desc']][$r->input('sort', 'newest')] ?? ['created_at', 'desc'];

        return BookResource::collection($q->orderBy(...$sort)->orderBy('id')->paginate(min(100, max(1, $r->integer('per_page', 12)))));
    }

    public function show(Request $r, Book $book): BookResource
    {
        Gate::authorize('view', $book);
        $book->increment('views');
        $q = static::query()->whereKey($book->id)->with(['reviews' => fn ($q) => $q->with('user:id,name,avatar')->latest()->limit(30)]);
        $q->with('copies.shelf');
        $result = $q->firstOrFail();
        $result->setAttribute('review_distribution', $book->reviews()->selectRaw('rating, COUNT(*) as count')->groupBy('rating')->orderByDesc('rating')->get());
        $result->setAttribute('can_review', $r->user()?->loans()->where('book_id', $book->id)->where('status', 'returned')->exists() ?? false);
        $result->setAttribute('my_loan', $r->user()?->loans()->where('book_id', $book->id)->whereIn('status', ['requested', 'approved', 'active'])->first());
        $result->setAttribute('my_reservation', $r->user()?->reservations()->where('book_id', $book->id)->where('status', 'ready')->where('expires_at', '>', now())->first());

        return new BookResource($result);
    }

    public function store(BookRequest $r): JsonResponse
    {
        $book = DB::transaction(function () use ($r) {
            $data = $r->validated();
            $book = Book::create(collect($data)->except(['author_ids', 'category_ids'])->all() + ['slug' => Str::slug($data['title']).'-'.Str::lower(Str::random(6))]);
            $book->authors()->sync($data['author_ids']);
            $book->categories()->sync($data['category_ids']);
            Audit::log('books.create', $book->id);

            return $book;
        });

        return (new BookResource(static::query()->findOrFail($book->id)))->response()->setStatusCode(201);
    }

    public function update(BookRequest $r, Book $book): BookResource
    {
        Gate::authorize('update', $book);
        DB::transaction(function () use ($r, $book) {
            $book = Book::whereKey($book->id)->lockForUpdate()->firstOrFail();
            $data = $r->validated();
            $book->update(collect($data)->except(['author_ids', 'category_ids'])->all());
            $book->authors()->sync($data['author_ids']);
            $book->categories()->sync($data['category_ids']);
            Audit::log('books.update', $book->id);
        });

        return new BookResource(static::query()->findOrFail($book->id));
    }

    public function destroy(Book $book): JsonResponse
    {
        Gate::authorize('delete', $book);
        DB::transaction(function () use ($book) {
            $book = Book::whereKey($book->id)->lockForUpdate()->firstOrFail();
            abort_if($book->loans()->whereIn('status', ['requested', 'approved', 'active'])->exists() || $book->reservations()->whereIn('status', ['waiting', 'ready'])->exists(), 422, 'Sách còn phiếu mượn hoặc đặt trước đang hoạt động.');
            $book->copies()->where('status', 'available')->update(['status' => 'maintenance', 'notes' => 'Đầu sách đã được lưu trữ.']);
            $book->update(['visible' => false]);
            $book->delete();
            Audit::log('books.delete', $book->id);
        });

        return response()->json(['message' => 'Đã lưu trữ sách.']);
    }

    public function upload(Request $r): JsonResponse
    {
        $r->validate(['image' => 'required|image|mimes:jpg,jpeg,png,webp|max:4096']);
        $url = '/storage/'.$r->file('image')->store('covers', 'public');
        Audit::log('books.upload_cover');

        return response()->json(['data' => ['url' => $url]]);
    }

    public function copies(Request $r): JsonResponse
    {
        $q = BookCopy::with(['book:id,title', 'shelf']);
        if ($r->filled('book_id')) {
            $q->where('book_id', $r->integer('book_id'));
        } if ($r->filled('status')) {
            $q->where('status', $r->input('status'));
        } if ($r->filled('search')) {
            $q->where(fn ($b) => $b->where('barcode', 'like', '%'.$r->input('search').'%')->orWhereHas('book', fn ($b) => $b->where('title', 'like', '%'.$r->input('search').'%')));
        }

        return JsonResource::collection($q->latest()->paginate(20))->response();
    }

    public function addCopies(Request $r, Book $book): JsonResponse
    {
        $d = $r->validate(['count' => 'required|integer|between:1,50', 'shelf_id' => 'nullable|exists:shelves,id', 'condition' => 'sometimes|in:good,worn', 'acquired_at' => 'nullable|date', 'notes' => 'nullable|string|max:2000']);
        $copies = DB::transaction(function () use ($d, $book) {
            $book = Book::whereKey($book->id)->lockForUpdate()->firstOrFail();
            $items = [];
            for ($i = 0; $i < $d['count']; $i++) {
                $copy = $book->copies()->create(['barcode' => 'LV-'.strtoupper(Str::random(12)), 'shelf_id' => $d['shelf_id'] ?? null, 'acquired_at' => $d['acquired_at'] ?? today(), 'condition' => $d['condition'] ?? 'good', 'notes' => $d['notes'] ?? null]);
                app(CirculationService::class)->allocate($book, $copy);
                $items[] = $copy;
            } Audit::log('copies.create', $book->id, ['count' => $d['count']]);

            return $items;
        });

        return response()->json(['data' => $copies], 201);
    }

    public function updateCopy(Request $r, BookCopy $copy): JsonResponse
    {
        $d = $r->validate(['status' => 'required|in:available,maintenance,lost', 'condition' => 'required|in:good,worn,damaged,lost', 'shelf_id' => 'nullable|exists:shelves,id', 'notes' => 'nullable|string|max:2000']);
        DB::transaction(function () use ($d, $copy) {
            $book = Book::whereKey($copy->book_id)->lockForUpdate()->firstOrFail();
            $copy = BookCopy::whereKey($copy->id)->lockForUpdate()->firstOrFail();
            abort_if(in_array($copy->status, ['borrowed', 'held']), 422, 'Bản sao đang mượn hoặc giữ chỗ, hãy xử lý phiếu trước.');
            abort_if(($d['status'] === 'available' && in_array($d['condition'], ['damaged', 'lost'])) || ($d['status'] === 'lost' && $d['condition'] !== 'lost'), 422, 'Trạng thái và tình trạng không nhất quán.');
            $copy->update($d);
            if ($copy->status === 'available') {
                app(CirculationService::class)->allocate($book, $copy);
            } Audit::log('copies.update', $copy->id, $d);
        });

        return response()->json(['data' => $copy->fresh()]);
    }

    public function copyHistory(BookCopy $copy): JsonResponse
    {
        return response()->json(['data' => $copy->load(['book', 'shelf', 'loans.user:id,name,member_code'])]);
    }

    public function metadata(Request $r): JsonResponse
    {
        $r->validate(['isbn' => 'required|regex:/^(?:[0-9]{9}[0-9X]|[0-9]{13})$/']);
        $isbn = $r->input('isbn');
        $result = Cache::remember('isbn.'.$isbn, 86400, function () use ($isbn) {
            $response = Http::timeout(12)->withHeaders(['User-Agent' => 'LibrivoLocal/1.0 (local library educational project)'])->get('https://openlibrary.org/api/books', ['bibkeys' => 'ISBN:'.$isbn, 'format' => 'json', 'jscmd' => 'data']);
            abort_unless($response->successful(), 503, 'Nguồn metadata đang tạm ngưng.');

            return $response->json()['ISBN:'.$isbn] ?? null;
        });
        abort_unless($result && ! empty($result['authors']) && ! empty($result['title']), 404, 'Nguồn metadata chưa đủ thông tin xác minh ISBN này. Vui lòng nhập thông tin đã đối chiếu.');

        return response()->json(['data' => $result]);
    }
}
