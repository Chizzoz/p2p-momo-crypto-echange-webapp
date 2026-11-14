<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$s = app(App\Services\MomoSettlementService::class);
$b = app(App\Services\BuyOrderService::class);
echo 'ok '.get_class($s).' / '.get_class($b)."\n";
echo 'buy_orders='.App\Models\BuyOrder::query()->count()."\n";
