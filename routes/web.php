<?php

use App\Http\Controllers\TransactionController;
use App\Http\Controllers\Web3\Web3AuthController;
use App\Models\PaymentMethod;
use App\Models\Token;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Auth;
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

Route::get('/', function () {
    $tokens = Token::all();

    // Assign variables to data
    $data['tokens'] = $tokens;

    return Inertia::render('Welcome', $data);
})->name('home');

Route::middleware([
    'auth:sanctum',
    config('jetstream.auth_session'),
    'verified',
])->group(function () {
    Route::get('/dashboard', function () {
        $tokens = Token::all();
        $payment_methods = PaymentMethod::all();

        // Assign variables to data
        $data['tokens'] = $tokens;
        $data['payment_methods'] = $payment_methods;

        return Inertia::render('Dashboard', $data);
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
