<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\FiatWallet;
use App\Models\PaymentMethod;
use App\Services\MomoSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(
        protected MomoSettlementService $settlement,
    ) {}

    public function withdraw(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'phone' => ['required', 'string', 'max:32'],
            'payment_method_id' => ['required', 'integer', 'exists:payment_methods,id'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $user = $request->user();
        /** @var PaymentMethod $method */
        $method = PaymentMethod::query()->with('country.currency')->findOrFail($data['payment_method_id']);

        if (! $method->country_id || ! $method->pawapay_provider) {
            return response()->json([
                'message' => 'Selected mobile network is not linked to a PawaPay country provider.',
            ], 422);
        }

        $methodCurrency = strtoupper((string) ($method->country?->currency?->currency_slug ?? ''));
        $currency = strtoupper((string) ($data['currency'] ?? $methodCurrency));
        if (strlen($currency) !== 3) {
            return response()->json([
                'message' => 'Could not resolve currency for this mobile network.',
            ], 422);
        }

        if ($methodCurrency && $methodCurrency !== $currency) {
            return response()->json([
                'message' => "Network currency ({$methodCurrency}) does not match wallet currency ({$currency}).",
            ], 422);
        }

        $wallet = FiatWallet::query()
            ->where('user_id', $user->id)
            ->where('currency', $currency)
            ->first();

        if (! $wallet) {
            return response()->json([
                'message' => "No {$currency} wallet yet. Connect a MoMo number for a {$currency} country first.",
            ], 422);
        }

        // Withdrawals must use a network in the wallet's country (or any country for that currency).
        if ($wallet->country_id && (int) $method->country_id !== (int) $wallet->country_id) {
            $walletCountry = Country::query()->find($wallet->country_id);
            $sameCurrencyOk = $methodCurrency === $currency;
            if (! $sameCurrencyOk) {
                return response()->json([
                    'message' => 'Choose a mobile network that supports '.$currency
                        .($walletCountry ? ' ('.$walletCountry->name.')' : '').'.',
                ], 422);
            }
        }

        try {
            $transfer = $this->settlement->startWalletWithdraw(
                $user,
                (string) $data['amount'],
                preg_replace('/\s+/', '', $data['phone']) ?: $data['phone'],
                $method,
                $currency,
            );
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $wallets = FiatWallet::query()
            ->where('user_id', $user->id)
            ->orderBy('currency')
            ->get(['id', 'currency', 'country_id', 'balance']);

        return response()->json([
            'transfer' => $transfer,
            'wallets' => $wallets,
            'account_balance' => $wallets->firstWhere('currency', 'ZMW')?->balance
                ?? $user->fresh()->account_balance,
            'message' => 'Withdraw started — approve the MoMo prompt on the recipient phone if required.',
        ]);
    }
}
