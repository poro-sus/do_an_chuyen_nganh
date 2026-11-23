<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Loan;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class CommunityController extends Controller
{
    public function favorites(Request $r): JsonResponse
    {
        return response()->json(['data' => $r->user()->favorites()->pluck('books.id')]);
    }

    public function favorite(Request $r, Book $book): JsonResponse
    {
        Gate::authorize('view', $book);
        $d = $r->validate(['saved' => 'required|boolean']);
        if ($d['saved']) {
            $r->user()->favorites()->syncWithoutDetaching([$book->id]);
        } else {
            $r->user()->favorites()->detach($book->id);
        }

        return response()->json(['data' => ['saved' => $d['saved']]]);
    }

    public function review(Request $r, Book $book): JsonResponse
    {
        Gate::authorize('view', $book);
        $d = $r->validate(['rating' => 'required|integer|between:1,5', 'comment' => 'required|string|min:5|max:2000']);
        abort_unless(Loan::where('user_id', $r->user()->id)->where('book_id', $book->id)->where('status', 'returned')->exists(), 403, 'Bạn chỉ có thể đánh giá sách đã mượn và trả.');
        $review = Review::updateOrCreate(['user_id' => $r->user()->id, 'book_id' => $book->id], $d);

        return response()->json(['data' => $review]);
    }

    public function reviews(Request $r): JsonResponse
    {
        return JsonResource::collection(Review::with('book')->where('user_id', $r->user()->id)->latest()->paginate(20))->response();
    }

    public function deleteReview(Request $r, Review $review): JsonResponse
    {
        abort_unless($review->user_id === $r->user()->id || $r->user()->can('reviews.moderate'), 403);
        $review->delete();

        return response()->json(['message' => 'Đã xóa đánh giá.']);
    }

    public function notifications(Request $r): JsonResponse
    {
        return JsonResource::collection($r->user()->notifications()->latest()->paginate(20))->response();
    }

    public function readNotification(Request $r, string $id): JsonResponse
    {
        if ($id === 'all') {
            $r->user()->unreadNotifications()->update(['read_at' => now()]);
        } else {
            $r->user()->notifications()->findOrFail($id)->markAsRead();
        }

        return response()->json(['message' => 'Đã đánh dấu đã đọc.']);
    }

    public function summary(Request $r): JsonResponse
    {
        $u = $r->user();

        return response()->json(['data' => ['active' => $u->loans()->where('status', 'active')->count(), 'requested' => $u->loans()->whereIn('status', ['requested', 'approved'])->count(), 'returned' => $u->loans()->where('status', 'returned')->count(), 'overdue' => $u->loans()->where('status', 'active')->where('due_at', '<', now())->count(), 'favorites' => $u->favorites()->count(), 'reservations' => $u->reservations()->whereIn('status', ['waiting', 'ready'])->count(), 'unread' => $u->unreadNotifications()->count(), 'unpaid' => (int) $u->fines()->selectRaw('COALESCE(SUM(amount-paid_amount-waived_amount),0) as total')->value('total'), 'history' => $u->loans()->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count")->where('created_at', '>=', now()->subMonths(11)->startOfMonth())->groupBy('month')->orderBy('month')->get()]]);
    }
}
