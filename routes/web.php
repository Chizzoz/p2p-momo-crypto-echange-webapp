<?php

use App\Http\Controllers\PawaPayWebhookController;
use App\Http\Controllers\PayRedeemController;
use App\Http\Controllers\TradeController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\Web3\Web3AuthController;
use App\Models\Token;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/health', function () {
    return response('ok', 200)->header('Content-Type', 'text/plain');
})->name('health');

Route::get('/', function () {
    $all_transactions = DB::table('transactions')
        ->leftJoin('users', 'users.id', '=', 'transactions.user_id')
        ->leftJoin('transaction_tokens', 'transactions.id', '=', 'transaction_tokens.transaction_id')
        ->leftJoin('tokens', 'transaction_tokens.token_id', '=', 'tokens.id')
        ->select(
            'transactions.id as listing_id',
            'transactions.user_id',
            'transactions.transaction_key',
            'transactions.transaction_number',
            'transactions.amount',
            'transactions.status',
            'transactions.recipient',
            'transactions.reserved_buyer',
            'transactions.reservation_id',
            'users.name',
            'users.eth_address',
            'transaction_tokens.token_id',
            'transaction_tokens.price',
            'tokens.token',
            'tokens.symbol'
        )
        ->orderBy('transactions.created_at', 'desc')
        ->get();

    $tokens = Token::all();

    $data['all_transactions'] = $all_transactions;
    $data['tokens'] = $tokens;

    return Inertia::render('Welcome', $data);
})->name('home');

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
    Route::get('/dashboard', function () {
        $transactions_by_user = DB::table('transactions')
            ->leftJoin('users', 'users.id', '=', 'transactions.user_id')
            ->leftJoin('transaction_tokens', 'transactions.id', '=', 'transaction_tokens.transaction_id')
            ->leftJoin('tokens', 'transaction_tokens.token_id', '=', 'tokens.id')
            ->select('transactions.*', 'users.*', 'transaction_tokens.*', 'tokens.*')
            ->orderBy('transactions.created_at', 'desc')
            ->where('transactions.user_id', auth()->user()->id)
            ->get();

        return Inertia::render('Dashboard', [
            'transactions_by_user' => $transactions_by_user,
        ]);
    })->name('dashboard');

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
