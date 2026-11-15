<?php

use App\Http\Controllers\BuyOrderController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\PawaPayWebhookController;
use App\Http\Controllers\PayRedeemController;
use App\Http\Controllers\TradeController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\Web3\Web3AuthController;
use App\Models\BuyOrder;
use App\Models\Token;
use App\Services\ListingCatalog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/health', function () {
    return response('ok', 200)->header('Content-Type', 'text/plain');
})->name('health');

Route::get('/', function (ListingCatalog $listings) {
    $momoOffers = BuyOrder::query()
        ->with(['user:id,name,eth_address'])
        ->where('status', BuyOrder::STATUS_OPEN)
        ->orderByDesc('id')
        ->limit(6)
        ->get()
        ->map(fn (BuyOrder $order) => [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'buyer_address' => $order->buyer_address,
            'currency' => $order->currency,
            'fiat_amount' => (string) $order->fiat_amount,
            'usdt_amount' => (string) $order->usdt_amount,
            'unit_price' => (string) $order->unit_price,
            'status' => $order->status,
            'momo_transfer_id' => $order->momo_transfer_id
                ? (int) $order->momo_transfer_id
                : null,
            'transaction_id' => $order->transaction_id,
            'filler_user_id' => $order->filler_user_id,
            'lister_name' => $order->user?->name,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
        ]);

    return Inertia::render('Welcome', [
        'all_transactions' => $listings->open()->take(6)->values(),
        'momo_offers' => $momoOffers->values(),
        'tokens' => Token::all(),
    ]);
})->name('home');

Route::get('/listings', [MarketplaceController::class, 'index'])->name('listings');

Route::get('/momo-offers', [BuyOrderController::class, 'index'])->name('buy_orders.index');

Route::get('/pay', [PayRedeemController::class, 'page'])->name('pay');

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
    Route::post('/trades/{transaction}/clear-buyer', [TradeController::class, 'clearBuyerRequest'])
        ->name('trades.clear_buyer');
    Route::post('/trades/{transaction}/cancel', [TradeController::class, 'cancelListing'])
        ->name('trades.cancel');
    Route::post('/trades/{transaction}/expire-reservation', [TradeController::class, 'expireReservation'])
        ->name('trades.expire_reservation');
    Route::post('/trades/{transaction}/confirm-reserve', [TradeController::class, 'confirmReserve'])
        ->name('trades.confirm_reserve');
    Route::post('/trades/{transaction}/sync-onchain', [TradeController::class, 'syncOnchain'])
        ->name('trades.sync_onchain');
    Route::post('/trades/{transaction}/start-deposit', [TradeController::class, 'startDeposit'])
        ->name('trades.start_deposit');
    Route::get('/momo-transfers/{transfer}', [TradeController::class, 'transferStatus'])
        ->name('momo_transfers.status');

    Route::get('/pay/history', [PayRedeemController::class, 'history'])->name('pay.history');
    Route::post('/pay-redeem', [PayRedeemController::class, 'store'])->name('pay_redeem.store');

    Route::post('/wallet/withdraw', [WalletController::class, 'withdraw'])
        ->name('wallet.withdraw');

    Route::post('/momo-offers', [BuyOrderController::class, 'store'])
        ->name('buy_orders.store');
    Route::post('/momo-offers/{buyOrder}/cancel', [BuyOrderController::class, 'cancel'])
        ->name('buy_orders.cancel');
    Route::post('/momo-offers/{buyOrder}/fill', [BuyOrderController::class, 'fill'])
        ->name('buy_orders.fill');
});

Route::get('/metamask-login', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }

    return view('auth.metamask-login');
});

Route::get('/eth/signature', [Web3AuthController::class, 'signature'])->name('metamask.signature');
Route::post('/eth/authenticate', [Web3AuthController::class, 'authenticate'])->name('metamask.authenticate');
