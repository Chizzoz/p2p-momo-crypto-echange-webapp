<?php

namespace App\Http\Controllers;

use App\Models\MomoTransfer;
use App\Models\Transaction;
use App\Models\User;
use App\Services\EmpiyaOperatorService;
use App\Services\MomoSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class TradeController extends Controller
{
    public function __construct(
        protected MomoSettlementService $settlement,
        protected EmpiyaOperatorService $operator,
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
     * Seller (or the requesting buyer) clears a pending buy request before on-chain reserve.
     * Does not expire on-chain reservations — those need expireReservation / refund.
     */
    public function clearBuyerRequest(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user();
        $isSeller = $transaction->user_id === $user->id;
        $isPendingBuyer = $transaction->reserved_buyer
            && $user->eth_address
            && strtolower((string) $transaction->reserved_buyer) === strtolower((string) $user->eth_address);

        if (! $isSeller && ! $isPendingBuyer) {
            return response()->json([
                'message' => 'Only the seller or the requesting buyer can clear this request.',
            ], 403);
        }

        if ($transaction->reservation_id || (int) $transaction->status === 1) {
            return response()->json([
                'message' => 'This listing is already reserved on-chain. Wait for expiry/refund, or settle the trade — it cannot be cleared from a request alone.',
            ], 422);
        }

        if ((int) $transaction->status !== 0) {
            return response()->json([
                'message' => 'Only open listings can have a buyer request cleared.',
            ], 422);
        }

        if (! $transaction->reserved_buyer) {
            return response()->json([
                'message' => 'No pending buyer request on this listing.',
                'transaction' => $transaction->fresh(),
            ]);
        }

        $transaction->update([
            'reserved_buyer' => null,
        ]);

        return response()->json([
            'transaction' => $transaction->fresh(),
            'message' => 'Buyer request cleared. The listing is open for a new buyer.',
        ]);
    }

    /**
     * Seller cancels an open listing that is not reserved on-chain (e.g. demo/invalid rows).
     */
    public function cancelListing(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user();
        if ($transaction->user_id !== $user->id) {
            return response()->json([
                'message' => 'Only the listing seller can cancel this listing.',
            ], 403);
        }

        if ($transaction->reservation_id || (int) $transaction->status === 1) {
            return response()->json([
                'message' => 'This listing is reserved on-chain and cannot be cancelled from the app alone.',
            ], 422);
        }

        if ((int) $transaction->status !== 0) {
            return response()->json([
                'message' => 'Only open listings can be cancelled.',
            ], 422);
        }

        $transaction->update([
            'status' => 3, // Cancelled
            'reserved_buyer' => null,
            'reservation_id' => null,
        ]);

        return response()->json([
            'transaction' => $transaction->fresh(),
            'message' => 'Listing cancelled.',
        ]);
    }

    /**
     * After the on-chain reservation timeout (default 1h), reopen the listing for other buyers.
     * Uses the operator key so seller/buyer do not need to pay gas.
     */
    public function expireReservation(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user();
        $seller = User::query()->find($transaction->user_id);
        $isSeller = $transaction->user_id === $user->id;
        $isReservedBuyer = $transaction->reserved_buyer
            && $user->eth_address
            && strtolower((string) $transaction->reserved_buyer) === strtolower((string) $user->eth_address);

        if (! $isSeller && ! $isReservedBuyer) {
            return response()->json([
                'message' => 'Only the seller or reserved buyer can expire this reservation.',
            ], 403);
        }

        if ((int) $transaction->status !== 1 && ! $transaction->reservation_id) {
            return response()->json([
                'message' => 'This listing is not in a reserved state.',
            ], 422);
        }

        $depositor = $seller?->eth_address;
        if (! $depositor || ! $transaction->transaction_number) {
            return response()->json([
                'message' => 'Listing is missing on-chain identifiers.',
            ], 422);
        }

        $chainResult = null;
        try {
            $chainResult = $this->operator->expireReservation(
                $depositor,
                $transaction->transaction_key,
                (string) $transaction->transaction_number,
            );
        } catch (Throwable $e) {
            $msg = strtolower($e->getMessage());
            // Already open on-chain — still repair DB.
            if (
                ! str_contains($msg, 'not reserved')
                && ! str_contains($msg, 'has not expired')
                && ! str_contains($msg, 'already')
            ) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 422);
            }
            if (str_contains($msg, 'has not expired')) {
                return response()->json([
                    'message' => 'Reservation window has not elapsed yet (default 1 hour). Try again after the timeout, or complete MoMo payment first.',
                ], 422);
            }
        }

        $transaction->update([
            'status' => 0,
            'reserved_buyer' => null,
            'reservation_id' => null,
            'momo_deposit_id' => null,
        ]);

        return response()->json([
            'transaction' => $transaction->fresh(),
            'chain' => $chainResult,
            'message' => 'Reservation expired. Listing is open again for other buyers.',
        ]);
    }

    /**
     * Seller records a successful on-chain reserve so the UI stops offering Confirm buyer.
     */
    public function confirmReserve(Request $request, Transaction $transaction): JsonResponse
    {
        $data = $request->validate([
            'buyer' => ['required', 'string', 'size:42'],
            'reservation_id' => ['required'],
            'reserve_tx_hash' => ['nullable', 'string', 'max:80'],
        ]);

        $user = $request->user();
        if ($transaction->user_id !== $user->id) {
            return response()->json([
                'message' => 'Only the listing seller can confirm a reservation.',
            ], 403);
        }

        if (
            $transaction->reserved_buyer
            && strtolower((string) $transaction->reserved_buyer) !== strtolower($data['buyer'])
        ) {
            return response()->json([
                'message' => 'Buyer does not match the pending reservation request.',
            ], 422);
        }

        $transaction->update([
            'reserved_buyer' => $data['buyer'],
            'reservation_id' => (string) $data['reservation_id'],
            'status' => 1, // Processing — reserved on-chain
        ]);

        return response()->json([
            'transaction' => $transaction->fresh(),
            'message' => 'Buyer confirmed. Waiting for MoMo payment.',
            'reserve_tx_hash' => $data['reserve_tx_hash'] ?? null,
        ]);
    }

    /**
     * Align DB listing status with on-chain escrow (Open/Processing/Complete/Cancelled).
     */
    public function syncOnchain(Request $request, Transaction $transaction): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'integer', 'in:0,1,2,3'],
            'reservation_id' => ['nullable'],
            'reserved_buyer' => ['nullable', 'string', 'max:42'],
        ]);

        $user = $request->user();
        $isSeller = $transaction->user_id === $user->id;
        $isBuyer = $transaction->reserved_buyer
            && $user->eth_address
            && strtolower((string) $transaction->reserved_buyer) === strtolower((string) $user->eth_address);

        if (! $isSeller && ! $isBuyer) {
            return response()->json([
                'message' => 'Only the seller or reserved buyer can sync this listing.',
            ], 403);
        }

        $status = (int) $data['status'];
        $update = ['status' => $status];

        if ($status === 0) {
            $update['reserved_buyer'] = null;
            $update['reservation_id'] = null;
            $update['momo_deposit_id'] = null;
        } elseif ($status === 1) {
            if (! empty($data['reservation_id'])) {
                $update['reservation_id'] = (string) $data['reservation_id'];
            }
            if (! empty($data['reserved_buyer'])) {
                $update['reserved_buyer'] = $data['reserved_buyer'];
            }
        } elseif ($status === 2 || $status === 3) {
            // Keep reserved_buyer for history; reservation_id may still be useful.
            if (! empty($data['reservation_id'])) {
                $update['reservation_id'] = (string) $data['reservation_id'];
            }
        }

        $transaction->update($update);

        return response()->json([
            'transaction' => $transaction->fresh(),
            'message' => match ($status) {
                0 => 'Listing synced as open on-chain.',
                1 => 'Listing synced as reserved on-chain.',
                2 => 'Listing synced as completed — USDT already released on-chain.',
                3 => 'Listing synced as cancelled on-chain.',
                default => 'Listing synced.',
            },
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
