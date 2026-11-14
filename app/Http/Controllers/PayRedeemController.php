<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Services\MomoSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'fiat_amount' => ['required', 'numeric', 'gt:0'],
            'currency' => ['required', 'string', 'size:3'],
            'phone' => ['required', 'string'],
            'provider' => ['required', 'string'],
            'payment_method_id' => ['nullable', 'integer', 'exists:payment_methods,id'],
        ]);

        $user = $request->user();

        if (! empty($data['payment_method_id'])) {
            $method = PaymentMethod::query()->find($data['payment_method_id']);
            if ($method?->pawapay_provider) {
                $data['provider'] = $method->pawapay_provider;
            }
        }

        $transfer = $this->settlement->startPayRedeemPayout(
            $user,
            $data['payment_id'],
            (string) $data['amount_usdt'],
            $data['phone'],
            $data['provider'],
            strtoupper($data['currency']),
            number_format((float) $data['fiat_amount'], 2, '.', ''),
        );

        return response()->json([
            'transfer' => $transfer,
            'message' => 'MoMo payout initiated. Waiting for confirmation before on-chain settle.',
        ]);
    }
}
