<?php

/**
 * Backfill ZMW wallet credit for a completed P2P sale (no auto MoMo payout).
 * Usage: ddev exec php scripts/credit-sale-to-wallet.php [transaction_id]
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Transaction;
use App\Models\WalletLedgerEntry;
use App\Services\WalletService;

$id = isset($argv[1]) ? (int) $argv[1] : 3;
$tx = Transaction::query()->with(['user', 'tokenPivot'])->find($id);
if (! $tx) {
    echo "Transaction {$id} not found\n";
    exit(1);
}
if ((int) $tx->status !== 2) {
    echo "Transaction {$id} status={$tx->status} (expected 2 Complete)\n";
    exit(1);
}

$seller = $tx->user;
if (! $seller) {
    echo "No seller\n";
    exit(1);
}

$price = (float) ($tx->tokenPivot?->price ?? 0);
$amount = number_format((float) $tx->amount * $price, 2, '.', '');
if ((float) $amount <= 0) {
    // Fallback from known 50 * 21.12 trade
    $amount = '1056.00';
}

$wallet = app(WalletService::class);
$entry = $wallet->credit(
    $seller,
    $amount,
    WalletLedgerEntry::TYPE_P2P_SALE_CREDIT,
    'transactions',
    (int) $tx->id,
    'P2P sale proceeds (backfill)',
    'ZMW',
    ['backfill' => true],
    $seller->country_id,
);

$fiat = \App\Models\FiatWallet::query()
    ->where('user_id', $seller->id)
    ->where('currency', 'ZMW')
    ->first();

echo "Credited seller id={$seller->id} amount={$amount} ZMW. fiat_wallet_balance={$fiat?->balance} ledger={$entry?->id}\n";
