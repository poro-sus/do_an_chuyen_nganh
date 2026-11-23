<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Console\Command;

class CleanupBrowserFixtures extends Command
{
    protected $signature = 'library:archive-e2e';

    protected $description = 'Archive timestamped local browser-test books while preserving circulation history';

    public function handle(CirculationService $service): int
    {
        if (! app()->environment('local')) {
            $this->error('This command is restricted to the local environment.');

            return self::FAILURE;
        }
        $actor = User::where('email', 'admin@librivo.local')->firstOrFail();
        $count = 0;
        foreach (Book::withTrashed()->where('title', 'like', 'Hành trình LIBRIVO E2E %')->get() as $book) {
            if (! preg_match('/^Hành trình LIBRIVO E2E [0-9]{13}$/u', $book->title)) {
                continue;
            }
            foreach ($book->loans()->whereIn('status', ['requested', 'approved', 'active'])->get() as $loan) {
                if ($loan->status === 'active') {
                    $service->returnBook($loan, $actor);
                } else {
                    $service->close($loan, 'cancelled', $actor, 'Local browser test cleanup');
                }
            }
            foreach ($book->reservations()->whereIn('status', ['waiting', 'ready'])->get() as $reservation) {
                $service->cancelReservation($reservation);
            }
            $book->copies()->where('status', 'available')->update(['status' => 'maintenance', 'notes' => 'Archived local browser-test book']);
            $book->update(['visible' => false]);
            if (! $book->trashed()) {
                $book->delete();
            }
            $count++;
        }
        $this->info('Archived '.$count.' local browser-test books. History retained.');

        return self::SUCCESS;
    }
}
