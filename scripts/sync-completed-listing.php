<?php

/**
 * Mark DB listings Complete when on-chain escrow is already Complete.
 * Usage: ddev exec php scripts/sync-completed-listing.php [listing_id]
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;

$id = isset($argv[1]) ? (int) $argv[1] : 3;
$tx = Transaction::query()->find($id);
if (! $tx) {
    echo "Listing {$id} not found\n";
    exit(1);
}

echo "Before: id={$tx->id} status={$tx->status} reservation={$tx->reservation_id}\n";
$tx->update(['status' => 2]);
echo "After: status=2 (Complete). Refresh the dashboard.\n";
