<?php

namespace App\Http\Controllers;

use App\Models\MomoTransfer;
use App\Models\Transaction;
use App\Services\MomoSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TradeController extends Controller
{
    public function __construct(
        protected MomoSettlementService $settlement,
    ) {}

    /**
     * Buyer declares intent. Seller must then call on-chain reserve(buyer).
     */
    public function requestBuy(Request $request, Transaction $transaction): JsonResponse
    {
        $data = $request->validate([
            'buyer' => ['required', 'string', 'size:42'],
        ]);

        $user = $request->user();
        if (! $user->hasBoundMomoAccount()) {
            return response()->json([
                'message' => 'Bind your mobile money profile before buying.',
            ], 422);
        }

        if (strtolower((string) $user->eth_address) !== strtolower($data['buyer'])) {
            return response()->json([
                'message' => 'Buyer address must match your connected wallet.',
            ], 422);
        }

        if ((int) $transaction->status !== 0) {
            return response()->json([
                'message' => 'This listing is not open for purchase.',
            ], 422);
        }

        if ($transaction->user_id === $user->id) {
            return response()->json([
                'message' => 'You cannot buy your own listing.',
            ], 422);
        }

        $transaction->update([
            'reserved_buyer' => $data['buyer'],
        ]);

        return response()->json([
            'transaction' => $transaction->fresh(),
            'message' => 'Buy requested. Waiting for the seller to reserve this listing for your wallet on-chain.',
            'next' => 'seller_reserve',
        ]);
    }

    /**
     * After on-chain reserve, start PawaPay MoMo deposit for the buyer.
     */
    public function startDeposit(Request $request, Transaction $transaction): JsonResponse
    {
        $data = $request->validate([
            'buyer' => ['required', 'string', 'size:42'],
            'reservation_id' => ['required'],
            'transaction_key' => ['required', 'numeric'],
            'transaction_number' => ['required', 'string'],
            'depositor' => ['required', 'string', 'size:42'],
        ]);

        $user = $request->user();
        if (! $user->hasBoundMomoAccount()) {
            return response()->json([
                'message' => 'Bind your mobile money profile before buying.',
            ], 422);
        }

        if (strtolower((string) $user->eth_address) !== strtolower($data['buyer'])) {
            return response()->json([
                'message' => 'Buyer address must match your connected wallet.',
            ], 422);
        }

        if ($transaction->momo_deposit_id) {
            return response()->json([
                'transfer' => $transaction->momoDeposit,
                'message' => 'MoMo deposit already started.',
            ]);
        }

        $transfer = $this->settlement->startP2pBuyDeposit($user, $transaction, [
            'buyer' => $data['buyer'],
            'reservationId' => $data['reservation_id'],
            'transactionKey' => $data['transaction_key'],
            'transactionNumber' => $data['transaction_number'],
            'depositor' => $data['depositor'],
        ]);

        return response()->json([
            'transfer' => $transfer,
            'message' => 'Approve the MoMo PIN prompt on your phone to complete payment.',
        ]);
    }

    public function transferStatus(Request $request, MomoTransfer $transfer): JsonResponse
    {
        if ($transfer->user_id && $transfer->user_id !== $request->user()?->id) {
            abort(403);
        }

        $fresh = $this->settlement->syncTransferStatus($transfer);

        return response()->json(['transfer' => $fresh]);
    }
}
