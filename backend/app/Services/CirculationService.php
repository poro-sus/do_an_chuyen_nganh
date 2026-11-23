<?php

namespace App\Services;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Fine;
use App\Models\Loan;
use App\Models\LoanRenewal;
use App\Models\Reservation;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\LibraryNotice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CirculationService
{
    private function require(bool $condition, string $message): void
    {
        if (! $condition) {
            throw ValidationException::withMessages(['circulation' => $message]);
        }
    }

    private function lockBook(int $id): Book
    {
        return Book::whereKey($id)->lockForUpdate()->firstOrFail();
    }

    private function lockUser(int $id): User
    {
        return User::whereKey($id)->lockForUpdate()->firstOrFail();
    }

    public function eligible(User $user, bool $includeRequests = true): bool
    {
        return ! $user->locked && $user->loans()->whereIn('status', $includeRequests ? ['requested', 'approved', 'active'] : ['approved', 'active'])->count() < (int) Setting::valueFor('max_books', 5)
         && ! $user->fines()->whereRaw('amount > paid_amount + waived_amount')->exists() && ! $user->loans()->where('status', 'active')->where('due_at', '<', now())->exists();
    }

    public function request(int $bookId, User $user): Loan
    {
        return DB::transaction(function () use ($bookId, $user) {
            $book = $this->lockBook($bookId);
            $user = $this->lockUser($user->id);
            $this->require($book->visible, 'Sách không được phép mượn.');
            $this->require($this->eligible($user), 'Không đủ điều kiện mượn: kiểm tra hạn mức, sách quá hạn hoặc phí chưa trả.');
            $this->require(! Loan::where('book_id', $bookId)->where('user_id', $user->id)->whereIn('status', ['requested', 'approved', 'active'])->exists(), 'Bạn đã có yêu cầu hoặc đang mượn đầu sách này.');
            $hasHold = Reservation::where('book_id', $bookId)->where('user_id', $user->id)->where('status', 'ready')->where('expires_at', '>', now())->exists();
            $this->require($book->copies()->where('status', 'available')->exists() || $hasHold, 'Sách đã hết bản khả dụng. Vui lòng đặt trước.');
            $loan = Loan::create(['book_id' => $bookId, 'user_id' => $user->id]);
            Audit::log('loans.request', $loan->id);

            return $loan;
        }, 5);
    }

    public function approve(Loan $original, User $staff, ?int $copyId = null): Loan
    {
        return DB::transaction(function () use ($original, $staff, $copyId) {
            $book = $this->lockBook($original->book_id);
            $user = $this->lockUser($original->user_id);
            $loan = Loan::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->require($loan->status === 'requested', 'Yêu cầu đã được xử lý.');
            $this->require($book->visible && $this->eligible($user, false), 'Thành viên không đủ điều kiện mượn.');
            $reservation = Reservation::where('book_id', $book->id)->where('user_id', $user->id)->where('status', 'ready')->where('expires_at', '>', now())->lockForUpdate()->first();
            if ($reservation) {
                $copy = BookCopy::whereKey($reservation->book_copy_id)->where('status', 'held')->lockForUpdate()->first();
            } else {
                $query = $book->copies()->where('status', 'available');
                if ($copyId) {
                    $query->whereKey($copyId);
                } $copy = $query->orderBy('id')->lockForUpdate()->first();
            }
            $this->require((bool) $copy, 'Không còn bản sao khả dụng phù hợp.');
            $copy->update(['status' => 'held']);
            $loan->update(['status' => 'approved', 'book_copy_id' => $copy->id, 'handled_by' => $staff->id, 'approved_at' => now()]);
            if ($reservation) {
                $reservation->update(['status' => 'fulfilled']);
            }
            $user->notify(new LibraryNotice('Yêu cầu đã được duyệt', 'Mời bạn đến thư viện nhận “'.$book->title.'”.'));
            Audit::log('loans.approve', $loan->id, ['copy_id' => $copy->id]);

            return $loan->fresh();
        }, 5);
    }

    public function handoff(Loan $original, User $staff): Loan
    {
        return DB::transaction(function () use ($original, $staff) {
            $this->lockBook($original->book_id);
            $user = $this->lockUser($original->user_id);
            $loan = Loan::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->require($loan->status === 'approved', 'Chỉ phiếu đã duyệt mới được bàn giao.');
            $this->require(! $user->locked && ! $user->fines()->whereRaw('amount > paid_amount + waived_amount')->exists() && ! $user->loans()->where('status', 'active')->where('due_at', '<', now())->exists(), 'Thành viên đang bị chặn mượn.');
            $copy = BookCopy::whereKey($loan->book_copy_id)->lockForUpdate()->firstOrFail();
            $this->require($copy->status === 'held', 'Bản sao không ở trạng thái giữ chỗ.');
            $loan->update(['status' => 'active', 'borrowed_at' => now(), 'due_at' => now()->addDays((int) Setting::valueFor('loan_days', 14)), 'handled_by' => $staff->id]);
            $copy->update(['status' => 'borrowed']);
            $user->notify(new LibraryNotice('Bạn đã nhận sách', 'Hạn trả: '.$loan->due_at->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y')));
            Audit::log('loans.handoff', $loan->id);

            return $loan->fresh();
        }, 5);
    }

    public function close(Loan $original, string $state, User $actor, ?string $reason = null): Loan
    {
        return DB::transaction(function () use ($original, $state, $reason) {
            $book = $this->lockBook($original->book_id);
            $this->lockUser($original->user_id);
            $loan = Loan::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->require(in_array($loan->status, ['requested', 'approved']), 'Chỉ có thể hủy hoặc từ chối phiếu chưa bàn giao.');
            $copy = $loan->book_copy_id ? BookCopy::whereKey($loan->book_copy_id)->lockForUpdate()->first() : null;
            $loan->update(['status' => $state, 'notes' => $reason]);
            if ($copy) {
                $copy->update(['status' => 'available']);
                $this->allocate($book, $copy);
            }
            $loan->user->notify(new LibraryNotice('Cập nhật yêu cầu mượn', $state === 'rejected' ? 'Yêu cầu bị từ chối: '.$reason : 'Yêu cầu đã được hủy.'));
            Audit::log('loans.'.$state, $loan->id);

            return $loan->fresh();
        }, 5);
    }

    public function returnBook(Loan $original, User $staff, string $condition = 'good', int $damageFee = 0): Loan
    {
        return DB::transaction(function () use ($original, $staff, $condition, $damageFee) {
            $book = $this->lockBook($original->book_id);
            $user = $this->lockUser($original->user_id);
            $loan = Loan::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->require($loan->status === 'active', 'Phiếu này không đang mượn hoặc đã được trả.');
            $copy = BookCopy::whereKey($loan->book_copy_id)->lockForUpdate()->firstOrFail();
            $lateDays = max(0, (int) $loan->due_at->copy()->timezone('Asia/Ho_Chi_Minh')->startOfDay()->diffInDays(now('Asia/Ho_Chi_Minh')->startOfDay(), false) - (int) Setting::valueFor('grace_days', 0));
            $fee = $lateDays * (int) Setting::valueFor('fine_per_day', 3000);
            $cap = (int) Setting::valueFor('fine_cap', 150000);
            if ($cap > 0) {
                $fee = min($fee, $cap);
            }
            if ($fee > 0) {
                Fine::create(['loan_id' => $loan->id, 'user_id' => $user->id, 'type' => 'overdue', 'amount' => $fee, 'reason' => $lateDays.' ngày trễ tính phí']);
            }
            if (in_array($condition, ['lost', 'damaged'])) {
                $amount = $condition === 'lost' ? ($book->price ?? 0) : $damageFee;
                if ($amount > 0) {
                    Fine::create(['loan_id' => $loan->id, 'user_id' => $user->id, 'type' => $condition === 'lost' ? 'lost' : 'damage', 'amount' => $amount, 'reason' => 'Ghi nhận tình trạng khi trả sách']);
                }
            }
            $loan->update(['status' => 'returned', 'returned_at' => now(), 'handled_by' => $staff->id]);
            $loan->renewals()->where('status', 'requested')->update(['status' => 'rejected', 'reason' => 'Phiếu mượn đã kết thúc.', 'handled_by' => $staff->id]);
            $copy->update(['status' => match ($condition) {
                'lost' => 'lost','damaged' => 'maintenance',default => 'available'
            }, 'condition' => $condition]);
            if ($copy->status === 'available') {
                $this->allocate($book, $copy);
            }
            $user->notify(new LibraryNotice('Đã trả sách', 'Thư viện đã nhận lại “'.$book->title.'”. Cảm ơn bạn!'));
            Audit::log('loans.return', $loan->id, ['condition' => $condition, 'overdue_fee' => $fee]);

            return $loan->fresh();
        }, 5);
    }

    public function reserve(int $bookId, User $user): Reservation
    {
        return DB::transaction(function () use ($bookId, $user) {
            $book = $this->lockBook($bookId);
            $user = $this->lockUser($user->id);
            $this->require($book->visible && $this->eligible($user), 'Bạn chưa đủ điều kiện đặt trước.');
            $this->require(! $book->copies()->where('status', 'available')->exists(), 'Sách còn bản khả dụng. Hãy gửi yêu cầu mượn.');
            $this->require(! Reservation::where('book_id', $bookId)->where('user_id', $user->id)->whereIn('status', ['waiting', 'ready'])->exists(), 'Bạn đã ở trong hàng chờ.');
            $this->require(! Loan::where('book_id', $bookId)->where('user_id', $user->id)->whereIn('status', ['requested', 'approved', 'active'])->exists(), 'Bạn đã có yêu cầu hoặc đang mượn sách này.');
            $reservation = Reservation::create(['book_id' => $bookId, 'user_id' => $user->id]);
            Audit::log('reservations.create', $reservation->id);

            return $reservation;
        }, 5);
    }

    /** Called only inside a transaction while holding the parent book lock. */
    public function allocate(Book $book, BookCopy $copy): void
    {
        foreach ($book->reservations()->where('status', 'waiting')->orderBy('created_at')->orderBy('id')->lockForUpdate()->get() as $reservation) {
            $user = $this->lockUser($reservation->user_id);
            if (! $this->eligible($user)) {
                $reservation->update(['status' => 'cancelled']);
                $user->notify(new LibraryNotice('Đặt trước đã hủy', 'Bạn chưa đủ điều kiện nhận sách. Vui lòng kiểm tra phí phạt và hạn trả.', '/reader/reservations'));

                continue;
            }
            $copy->update(['status' => 'held']);
            $reservation->update(['status' => 'ready', 'book_copy_id' => $copy->id, 'expires_at' => now()->addHours((int) Setting::valueFor('hold_hours', 48))]);
            $user->notify(new LibraryNotice('Sách đặt trước đã sẵn sàng', '“'.$book->title.'” được giữ cho bạn. Hãy gửi yêu cầu mượn trước khi hết hạn.', '/reader/reservations'));
            break;
        }
    }

    public function cancelReservation(Reservation $original, string $state = 'cancelled'): Reservation
    {
        return DB::transaction(function () use ($original, $state) {
            $book = $this->lockBook($original->book_id);
            $reservation = Reservation::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->require(in_array($reservation->status, ['waiting', 'ready']), 'Đặt trước đã được xử lý.');
            if ($state === 'expired') {
                $this->require($reservation->status === 'ready' && $reservation->expires_at->isPast(), 'Chưa hết hạn giữ sách.');
            }
            $copy = $reservation->book_copy_id ? BookCopy::whereKey($reservation->book_copy_id)->lockForUpdate()->first() : null;
            $reservation->update(['status' => $state]);
            if ($copy && $copy->status === 'held') {
                $copy->update(['status' => 'available']);
                $this->allocate($book, $copy);
            } Audit::log('reservations.'.$state, $reservation->id);

            return $reservation->fresh();
        }, 5);
    }

    private function canRenew(Loan $loan): void
    {
        $this->require($loan->status === 'active' && ! $loan->overdue, 'Chỉ được gia hạn phiếu đang mượn và chưa quá hạn.');
        $this->require($loan->renewal_count < (int) Setting::valueFor('max_renewals', 2), 'Đã hết số lần gia hạn.');
        $this->require(! Reservation::where('book_id', $loan->book_id)->whereIn('status', ['waiting', 'ready'])->exists(), 'Sách có người đặt trước, không thể gia hạn.');
    }

    public function requestRenewal(Loan $original): LoanRenewal
    {
        return DB::transaction(function () use ($original) {
            $this->lockBook($original->book_id);
            $loan = Loan::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->canRenew($loan);
            $this->require(! $loan->renewals()->where('status', 'requested')->exists(), 'Đã có yêu cầu gia hạn chờ xử lý.');
            $renewal = $loan->renewals()->create(['previous_due_at' => $loan->due_at]);
            Audit::log('renewals.request', $renewal->id);

            return $renewal;
        }, 5);
    }

    public function decideRenewal(LoanRenewal $original, User $staff, bool $approve, ?string $reason = null): LoanRenewal
    {
        return DB::transaction(function () use ($original, $staff, $approve, $reason) {
            $this->lockBook($original->loan->book_id);
            $this->lockUser($original->loan->user_id);
            $loan = Loan::whereKey($original->loan_id)->lockForUpdate()->firstOrFail();
            $renewal = LoanRenewal::whereKey($original->id)->lockForUpdate()->firstOrFail();
            $this->require($renewal->status === 'requested', 'Yêu cầu đã được xử lý.');
            if ($approve) {
                $this->canRenew($loan);
                $this->require(! $loan->user->locked, 'Tài khoản đang bị khóa.');
                $newDue = $loan->due_at->copy()->addDays((int) Setting::valueFor('loan_days',14));
                $loan->update(['due_at' => $newDue, 'renewal_count' => $loan->renewal_count + 1]);
            }
            $renewal->update(['status' => $approve ? 'approved' : 'rejected', 'new_due_at' => $newDue ?? null, 'handled_by' => $staff->id, 'reason' => $reason]);
            $loan->user->notify(new LibraryNotice('Cập nhật gia hạn',$approve ? 'Yêu cầu gia hạn đã được chấp thuận.' : 'Yêu cầu gia hạn bị từ chối: '.$reason));
            Audit::log('renewals.decide',$renewal->id,['approved' => $approve]);

            return $renewal->fresh();
        }, 5);
    }
}
