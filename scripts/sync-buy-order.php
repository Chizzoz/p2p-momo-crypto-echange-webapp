<?php

/**
 * Sync MoMo status for a Sell MoMo order (or latest).
 * Usage: ddev exec php scripts/sync-buy-order.php [buy_order_id]
 */

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BuyOrder;
use App\Services\MomoSettlementService;

$id = isset($argv[1]) ? (int) $argv[1] : null;
$order = $id
    ? BuyOrder::query()->with('momoTransfer')->find($id)
    : BuyOrder::query()->with('momoTransfer')->orderByDesc('id')->first();

if (! $order) {
    echo "No buy order found\n";
    exit(1);
}

echo "order#{$order->id} status={$order->status} momo={$order->momo_transfer_id}\n";
$transfer = $order->momoTransfer;
if (! $transfer) {
    echo "No momo transfer\n";
    exit(1);
}

echo "xfer#{$transfer->id} status={$transfer->status} pawapay={$transfer->pawapay_id}\n";

$settlement = app(MomoSettlementService::class);
$fresh = $settlement->syncTransferStatus($transfer);
$order = $order->fresh();

echo "after sync: xfer={$fresh->status} order={$order->status}\n";
