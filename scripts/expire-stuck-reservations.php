<?php

/**
 * Expire on-chain reservations that have timed out and reopen DB listings.
 * Usage: ddev exec php scripts/expire-stuck-reservations.php
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;
use App\Models\User;
use App\Services\EmpiyaOperatorService;
use Illuminate\Support\Facades\DB;

$operator = app(EmpiyaOperatorService::class);

$rows = Transaction::query()
    ->where('status', 1)
    ->whereNotNull('reservation_id')
    ->orderBy('id')
    ->get();

if ($rows->isEmpty()) {
    echo "No processing reservations in DB.\n";
    exit(0);
}

foreach ($rows as $tx) {
    $seller = User::query()->find($tx->user_id);
    $depositor = $seller?->eth_address;
    echo "listing id={$tx->id} key={$tx->transaction_key} reservation={$tx->reservation_id} depositor={$depositor}\n";

    if (! $depositor || ! $tx->transaction_number) {
        echo "  skip: missing depositor or transaction_number\n";
        continue;
    }

    try {
        $result = $operator->expireReservation(
            $depositor,
            $tx->transaction_key,
            (string) $tx->transaction_number,
        );
        $tx->update([
            'status' => 0,
            'reserved_buyer' => null,
            'reservation_id' => null,
            'momo_deposit_id' => null,
        ]);
        echo '  expired ok hash=' . ($result['hash'] ?? '?') . " — reopened in DB\n";
    } catch (Throwable $e) {
        echo '  failed: ' . $e->getMessage() . "\n";
        // If already open on-chain, still repair DB.
        if (str_contains(strtolower($e->getMessage()), 'not reserved')) {
            $tx->update([
                'status' => 0,
                'reserved_buyer' => null,
                'reservation_id' => null,
                'momo_deposit_id' => null,
            ]);
            echo "  DB reopened (on-chain already open)\n";
        }
    }
}

echo "Done.\n";
