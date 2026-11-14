<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\FiatWallet;
use App\Models\User;
use App\Services\WalletService;

$users = User::query()
    ->whereNotNull('country_id')
    ->whereNotNull('payment_method_id')
    ->limit(5)
    ->get();

$svc = app(WalletService::class);
foreach ($users as $user) {
    $wallet = $svc->ensureWalletForCountry($user, (int) $user->country_id);
    echo "user={$user->id} country={$user->country_id} wallet={$wallet?->id} currency={$wallet?->currency} bal={$wallet?->balance}\n";
}

echo "total_wallets=".FiatWallet::query()->count()."\n";
foreach (FiatWallet::query()->orderBy('id')->get() as $fw) {
    echo "  #{$fw->id} user={$fw->user_id} {$fw->currency} bal={$fw->balance} country={$fw->country_id}\n";
}
