<?php

namespace App\Services;

use App\Jobs\CheckMomoTransferStatus;
use App\Models\BuyOrder;
use App\Models\MomoTransfer;
use App\Models\PaymentMethod;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletLedgerEntry;
use Chizzoz\PawaPay\Facades\PawaPay;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class MomoSettlementService
{
    public function __construct(
        protected EmpiyaOperatorService $operator,
        protected WalletService $wallet,
        protected BuyOrderService $buyOrders,
    ) {}

    /**
     * Start a P2P buy MoMo deposit after on-chain reserve.
     *
     * @param  array<string, mixed>  $reserve
     */
    public function startP2pBuyDeposit(
        User $buyer,
        Transaction $transaction,
        array $reserve,
    ): MomoTransfer {
        if (! $buyer->mobile_number || ! $buyer->payment_method_id) {
            throw new RuntimeException('Bind a mobile money profile before buying.');
        }

        /** @var PaymentMethod|null $method */
        $method = PaymentMethod::query()->find($buyer->payment_method_id);
        if (! $method?->pawapay_provider) {
            throw new RuntimeException('Selected mobile network is missing a PawaPay provider code.');
        }

        $tokenPivot = $transaction->tokenPivot;
        $rawFiat = (float) $transaction->amount * (float) ($tokenPivot?->price ?? 0);
        if ($rawFiat <= 0) {
            throw new RuntimeException('Listing fiat total is invalid.');
        }

        $buyer->loadMissing('country.currency');
        $listingCurrency = strtoupper((string) ($tokenPivot?->currency ?? ''));
        $buyerCurrency = strtoupper((string) ($buyer->country?->currency?->currency_slug ?? ''));
        $currency = strlen($listingCurrency) === 3
            ? $listingCurrency
            : (strlen($buyerCurrency) === 3 ? $buyerCurrency : 'ZMW');

        if (strlen($buyerCurrency) === 3 && $buyerCurrency !== $currency) {
            throw new RuntimeException(
                "This listing is priced in {$currency}. Bind a MoMo number for a {$currency} country to buy."
            );
        }

        $depositId = (string) Str::uuid();
        $fiatAmount = $this->wallet->normalizeAmountForProvider(
            $rawFiat,
            $method->pawapay_provider,
            $currency,
        );

        $transfer = DB::transaction(function () use (
            $buyer,
            $transaction,
            $reserve,
            $method,
            $fiatAmount,
            $currency,
            $depositId,
        ) {
            $depositor = $reserve['depositor']
                ?? $transaction->user?->eth_address
                ?? null;

            $transfer = MomoTransfer::create([
                'user_id' => $buyer->id,
                'transaction_id' => $transaction->id,
                'direction' => MomoTransfer::DIRECTION_DEPOSIT,
                'purpose' => MomoTransfer::PURPOSE_P2P_BUY,
                'status' => MomoTransfer::STATUS_PENDING,
                'pawapay_id' => $depositId,
                'provider' => $method->pawapay_provider,
                'phone' => $buyer->mobile_number,
                'currency' => $currency,
                'amount' => $fiatAmount,
                'depositor_address' => $depositor,
                'onchain_transaction_key' => $transaction->transaction_key,
                'onchain_transaction_number' => $transaction->transaction_number,
                'buyer_address' => $reserve['buyer'] ?? $buyer->eth_address,
                'reservation_id' => (string) ($reserve['reservationId'] ?? ''),
                'metadata' => ['initiated_by' => 'buy'],
            ]);

            $transaction->update([
                'status' => 1, // Processing
                'reserved_buyer' => $transfer->buyer_address,
                'reservation_id' => $transfer->reservation_id,
                'momo_deposit_id' => $transfer->id,
            ]);

            $response = PawaPay::deposit(
                $depositId,
                $fiatAmount,
                $buyer->mobile_number,
                $method->pawapay_provider,
                $currency,
                'eMpiya P2P buy',
                [
                    'transaction_id' => (string) $transaction->id,
                    'purpose' => MomoTransfer::PURPOSE_P2P_BUY,
                ],
            );

            $status = $this->statusFromPawaPayCreateResponse($response);
            if ($this->isPawaPayFailureStatus($status)) {
                $transfer->markStatus(MomoTransfer::STATUS_FAILED);
                $this->storeFailureReason($transfer, $response);

                return $transfer->fresh();
            }

            $transfer->markStatus($status === 'COMPLETED' ? MomoTransfer::STATUS_COMPLETED : MomoTransfer::STATUS_ACCEPTED);

            return $transfer->fresh();
        });

        // On-chain release + wallet credit must run AFTER the DB commit so a later
        // failure cannot roll back the MoMo row while USDT is already gone.
        if ($transfer->status === MomoTransfer::STATUS_FAILED) {
            $failed = $transfer->fresh();
            $this->handleTransferFailed($failed);
            $reason = $failed->metadata['failure_message']
                ?? $failed->metadata['failure_code']
                ?? 'REJECTED';
            throw new RuntimeException('PawaPay deposit rejected: '.$reason);
        }

        if ($transfer->status === MomoTransfer::STATUS_COMPLETED) {
            $this->handleDepositCompleted($transfer->fresh());
        } else {
            CheckMomoTransferStatus::dispatch($transfer->id)
                ->delay(now()->addSeconds(15))
                ->afterResponse();
        }

        return $transfer->fresh();
    }

    public function startPayRedeemPayout(
        User $payer,
        string $paymentId,
        string $amountUsdt,
        string $phone,
        string $provider,
        string $currency = 'ZMW',
        string $fiatAmount = '0',
    ): MomoTransfer {
        $currency = strtoupper($currency);
        $fiatAmount = $this->wallet->normalizeAmountForProvider($fiatAmount, $provider, $currency);
        $payoutId = (string) Str::uuid();

        $transfer = MomoTransfer::create([
            'user_id' => $payer->id,
            'direction' => MomoTransfer::DIRECTION_PAYOUT,
            'purpose' => MomoTransfer::PURPOSE_PAY_REDEEM,
            'status' => MomoTransfer::STATUS_PENDING,
            'pawapay_id' => $payoutId,
            'provider' => $provider,
            'phone' => $phone,
            'currency' => $currency,
            'amount' => $fiatAmount,
            'payment_id' => $paymentId,
            'metadata' => [
                'usdt_amount' => $amountUsdt,
            ],
        ]);

        try {
            $response = PawaPay::payout(
                $payoutId,
                $fiatAmount,
                $phone,
                $provider,
                $currency,
                'eMpiya redeem',
                [
                    'payment_id' => $paymentId,
                    'purpose' => MomoTransfer::PURPOSE_PAY_REDEEM,
                ],
            );
        } catch (\Throwable $e) {
            $transfer->markStatus(MomoTransfer::STATUS_FAILED);
            $this->handleTransferFailed($transfer->fresh());
            throw $e;
        }

        $status = $this->statusFromPawaPayCreateResponse($response);
        if ($this->isPawaPayFailureStatus($status)) {
            $transfer->markStatus(MomoTransfer::STATUS_FAILED);
            $this->storeFailureReason($transfer, $response);
            $this->handleTransferFailed($transfer->fresh());
            $reason = $response['failureReason']['failureMessage']
                ?? $response['failureReason']['failureCode']
                ?? $status;
            throw new RuntimeException('PawaPay payout rejected: '.$reason);
        }

        $transfer->markStatus($status === 'COMPLETED' ? MomoTransfer::STATUS_COMPLETED : MomoTransfer::STATUS_ACCEPTED);

        if ($transfer->status === MomoTransfer::STATUS_COMPLETED) {
            $this->handlePayoutCompleted($transfer->fresh());
        } else {
            CheckMomoTransferStatus::dispatch($transfer->id)
                ->delay(now()->addSeconds(15))
                ->afterResponse();
        }

        return $transfer->fresh();
    }

    public function syncTransferStatus(MomoTransfer $transfer): MomoTransfer
    {
        if ($transfer->isTerminal()) {
            return $transfer;
        }

        $response = match ($transfer->direction) {
            MomoTransfer::DIRECTION_DEPOSIT => PawaPay::checkDepositStatus($transfer->pawapay_id),
            MomoTransfer::DIRECTION_PAYOUT => PawaPay::checkPayoutStatus($transfer->pawapay_id),
            MomoTransfer::DIRECTION_REFUND => PawaPay::checkRefundStatus($transfer->pawapay_id),
            default => throw new RuntimeException('Unknown MoMo transfer direction.'),
        };

        $status = $this->extractPawaPayStatus($response, $transfer->status);
        if ($status === null) {
            return $transfer;
        }

        $status = $this->normalizeTerminalStatus($status);
        $transfer->markStatus($status);

        if ($status === MomoTransfer::STATUS_COMPLETED) {
            if ($transfer->direction === MomoTransfer::DIRECTION_DEPOSIT) {
                $this->handleDepositCompleted($transfer);
            }
            if ($transfer->direction === MomoTransfer::DIRECTION_PAYOUT) {
                $this->handlePayoutCompleted($transfer);
            }
        }

        if ($status === MomoTransfer::STATUS_FAILED) {
            $this->handleTransferFailed($transfer);
        }

        return $transfer->fresh();
    }

    public function applyWebhookPayload(string $direction, array $payload): ?MomoTransfer
    {
        $id = $payload['depositId']
            ?? $payload['payoutId']
            ?? $payload['refundId']
            ?? $payload['id']
            ?? null;

        if (! $id) {
            Log::warning('PawaPay webhook missing id', ['payload' => $payload]);

            return null;
        }

        $transfer = MomoTransfer::query()->where('pawapay_id', $id)->first();
        if (! $transfer) {
            Log::warning('PawaPay webhook for unknown transfer', ['id' => $id]);

            return null;
        }

        $status = $this->normalizeTerminalStatus(
            strtoupper((string) ($payload['status'] ?? $transfer->status))
        );
        $transfer->markStatus($status);

        if ($status === MomoTransfer::STATUS_COMPLETED) {
            if ($direction === 'deposits' || $transfer->direction === MomoTransfer::DIRECTION_DEPOSIT) {
                $this->handleDepositCompleted($transfer);
            }
            if ($direction === 'payouts' || $transfer->direction === MomoTransfer::DIRECTION_PAYOUT) {
                $this->handlePayoutCompleted($transfer);
            }
        }

        if ($status === MomoTransfer::STATUS_FAILED) {
            $this->handleTransferFailed($transfer);
        }

        return $transfer->fresh();
    }

    protected function handleDepositCompleted(MomoTransfer $transfer): void
    {
        if ($transfer->purpose === MomoTransfer::PURPOSE_P2P_BUY_ORDER) {
            $order = $this->buyOrders->findOrderForTransfer($transfer);
            if ($order) {
                $this->buyOrders->openOrderAfterMomo($order, $transfer);
            }

            return;
        }

        if ($transfer->purpose !== MomoTransfer::PURPOSE_P2P_BUY) {
            return;
        }

        $transaction = $transfer->transaction;
        if (! $transaction) {
            return;
        }

        $meta = $transfer->metadata ?? [];
        if (! empty($meta['released'])) {
            return;
        }

        $this->operator->releaseToBuyer(
            (string) $transfer->depositor_address,
            (int) $transfer->onchain_transaction_key,
            (string) $transfer->onchain_transaction_number,
            (string) $transfer->buyer_address,
            (string) $transfer->reservation_id,
        );

        $meta['released'] = true;
        $transfer->metadata = $meta;
        $transfer->save();

        $transaction->update(['status' => 2]); // Complete / Sold

        // Credit seller ZMW wallet — they withdraw to MoMo manually later.
        $this->creditSellerWallet($transaction, $transfer);
    }

    protected function creditSellerWallet(Transaction $transaction, MomoTransfer $buyDeposit): void
    {
        $seller = $transaction->user;
        if (! $seller) {
            Log::warning('Seller missing for wallet credit', ['transaction_id' => $transaction->id]);

            return;
        }

        $amount = $this->wallet->normalizeAmount((string) $buyDeposit->amount);
        $currency = strtoupper((string) ($buyDeposit->currency ?: 'ZMW'));

        $buyDeposit->loadMissing('user');
        $buyerCountryId = $buyDeposit->user?->country_id ?? $seller->country_id;

        $entry = $this->wallet->credit(
            $seller,
            $amount,
            WalletLedgerEntry::TYPE_P2P_SALE_CREDIT,
            'transactions',
            (int) $transaction->id,
            'P2P sale proceeds (USDT released to buyer)',
            $currency,
            [
                'momo_deposit_id' => $buyDeposit->id,
                'usdt_amount' => (string) $transaction->amount,
            ],
            $buyerCountryId ? (int) $buyerCountryId : null,
        );

        $meta = $buyDeposit->metadata ?? [];
        $meta['seller_wallet_credited'] = true;
        $meta['wallet_ledger_id'] = $entry?->id;
        $buyDeposit->metadata = $meta;
        $buyDeposit->save();
    }

    /**
     * Manual ZMW wallet → MoMo payout (any eligible phone/network).
     */
    public function startWalletWithdraw(
        User $user,
        string $amount,
        string $phone,
        PaymentMethod $method,
        string $currency = 'ZMW',
    ): MomoTransfer {
        if (! $method->pawapay_provider) {
            throw new RuntimeException('Selected mobile network is missing a PawaPay provider code.');
        }

        $currency = strtoupper($currency);
        // Ledger stays 2dp; API payload uses provider precision (may be 0).
        $ledgerAmount = $this->wallet->normalizeAmount($amount);
        $payoutAmount = $this->wallet->normalizeAmountForProvider(
            $ledgerAmount,
            $method->pawapay_provider,
            $currency,
        );
        $payoutId = (string) Str::uuid();

        $payout = MomoTransfer::create([
            'user_id' => $user->id,
            'direction' => MomoTransfer::DIRECTION_PAYOUT,
            'purpose' => MomoTransfer::PURPOSE_WALLET_WITHDRAW,
            'status' => MomoTransfer::STATUS_PENDING,
            'pawapay_id' => $payoutId,
            'provider' => $method->pawapay_provider,
            'phone' => $phone,
            'currency' => $currency,
            'amount' => $payoutAmount,
            'metadata' => [
                'source' => 'fiat_wallet',
                'currency' => $currency,
                'ledger_amount' => $ledgerAmount,
            ],
        ]);

        try {
            $this->wallet->debit(
                $user,
                $ledgerAmount,
                WalletLedgerEntry::TYPE_WALLET_WITHDRAW,
                'momo_transfers',
                (int) $payout->id,
                'Withdraw to mobile money',
                $currency,
                ['phone' => $phone, 'provider' => $method->pawapay_provider],
            );
        } catch (\Throwable $e) {
            $payout->markStatus(MomoTransfer::STATUS_FAILED);
            throw $e;
        }

        try {
            $response = PawaPay::payout(
                $payoutId,
                $payoutAmount,
                $phone,
                $method->pawapay_provider,
                $currency,
                'eMpiya wallet withdraw',
                ['momo_transfer_id' => (string) $payout->id],
            );
        } catch (\Throwable $e) {
            $this->reverseWalletWithdraw($user, $payout, $ledgerAmount, $currency);
            throw $e;
        }

        $status = $this->statusFromPawaPayCreateResponse($response);
        if ($this->isPawaPayFailureStatus($status)) {
            $payout->markStatus(MomoTransfer::STATUS_FAILED);
            $this->storeFailureReason($payout, $response);
            $this->reverseWalletWithdraw($user, $payout, $ledgerAmount, $currency);
            $reason = $response['failureReason']['failureMessage']
                ?? $response['failureReason']['failureCode']
                ?? $status;
            throw new RuntimeException('PawaPay payout rejected: '.$reason);
        }

        $payout->markStatus($status === 'COMPLETED' ? MomoTransfer::STATUS_COMPLETED : MomoTransfer::STATUS_ACCEPTED);
        CheckMomoTransferStatus::dispatch($payout->id)
            ->delay(now()->addSeconds(15))
            ->afterResponse();

        return $payout->fresh();
    }

    protected function reverseWalletWithdraw(
        User $user,
        MomoTransfer $payout,
        string $amount,
        string $currency,
    ): void {
        $this->wallet->credit(
            $user,
            $amount,
            WalletLedgerEntry::TYPE_WALLET_WITHDRAW_REVERSAL,
            'momo_transfers',
            (int) $payout->id,
            'Withdraw failed — balance restored',
            $currency,
            ['reversal_of' => 'wallet_withdraw'],
        );
    }

    protected function handlePayoutCompleted(MomoTransfer $transfer): void
    {
        if ($transfer->purpose !== MomoTransfer::PURPOSE_PAY_REDEEM) {
            return;
        }

        $meta = $transfer->metadata ?? [];
        if (! empty($meta['settled']) || ! $transfer->payment_id) {
            return;
        }

        $this->operator->settlePayment($transfer->payment_id);
        $meta['settled'] = true;
        $transfer->metadata = $meta;
        $transfer->save();
    }

    protected function handleTransferFailed(MomoTransfer $transfer): void
    {
        if ($transfer->purpose === MomoTransfer::PURPOSE_P2P_BUY_ORDER) {
            $order = $this->buyOrders->findOrderForTransfer($transfer);
            // Cancel only if MoMo failed before a filler locked the offer.
            if ($order && in_array($order->status, [
                BuyOrder::STATUS_PENDING_MOMO,
                BuyOrder::STATUS_OPEN,
            ], true)) {
                $order->status = BuyOrder::STATUS_CANCELLED;
                $order->save();
            }
        }

        if ($transfer->purpose === MomoTransfer::PURPOSE_P2P_BUY) {
            $meta = $transfer->metadata ?? [];
            if (empty($meta['refunded']) && $transfer->depositor_address && $transfer->reservation_id) {
                try {
                    $this->operator->refundSeller(
                        (string) $transfer->depositor_address,
                        (int) $transfer->onchain_transaction_key,
                        (string) $transfer->onchain_transaction_number,
                        (string) $transfer->reservation_id,
                    );
                    $meta['refunded'] = true;
                    $transfer->metadata = $meta;
                    $transfer->save();
                } catch (\Throwable $e) {
                    Log::error('Failed to refund seller after MoMo deposit failure', [
                        'transfer_id' => $transfer->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $transfer->transaction?->update(['status' => 0]);
        }

        if ($transfer->purpose === MomoTransfer::PURPOSE_PAY_REDEEM && $transfer->payment_id) {
            $meta = $transfer->metadata ?? [];
            if (empty($meta['chain_refunded'])) {
                try {
                    $this->operator->refundPayment($transfer->payment_id);
                    $meta['chain_refunded'] = true;
                    $transfer->metadata = $meta;
                    $transfer->save();
                } catch (\Throwable $e) {
                    Log::error('Failed to refund EmpiyaPayments after MoMo payout failure', [
                        'transfer_id' => $transfer->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        if ($transfer->purpose === MomoTransfer::PURPOSE_WALLET_WITHDRAW && $transfer->user) {
            $meta = $transfer->metadata ?? [];
            if (empty($meta['wallet_reversed'])) {
                try {
                    $this->reverseWalletWithdraw(
                        $transfer->user,
                        $transfer,
                        $this->wallet->normalizeAmount((string) $transfer->amount),
                        strtoupper((string) ($transfer->currency ?: 'ZMW')),
                    );
                    $meta['wallet_reversed'] = true;
                    $transfer->metadata = $meta;
                    $transfer->save();
                } catch (\Throwable $e) {
                    Log::error('Failed to reverse wallet withdraw after payout failure', [
                        'transfer_id' => $transfer->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    /**
     * PawaPay check-status responses use envelope status FOUND/NOT_FOUND;
     * the payment status lives under data.status. Webhooks/create use top-level status.
     *
     * @param  array<string, mixed>  $response
     */
    protected function extractPawaPayStatus(array $response, string $fallback): ?string
    {
        $envelope = strtoupper((string) ($response['status'] ?? ''));

        if ($envelope === 'FOUND') {
            $inner = $response['data']['status']
                ?? $response['data'][0]['status']
                ?? null;

            return $inner ? strtoupper((string) $inner) : null;
        }

        if ($envelope === 'NOT_FOUND') {
            // Only treat as failed if we never accepted the payment locally as in-flight.
            // Leave pending so a later poll/webhook can still succeed after network blips.
            return null;
        }

        if (in_array($envelope, [
            MomoTransfer::STATUS_PENDING,
            MomoTransfer::STATUS_ACCEPTED,
            MomoTransfer::STATUS_SUBMITTED,
            MomoTransfer::STATUS_COMPLETED,
            MomoTransfer::STATUS_FAILED,
            'PROCESSING',
            'REJECTED',
        ], true)) {
            return $envelope;
        }

        $nested = $response['data']['status'] ?? $response[0]['status'] ?? null;

        return $nested ? strtoupper((string) $nested) : strtoupper($fallback);
    }

    /**
     * @param  array<string, mixed>  $response
     */
    protected function statusFromPawaPayCreateResponse(array $response): string
    {
        return strtoupper((string) ($response['status'] ?? $response['data']['status'] ?? 'ACCEPTED'));
    }

    protected function isPawaPayFailureStatus(string $status): bool
    {
        return in_array(strtoupper($status), ['REJECTED', 'FAILED'], true);
    }

    /**
     * Map provider terminal statuses onto our transfer model.
     */
    protected function normalizeTerminalStatus(string $status): string
    {
        $status = strtoupper($status);

        return $status === 'REJECTED' ? MomoTransfer::STATUS_FAILED : $status;
    }

    /**
     * @param  array<string, mixed>  $response
     */
    protected function storeFailureReason(MomoTransfer $transfer, array $response): void
    {
        $meta = $transfer->metadata ?? [];
        $meta['failure_code'] = $response['failureReason']['failureCode'] ?? null;
        $meta['failure_message'] = $response['failureReason']['failureMessage'] ?? null;
        $transfer->metadata = $meta;
        $transfer->save();
    }
}
