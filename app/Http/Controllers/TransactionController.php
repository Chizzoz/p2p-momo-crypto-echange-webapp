<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\TransactionPaymentMethod;
use App\Models\TransactionToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransactionController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $transactions = DB::table('transactions')->leftJoin('users', 'users.id', '=', 'transactions.user_id')->leftJoin('transaction_tokens', 'transactions.id', '=', 'transaction_tokens.transaction_id')->select('transactions.*', 'users.*', 'transaction_tokens.*')->orderBy('transactions.created_at', 'desc')->get();
        $transaction_payment_menthods = TransactionPaymentMethod::all();

        /* pass variables to view */
        $data['transactions'] = $transactions;
        $data['transaction_payment_menthods'] = $transaction_payment_menthods;

        return Inertia::render('Welcome', $data);

    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        // Validation
        $this->validate(
            $request, [
                'transaction_key' => 'required|numeric',
                'transaction_number' => 'required|string',
                'amount' => 'required|numeric',
                'status' => 'nullable|numeric',
                'recipient' => 'nullable|string',
            ]
        );

        // Current User
        $user = auth()->user();

        if (Transaction::where('transaction_key', $request->transaction_key)->get()->isEmpty()) {
            // New Transaction
            $transaction = new Transaction;
            $transaction->user_id = $user->id;
            $transaction->transaction_key = $request->transaction_key;
            $transaction->transaction_number = $request->transaction_number;
            $transaction->amount = $request->amount;
            $transaction->status = $request->status;
            $transaction->recipient = $request->recipient;
            $transaction->save();

            // New Transaction Payment Method
            if($request->has('momo_payment')) {
                $transaction_payment_method = new TransactionPaymentMethod;
                $transaction_payment_method->transaction_id = $transaction->id;
                $transaction_payment_method->payment_method_id = 1;
                $transaction_payment_method->save();
            }

            if($request->has('card_payment')) {
                $transaction_payment_method = new TransactionPaymentMethod;
                $transaction_payment_method->transaction_id = $transaction->id;
                $transaction_payment_method->payment_method_id = 2;
                $transaction_payment_method->save();
            }

            // New Transaction Token
            $transaction_token = new TransactionToken;
            $transaction_token->transaction_id = $transaction->id;
            $transaction_token->token_id = $request->token_id;
            $transaction_token->price = $request->price;
            $transaction_token->save();

            return response()->json($transaction);
        } else {
            return response()->json(['message' => 'Transaction already exists.']);
        }
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Transaction  $transaction
     * @return \Illuminate\Http\Response
     */
    public function show(Transaction $transaction)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Models\Transaction  $transaction
     * @return \Illuminate\Http\Response
     */
    public function edit(Transaction $transaction)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Transaction  $transaction
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Transaction $transaction)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Transaction  $transaction
     * @return \Illuminate\Http\Response
     */
    public function destroy(Transaction $transaction)
    {
        //
    }
}
