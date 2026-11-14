<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Services\MomoSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PayRedeemController extends Controller
{
    public function __construct(
        protected MomoSettlementService $settlement,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_id' => ['required', 'string'],
            'amount_usdt' => ['required', 'numeric', 'gt:0'],
            'fiat_amount' => ['required', 'numeric', 'gt:0', 'regex:/^\d+(\.\d{1,2})?$/'],
            'currency' => ['nullable', 'string', 'size:3'],
            'phone' => ['required', 'string'],
            'provider' => ['nullable', 'string'],
            'payment_method_id' => ['required', 'integer', 'exists:payment_methods,id'],
        ]);

        $user = $request->user();

        /** @var PaymentMethod $method */
        $method = PaymentMethod::query()
            ->with('country.currency')
            ->findOrFail($data['payment_method_id']);

        if (! $method->pawapay_provider || ! $method->country_id) {
            throw ValidationException::withMessages([
                'payment_method_id' => 'Selected mobile network is not linked to a PawaPay country provider.',
            ]);
        }

        // Recipient country (via its network) determines payout currency.
        $currency = strtoupper((string) ($method->country?->currency?->currency_slug ?? ''));
        if (strlen($currency) !== 3) {
            throw ValidationException::withMessages([
                'payment_method_id' => 'Could not resolve currency for the recipient country.',
            ]);
        }

        try {
            $transfer = $this->settlement->startPayRedeemPayout(
                $user,
                $data['payment_id'],
                (string) $data['amount_usdt'],
                $data['phone'],
                $method->pawapay_provider,
                $currency,
                // Max 2dp from the form; provider-aware rounding still applied for PawaPay.
                number_format((float) $data['fiat_amount'], 2, '.', ''),
            );
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage() ?: 'MoMo payout failed.',
            ], 422);
        }

        return response()->json([
            'transfer' => $transfer,
            'message' => 'MoMo payout initiated. Waiting for confirmation before on-chain settle.',
        ]);
    }
}
