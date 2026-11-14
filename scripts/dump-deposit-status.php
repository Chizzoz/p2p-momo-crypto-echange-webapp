<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$id = $argv[1] ?? '58eb6d4c-8742-4068-9f86-a740e092aaa3';
$r = Chizzoz\PawaPay\Facades\PawaPay::checkDepositStatus($id);
echo json_encode($r, JSON_PRETTY_PRINT) . PHP_EOL;
