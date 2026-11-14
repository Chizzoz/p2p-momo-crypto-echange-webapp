<?php

namespace App\Services;

use App\Jobs\CheckMomoTransferStatus;
use App\Models\MomoTransfer;
use App\Models\PaymentMethod;
use App\Models\Transaction;
use App\Models\User;
use Chizzoz\PawaPay\Facades\PawaPay;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class MomoSettlementService
{
    public function __construct(
        protected EmpiyaOperatorService $operator,
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
        $fiatAmount = number_format(
            (float) $transaction->amount * (float) ($tokenPivot?->price ?? 0),
            2,
            '.',
            ''
        );
        if ((float) $fiatAmount <= 0) {
            throw new RuntimeException('Listing fiat total is invalid.');
        }

        $buyer->loadMissing('country.currency');
        $currencySlug = strtoupper((string) ($buyer->country?->currency?->currency_slug ?? 'ZMW'));
        $currency = strlen($currencySlug) === 3 ? $currencySlug : 'ZMW';

        $depositId = (string) Str::uuid();

        return DB::transaction(function () use (
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

            $status = strtoupper((string) ($response['status'] ?? $response['data']['status'] ?? 'ACCEPTED'));
            $transfer->markStatus($status === 'COMPLETED' ? MomoTransfer::STATUS_COMPLETED : MomoTransfer::STATUS_ACCEPTED);

            CheckMomoTransferStatus::dispatch($transfer->id)->delay(now()->addSeconds(15));

            if ($transfer->status === MomoTransfer::STATUS_COMPLETED) {
                $this->handleDepositCompleted($transfer->fresh());
            }

            return $transfer->fresh();
        });
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
        $payoutId = (string) Str::uuid();

        $transfer = MomoTransfer::create([
            'user_id' => $payer->id,
            'direction' => MomoTransfer::DIRECTION_PAYOUT,
            'purpose' => MomoTransfer::PURPOSE_PAY_REDEEM,
            'status' => MomoTransfer::STATUS_PENDING,
            'pawapay_id' => $payoutId,
            'provider' => $provider,
            'phone' => $phone,
            'currency' => strtoupper($currency),
            'amount' => $fiatAmount,
            'payment_id' => $paymentId,
            'metadata' => [
                'usdt_amount' => $amountUsdt,
            ],
        ]);

        $response = PawaPay::payout(
            $payoutId,
            $fiatAmount,
            $phone,
            $provider,
            strtoupper($currency),
            'eMpiya redeem',
            [
                'payment_id' => $paymentId,
                'purpose' => MomoTransfer::PURPOSE_PAY_REDEEM,
            ],
        );

        $status = strtoupper((string) ($response['status'] ?? $response['data']['status'] ?? 'ACCEPTED'));
        $transfer->markStatus($status === 'COMPLETED' ? MomoTransfer::STATUS_COMPLETED : MomoTransfer::STATUS_ACCEPTED);

        CheckMomoTransferStatus::dispatch($transfer->id)->delay(now()->addSeconds(15));

        if ($transfer->status === MomoTransfer::STATUS_COMPLETED) {
            $this->handlePayoutCompleted($transfer->fresh());
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

        $status = strtoupper((string) ($payload['status'] ?? $transfer->status));
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

        $this->startSellerPayout($transaction, $transfer);
    }

    protected function startSellerPayout(Transaction $transaction, MomoTransfer $buyDeposit): void
    {
        $seller = $transaction->user;
        if (! $seller?->mobile_number || ! $seller->payment_method_id) {
            Log::warning('Seller missing MoMo profile for payout', ['transaction_id' => $transaction->id]);

            return;
        }

        /** @var PaymentMethod|null $method */
        $method = PaymentMethod::query()->find($seller->payment_method_id);
        if (! $method?->pawapay_provider) {
            return;
        }

        $payoutId = (string) Str::uuid();
        $payout = MomoTransfer::create([
            'user_id' => $seller->id,
            'transaction_id' => $transaction->id,
            'direction' => MomoTransfer::DIRECTION_PAYOUT,
            'purpose' => MomoTransfer::PURPOSE_P2P_SELLER_PAYOUT,
            'status' => MomoTransfer::STATUS_PENDING,
            'pawapay_id' => $payoutId,
            'provider' => $method->pawapay_provider,
            'phone' => $seller->mobile_number,
            'currency' => $buyDeposit->currency,
            'amount' => $buyDeposit->amount,
            'metadata' => ['from_deposit' => $buyDeposit->id],
        ]);

        $transaction->update(['momo_payout_id' => $payout->id]);

        $response = PawaPay::payout(
            $payoutId,
            (string) $buyDeposit->amount,
            $seller->mobile_number,
            $method->pawapay_provider,
            $buyDeposit->currency,
            'eMpiya P2P sell',
            ['transaction_id' => (string) $transaction->id],
        );

        $status = strtoupper((string) ($response['status'] ?? $response['data']['status'] ?? 'ACCEPTED'));
        $payout->markStatus($status === 'COMPLETED' ? MomoTransfer::STATUS_COMPLETED : MomoTransfer::STATUS_ACCEPTED);

        CheckMomoTransferStatus::dispatch($payout->id)->delay(now()->addSeconds(15));
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
}
