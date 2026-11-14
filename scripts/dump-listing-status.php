<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$rows = DB::table('transactions')
    ->leftJoin('users', 'users.id', '=', 'transactions.user_id')
    ->select(
        'transactions.id',
        'transactions.transaction_key',
        'transactions.transaction_number',
        'transactions.status',
        'transactions.reserved_buyer',
        'transactions.reservation_id',
        'transactions.amount',
        'transactions.updated_at',
        'users.name',
        'users.eth_address'
    )
    ->orderByDesc('transactions.id')
    ->limit(10)
    ->get();

foreach ($rows as $r) {
    echo json_encode($r) . "\n";
}
