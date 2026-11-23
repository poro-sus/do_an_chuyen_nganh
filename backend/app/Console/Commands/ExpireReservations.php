<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use App\Services\CirculationService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

class ExpireReservations extends Command
{
    protected $signature = 'library:expire-holds';

    protected $description = 'Expire unclaimed holds and advance FIFO reservation queues';

    public function handle(CirculationService $service): int
    {
        $count = 0;
        Reservation::where('status', 'ready')->where('expires_at', '<', now())->chunkById(100, function ($items) use ($service, &$count) {
            foreach ($items as $item) {
                try {
                    $service->cancelReservation($item, 'expired');
                    $count++;
                } catch (ValidationException $e) {
                    report($e);
                }
            }
        });
        $this->info('Expired '.$count.' holds.');

        return self::SUCCESS;
    }
}
