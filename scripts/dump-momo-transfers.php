<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

foreach (DB::table('momo_transfers')->orderByDesc('id')->limit(15)->get() as $t) {
    echo json_encode($t) . "\n";
}
