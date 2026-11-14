<?php

/**
 * Sandbox helper: mark MoMo deposit COMPLETED and open a Sell MoMo offer.
 * Usage: ddev exec php scripts/force-open-buy-order.php [buy_order_id]
 */

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BuyOrder;
use App\Models\MomoTransfer;
use App\Services\BuyOrderService;

$id = isset($argv[1]) ? (int) $argv[1] : 1;
$order = BuyOrder::query()->with('momoTransfer')->find($id);
if (! $order) {
    echo "Buy order {$id} not found\n";
    exit(1);
}

$transfer = $order->momoTransfer;
if ($transfer && ! $transfer->isTerminal()) {
    $transfer->markStatus(MomoTransfer::STATUS_COMPLETED);
    echo "Marked momo xfer#{$transfer->id} COMPLETED\n";
}

$svc = app(BuyOrderService::class);
$order = $svc->openOrderAfterMomo($order->fresh(), $transfer?->fresh() ?? $order->momoTransfer);
echo "order#{$order->id} status={$order->status}\n";
