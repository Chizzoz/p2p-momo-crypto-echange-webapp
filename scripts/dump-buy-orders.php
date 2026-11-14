<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BuyOrder;
use App\Models\MomoTransfer;

echo "QUEUE=".config('queue.default')."\n";
foreach (BuyOrder::query()->orderByDesc('id')->limit(5)->get() as $o) {
    echo "order#{$o->id} status={$o->status} fiat={$o->fiat_amount} usdt={$o->usdt_amount} momo={$o->momo_transfer_id}\n";
}
foreach (MomoTransfer::query()->where('purpose', 'p2p_buy_order')->orderByDesc('id')->limit(5)->get() as $t) {
    echo "xfer#{$t->id} status={$t->status} pawapay={$t->pawapay_id} amount={$t->amount}\n";
}
