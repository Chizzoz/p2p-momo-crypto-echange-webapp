<?php

use App\Http\Controllers\TransactionController;
use App\Http\Controllers\Web3\Web3AuthController;
use App\Models\Token;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/health', function () {
    return response('ok', 200)->header('Content-Type', 'text/plain');
})->name('health');

Route::get('/', function () {
    $all_transactions = DB::table('transactions')->leftJoin('users', 'users.id', '=', 'transactions.user_id')->leftJoin('transaction_tokens', 'transactions.id', '=', 'transaction_tokens.transaction_id')->leftJoin('tokens', 'transaction_tokens.token_id', '=', 'tokens.id')->select('transactions.*', 'users.*', 'transaction_tokens.*', 'tokens.*')->orderBy('transactions.created_at', 'desc')->get();

    $tokens = Token::all();

    // Assign variables to data
    $data['all_transactions'] = $all_transactions;
    $data['tokens'] = $tokens;

    return Inertia::render('Welcome', $data);
})->name('home');

Route::middleware([
    'auth:sanctum',
    config('jetstream.auth_session'),
    'verified',
])->group(function () {
    Route::get('/dashboard', function () {
        $transactions_by_user = DB::table('transactions')->leftJoin('users', 'users.id', '=', 'transactions.user_id')->leftJoin('transaction_tokens', 'transactions.id', '=', 'transaction_tokens.transaction_id')->leftJoin('tokens', 'transaction_tokens.token_id', '=', 'tokens.id')->select('transactions.*', 'users.*', 'transaction_tokens.*', 'tokens.*')->orderBy('transactions.created_at', 'desc')->where('transactions.user_id', auth()->user()->id)->get();

        // tokens / countries / payment_methods come from HandleInertiaRequests shared props.
        return Inertia::render('Dashboard', [
            'transactions_by_user' => $transactions_by_user,
        ]);
    })->name('dashboard');

    Route::post('/transaction/create/post', [TransactionController::class, 'store'])->name('store_transaction');
});

Route::get('/metamask-login', function () {
    if (Auth::check()) {
        return redirect()->route("dashboard");
    }
    return view('auth.metamask-login');
});

Route::get('/eth/signature', [Web3AuthController::class, 'signature'])->name('metamask.signature');
Route::post('/eth/authenticate', [Web3AuthController::class, 'authenticate'])->name('metamask.authenticate');
