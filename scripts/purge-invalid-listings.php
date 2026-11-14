<?php

/**
 * Cancel/delete listings with invalid on-chain transaction_number (not bytes32 hex).
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;
use App\Models\TransactionToken;
use Illuminate\Support\Facades\DB;

$rows = DB::table('transactions')
    ->select('id', 'transaction_number', 'transaction_key', 'status', 'reserved_buyer', 'amount')
    ->orderByDesc('id')
    ->get();

$invalid = [];
foreach ($rows as $r) {
    $tn = (string) $r->transaction_number;
    $ok = (bool) preg_match('/^0x[0-9a-fA-F]{64}$/', $tn);
    echo sprintf(
        "id=%s key=%s status=%s amount=%s valid=%s tn=%s\n",
        $r->id,
        $r->transaction_key,
        $r->status,
        $r->amount,
        $ok ? 'yes' : 'NO',
        substr($tn, 0, 24) . (strlen($tn) > 24 ? '…' : '')
    );
    if (! $ok) {
        $invalid[] = (int) $r->id;
    }
}

if ($invalid === []) {
    echo "No invalid listings found.\n";
    exit(0);
}

foreach ($invalid as $id) {
    TransactionToken::query()->where('transaction_id', $id)->delete();
    Transaction::query()->where('id', $id)->delete();
    echo "deleted invalid listing id={$id}\n";
}

echo 'Done. Removed ' . count($invalid) . " listing(s).\n";
