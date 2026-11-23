<?php

use App\Models\Loan;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Validation\ValidationException;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (config('database.connections.mysql.database') !== 'librivo_test') {
    throw new RuntimeException('Worker only accepts librivo_test');
}
echo "READY\n";
try {
    $loan = Loan::findOrFail((int) $argv[2]);
    $staff = User::findOrFail((int) $argv[3]);
    $service = app(CirculationService::class);
    if ($argv[1] === 'return') {
        $service->returnBook($loan, $staff);
    } else {
        $service->approve($loan, $staff);
    }
    echo "SUCCESS\n";
} catch (ValidationException $e) {
    echo "REJECTED\n";
}
