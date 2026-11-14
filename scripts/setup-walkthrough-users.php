<?php

/**
 * Seed seller + buyer accounts for Playwright walkthrough videos.
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\PaymentMethod;
use App\Models\Transaction;
use App\Models\TransactionToken;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

$mtn = PaymentMethod::query()
    ->where('pawapay_provider', 'MTN_MOMO_ZMB')
    ->first();

if (! $mtn) {
    fwrite(STDERR, "MTN_MOMO_ZMB payment method missing. Seed payment methods first.\n");
    exit(1);
}

$password = 'password';

$specs = [
    'seller' => [
        'name' => 'Walkthrough Seller',
        'email' => 'seller@empiya.test',
        'eth_address' => '0x6102118dda3E57d5D1c29A84ee7410A0E160DaBc',
        'mobile_number' => '260763456789',
    ],
    'buyer' => [
        'name' => 'Walkthrough Buyer',
        'email' => 'buyer@empiya.test',
        'eth_address' => '0xF27503d9781a6243224B822ADf9be9f6765B3B6a',
        'mobile_number' => '260973456789',
    ],
];

foreach ($specs as $role => $data) {
    $user = User::query()
        ->where('email', $data['email'])
        ->orWhereRaw('LOWER(eth_address) = ?', [strtolower($data['eth_address'])])
        ->first();

    if (! $user) {
        $user = new User();
    }

    $user->fill([
        'name' => $data['name'],
        'email' => $data['email'],
        'password' => Hash::make($password),
        'eth_address' => $data['eth_address'],
        'mobile_number' => $data['mobile_number'],
        'country_id' => $mtn->country_id,
        'payment_method_id' => $mtn->id,
    ]);
    $user->email_verified_at = $user->email_verified_at ?: now();
    $user->save();

    echo strtoupper($role)." id={$user->id} email={$user->email} eth={$user->eth_address}\n";
}

$seller = User::query()->where('email', 'seller@empiya.test')->firstOrFail();
$tokenId = (int) (DB::table('tokens')->orderBy('id')->value('id') ?: 1);

$listing = Transaction::query()->firstOrCreate(
    [
        'user_id' => $seller->id,
        'transaction_number' => '0x'.str_pad('walkthrough1', 64, '0'),
    ],
    [
        'transaction_key' => 0,
        'amount' => 25,
        'status' => 0,
        'recipient' => '0x0000000000000000000000000000000000000000',
    ]
);

// Ensure it stays open for the buy walkthrough.
$listing->update([
    'status' => 0,
    'reserved_buyer' => null,
    'reservation_id' => null,
]);

TransactionToken::query()->updateOrCreate(
    ['transaction_id' => $listing->id],
    [
        'token_id' => $tokenId,
        'price' => 27.5,
    ]
);

echo "demo listing id={$listing->id} status={$listing->status} amount={$listing->amount}\n";
echo "password for both users: {$password}\n";
