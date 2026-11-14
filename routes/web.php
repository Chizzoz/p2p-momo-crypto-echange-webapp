<?php

use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\PawaPayWebhookController;
use App\Http\Controllers\PayRedeemController;
use App\Http\Controllers\TradeController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\Web3\Web3AuthController;
use App\Models\Token;
use App\Services\ListingCatalog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/health', function () {
    return response('ok', 200)->header('Content-Type', 'text/plain');
})->name('health');

Route::get('/', function (ListingCatalog $listings) {
    return Inertia::render('Welcome', [
        'all_transactions' => $listings->open()->take(6)->values(),
        'tokens' => Token::all(),
    ]);
})->name('home');

Route::get('/listings', [MarketplaceController::class, 'index'])->name('listings');

Route::get('/pay', function () {
    return Inertia::render('PayRedeem');
})->name('pay');

Route::post('/webhooks/pawapay/deposits', [PawaPayWebhookController::class, 'deposits'])
    ->name('webhooks.pawapay.deposits');
Route::post('/webhooks/pawapay/payouts', [PawaPayWebhookController::class, 'payouts'])
    ->name('webhooks.pawapay.payouts');

Route::middleware([
    'auth:sanctum',
    config('jetstream.auth_session'),
    'verified',
])->group(function () {
    Route::get('/dashboard', [MarketplaceController::class, 'dashboard'])
        ->name('dashboard');

    Route::post('/transaction/create/post', [TransactionController::class, 'store'])->name('store_transaction');

    Route::post('/trades/{transaction}/request-buy', [TradeController::class, 'requestBuy'])
        ->name('trades.request_buy');
    Route::post('/trades/{transaction}/start-deposit', [TradeController::class, 'startDeposit'])
        ->name('trades.start_deposit');
    Route::get('/momo-transfers/{transfer}', [TradeController::class, 'transferStatus'])
        ->name('momo_transfers.status');

    Route::post('/pay-redeem', [PayRedeemController::class, 'store'])->name('pay_redeem.store');
});

Route::get('/metamask-login', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }

    return view('auth.metamask-login');
});

Route::get('/eth/signature', [Web3AuthController::class, 'signature'])->name('metamask.signature');
Route::post('/eth/authenticate', [Web3AuthController::class, 'authenticate'])->name('metamask.authenticate');
