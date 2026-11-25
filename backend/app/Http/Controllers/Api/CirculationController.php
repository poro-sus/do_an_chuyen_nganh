<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fine;
use App\Models\FinePayment;
use App\Models\Loan;
use App\Models\LoanRenewal;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Audit;
use App\Services\CirculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class CirculationController extends Controller
{
    public function __construct(private CirculationService $service) {}

    public function loans(Request $r): JsonResponse
    {
        $q = Loan::with(['book.authors', 'copy', 'user:id,name,member_code', 'renewals', 'fines']);
        if (! $r->user()->can('loans.approve')) {
            $q->where('user_id', $r->user()->id);
        }
        if ($r->filled('status')) {
            if ($r->input('status') === 'overdue') {
                $q->where('status', 'active')->where('due_at', '<', now());
            } else {
                $q->where('status', $r->input('status'));
            }
        }
        if ($r->filled('search')) {
            $s = '%'.$r->input('search').'%';
            $q->where(fn ($b) => $b->whereHas('book', fn ($b) => $b->whereLike('title', $s))->orWhereHas('copy', fn ($c) => $c->whereLike('barcode', $s))->orWhereHas('user', fn ($u) => $u->whereLike('name', $s)));
        }

        return JsonResource::collection($q->latest()->paginate(20))->response();
    }

    public function request(Request $r): JsonResponse
    {
        $d = $r->validate(['book_id' => 'required|exists:books,id', 'user_id' => 'nullable|exists:users,id']);
        $user = $r->user();
        if (! empty($d['user_id']) && $d['user_id'] !== $user->id) {
            abort_unless($user->can('loans.approve'), 403);
            $user = User::findOrFail($d['user_id']);
        }

        return response()->json(['data' => $this->service->request($d['book_id'], $user)], 201);
    }

    public function action(Request $r, Loan $loan, string $action): JsonResponse
    {
        if ($action === 'cancel') {
            Gate::authorize('cancel', $loan);
            $result = $this->service->close($loan, 'cancelled', $r->user());
        } elseif ($action === 'renew') {
            Gate::authorize('view', $loan);
            $result = $this->service->requestRenewal($loan);
        } else {
            abort_unless($r->user()->can($action === 'return' ? 'loans.return' : 'loans.approve'), 403);
            $r->validate(['copy_id' => 'nullable|integer|exists:book_copies,id', 'reason' => ($action === 'reject' ? 'required' : 'nullable').'|string|max:2000', 'condition' => 'sometimes|in:good,worn,damaged,lost', 'damage_fee' => 'sometimes|integer|between:0,1000000000']);
            $result = match ($action) {
                'approve' => $this->service->approve($loan, $r->user(), $r->input('copy_id')),'handoff' => $this->service->handoff($loan, $r->user()),'reject' => $this->service->close($loan, 'rejected', $r->user(), $r->input('reason')),'return' => $this->service->returnBook($loan, $r->user(), $r->input('condition', 'good'), $r->integer('damage_fee')),default => abort(404)
            };
        }

        return response()->json(['data' => $result]);
    }

    public function renewals(Request $r): JsonResponse
    {
        $q = LoanRenewal::with(['loan.book', 'loan.user:id,name,member_code']);
        if ($r->filled('status')) {
            $q->where('status', $r->input('status'));
        }

        return JsonResource::collection($q->latest()->paginate(20))->response();
    }

    public function renewalDecision(Request $r, LoanRenewal $renewal): JsonResponse
    {
        $d = $r->validate(['approve' => 'required|boolean', 'reason' => 'nullable|string|max:2000']);

        return response()->json(['data' => $this->service->decideRenewal($renewal, $r->user(), $d['approve'], $d['reason'] ?? null)]);
    }

    public function reservations(Request $r): JsonResponse
    {
        $q = Reservation::with(['book.authors', 'user:id,name,member_code', 'copy'])->select('reservations.*')->selectSub(function ($s) {
            $s->from('reservations as earlier')->selectRaw('COUNT(*) + 1')->whereColumn('earlier.book_id', 'reservations.book_id')->whereIn('earlier.status', ['waiting', 'ready'])->where(function ($s) {
                $s->whereColumn('earlier.created_at', '<', 'reservations.created_at')->orWhere(fn ($s) => $s->whereColumn('earlier.created_at', 'reservations.created_at')->whereColumn('earlier.id', '<', 'reservations.id'));
            });
        }, 'queue_position');
        if (! $r->user()->can('loans.approve')) {
            $q->where('user_id', $r->user()->id);
        } if ($r->filled('status')) {
            $q->where('status', $r->input('status'));
        }

        return JsonResource::collection($q->latest()->paginate(20))->response();
    }

    public function reserve(Request $r): JsonResponse
    {
        $r->validate(['book_id' => 'required|exists:books,id']);

        return response()->json(['data' => $this->service->reserve($r->integer('book_id'), $r->user())], 201);
    }

    public function cancelReservation(Request $r, Reservation $reservation): JsonResponse
    {
        abort_unless($reservation->user_id === $r->user()->id || $r->user()->can('loans.approve'), 403);

        return response()->json(['data' => $this->service->cancelReservation($reservation)]);
    }

    public function fines(Request $r): JsonResponse
    {
        $q = Fine::with(['loan.book', 'user:id,name,member_code', 'payments']);
        if (! $r->user()->can('fines.collect')) {
            $q->where('user_id', $r->user()->id);
        } if ($r->input('status') === 'unpaid') {
            $q->whereRaw('amount > paid_amount + waived_amount');
        }

        return JsonResource::collection($q->latest()->paginate(20))->response();
    }

    public function pay(Request $r, Fine $fine): JsonResponse
    {
        $d = $r->validate(['amount' => 'required|integer|min:1', 'type' => 'required|in:payment,waiver', 'note' => 'required|string|max:500']);
        if ($d['type'] === 'waiver') {
            abort_unless($r->user()->can('fines.waive'), 403);
        }
        DB::transaction(function () use ($fine, $r, $d) {
            $fine = Fine::whereKey($fine->id)->lockForUpdate()->firstOrFail();
            abort_if($d['amount'] > $fine->amount - $fine->paid_amount - $fine->waived_amount, 422, 'Số tiền vượt quá dư nợ.');
            FinePayment::create($d + ['fine_id' => $fine->id, 'handled_by' => $r->user()->id]);
            $field = $d['type'] === 'waiver' ? 'waived_amount' : 'paid_amount';
            $fine->increment($field, $d['amount']);
            Audit::log('fines.'.$d['type'], $fine->id, $d);
        });

        return response()->json(['data' => $fine->fresh()]);
    }
}
