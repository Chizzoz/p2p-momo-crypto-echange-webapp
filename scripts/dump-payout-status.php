<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$id = $argv[1] ?? '776c082b-5578-4003-8a1e-177899b67400';
$r = Chizzoz\PawaPay\Facades\PawaPay::checkPayoutStatus($id);
echo json_encode($r, JSON_PRETTY_PRINT) . PHP_EOL;
