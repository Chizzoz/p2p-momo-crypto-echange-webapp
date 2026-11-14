<?php

namespace App\Services;

use App\Jobs\CheckMomoTransferStatus;
use App\Models\BuyOrder;
use App\Models\MomoTransfer;
use App\Models\PaymentMethod;
use App\Models\Token;
use App\Models\Transaction;
use App\Models\TransactionToken;
use App\Models\User;
use App\Models\WalletLedgerEntry;
use Chizzoz\PawaPay\Facades\PawaPay;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class BuyOrderService
{
    public function __construct(
        protected EmpiyaOperatorService $operator,
        protected WalletService $wallet,
    ) {}

    /**
     * Create a Sell MoMo order and start PawaPay collect.
     */
    public function createAndCollect(
        User $user,
        string $buyerAddress,
        string $fiatAmount,
        string $usdtAmount,
    ): BuyOrder {
        if (! $user->hasBoundMomoAccount()) {
            throw new RuntimeException('Bind a mobile money profile before listing MoMo.');
        }

        if (! $user->eth_address
            || strtolower($user->eth_address) !== strtolower($buyerAddress)) {
            throw new RuntimeException('Buyer wallet must match your connected MetaMask address.');
        }

        /** @var PaymentMethod|null $method */
        $method = PaymentMethod::query()->find($user->payment_method_id);
        if (! $method?->pawapay_provider) {
            throw new RuntimeException('Selected mobile network is missing a PawaPay provider code.');
        }

        $user->loadMissing('country.currency');
        $currency = strtoupper((string) ($user->country?->currency?->currency_slug ?? ''));
        if (strlen($currency) !== 3) {
            throw new RuntimeException('Could not resolve currency for your MoMo country.');
        }

        $fiatAmount = $this->wallet->normalizeAmountForProvider(
            $fiatAmount,
            $method->pawapay_provider,
            $currency,
        );
        $usdtAmount = number_format((float) $usdtAmount, 6, '.', '');
        if ((float) $fiatAmount <= 0 || (float) $usdtAmount <= 0) {
            throw new RuntimeException('Fiat and USDT amounts must be greater than zero.');
        }

        $unitPrice = number_format((float) $fiatAmount / (float) $usdtAmount, 6, '.', '');
        $depositId = (string) Str::uuid();

        $order = DB::transaction(function () use (
            $user,
            $buyerAddress,
            $fiatAmount,
            $usdtAmount,
            $unitPrice,
            $currency,
            $method,
            $depositId,
        ) {
            $order = BuyOrder::create([
                'user_id' => $user->id,
                'buyer_address' => $buyerAddress,
                'currency' => $currency,
                'fiat_amount' => $fiatAmount,
                'usdt_amount' => $usdtAmount,
                'unit_price' => $unitPrice,
                'status' => BuyOrder::STATUS_PENDING_MOMO,
            ]);

            $transfer = MomoTransfer::create([
                'user_id' => $user->id,
                'direction' => MomoTransfer::DIRECTION_DEPOSIT,
                'purpose' => MomoTransfer::PURPOSE_P2P_BUY_ORDER,
                'status' => MomoTransfer::STATUS_PENDING,
                'pawapay_id' => $depositId,
                'provider' => $method->pawapay_provider,
                'phone' => $user->mobile_number,
                'currency' => $currency,
                'amount' => $fiatAmount,
                'buyer_address' => $buyerAddress,
                'metadata' => [
                    'buy_order_id' => $order->id,
                    'usdt_amount' => $usdtAmount,
                    'purpose' => MomoTransfer::PURPOSE_P2P_BUY_ORDER,
                ],
            ]);

            $order->momo_transfer_id = $transfer->id;
            $order->save();

            $response = PawaPay::deposit(
                $depositId,
                $fiatAmount,
                $user->mobile_number,
                $method->pawapay_provider,
                $currency,
                'eMpiya Sell MoMo',
                [
                    'buy_order_id' => (string) $order->id,
                    'purpose' => MomoTransfer::PURPOSE_P2P_BUY_ORDER,
                ],
            );

            $status = strtoupper((string) ($response['status'] ?? $response['data']['status'] ?? 'ACCEPTED'));
            if (in_array($status, ['REJECTED', 'FAILED'], true)) {
                $meta = $transfer->metadata ?? [];
                $meta['failure_code'] = $response['failureReason']['failureCode'] ?? null;
                $meta['failure_message'] = $response['failureReason']['failureMessage'] ?? null;
                $transfer->metadata = $meta;
                $transfer->markStatus(MomoTransfer::STATUS_FAILED);
                $order->status = BuyOrder::STATUS_CANCELLED;
                $order->save();

                $reason = $meta['failure_message'] ?? $meta['failure_code'] ?? $status;
                throw new RuntimeException('PawaPay deposit rejected: '.$reason);
            }

            $transfer->markStatus(
                $status === 'COMPLETED' ? MomoTransfer::STATUS_COMPLETED : MomoTransfer::STATUS_ACCEPTED
            );

            return $order->fresh(['momoTransfer']);
        });

        $transfer = $order->momoTransfer;
        if ($transfer?->status === MomoTransfer::STATUS_COMPLETED) {
            $this->openOrderAfterMomo($order->fresh(), $transfer->fresh());
        } elseif ($transfer && $this->sandboxOpenOnAccepted()
            && $transfer->status === MomoTransfer::STATUS_ACCEPTED) {
            // Sandbox MoMo prompts often stall; still publish the offer so fillers can see it.
            $this->openOrderAfterMomo($order->fresh(), $transfer->fresh());
            CheckMomoTransferStatus::dispatch($transfer->id)
                ->delay(now()->addSeconds(15))
                ->afterResponse();
        } else {
            CheckMomoTransferStatus::dispatch($transfer->id)
                ->delay(now()->addSeconds(15))
                ->afterResponse();
        }

        return $order->fresh(['momoTransfer']);
    }

    protected function sandboxOpenOnAccepted(): bool
    {
        $mode = strtolower((string) config('pawapay.mode', env('PAWAPAY_MODE', '')));

        return app()->environment('local', 'testing')
            || $mode === 'sandbox';
    }

    /**
     * MoMo collect succeeded — open the MoMo offer (fiat held on the order).
     */
    public function openOrderAfterMomo(BuyOrder $order, MomoTransfer $transfer): BuyOrder
    {
        if ($order->status !== BuyOrder::STATUS_PENDING_MOMO) {
            return $order;
        }

        $meta = $transfer->metadata ?? [];
        if (! empty($meta['buy_order_opened'])) {
            return $order;
        }

        return DB::transaction(function () use ($order, $transfer, $meta) {
            $locked = BuyOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== BuyOrder::STATUS_PENDING_MOMO) {
                return $locked;
            }

            $locked->loadMissing('user');
            $locked->status = BuyOrder::STATUS_OPEN;
            $locked->save();

            $wallet = $this->wallet->ensureWalletForCurrency(
                $locked->user,
                $locked->currency,
                $locked->user?->country_id,
            );

            // Audit lock without increasing spendable balance.
            WalletLedgerEntry::create([
                'user_id' => $locked->user_id,
                'fiat_wallet_id' => $wallet->id,
                'direction' => WalletLedgerEntry::DIRECTION_CREDIT,
                'currency' => $locked->currency,
                'amount' => $locked->fiat_amount,
                'balance_after' => $wallet->balance,
                'type' => WalletLedgerEntry::TYPE_BUY_ORDER_LOCK,
                'reference_type' => 'buy_orders',
                'reference_id' => $locked->id,
                'description' => 'MoMo deposited — locked on Sell MoMo offer',
                'metadata' => [
                    'momo_transfer_id' => $transfer->id,
                    'locked' => true,
                ],
            ]);

            $meta['buy_order_opened'] = true;
            $transfer->metadata = $meta;
            $transfer->save();

            return $locked->fresh();
        });
    }

    /**
     * Cancel pending/open order. Open orders credit fiat back to spendable wallet.
     */
    public function cancel(BuyOrder $order, User $actor): BuyOrder
    {
        if ($order->user_id !== $actor->id) {
            throw new RuntimeException('Only the MoMo lister can cancel this offer.');
        }

        if (! $order->isCancellable()) {
            throw new RuntimeException('This MoMo offer can no longer be cancelled.');
        }

        return DB::transaction(function () use ($order) {
            $locked = BuyOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if (! $locked->isCancellable()) {
                throw new RuntimeException('This MoMo offer can no longer be cancelled.');
            }

            $wasOpen = $locked->status === BuyOrder::STATUS_OPEN;
            $locked->status = BuyOrder::STATUS_CANCELLED;
            $locked->save();

            if ($wasOpen) {
                $this->wallet->credit(
                    $locked->user,
                    (string) $locked->fiat_amount,
                    WalletLedgerEntry::TYPE_BUY_ORDER_UNLOCK,
                    'buy_orders',
                    (int) $locked->id,
                    'Sell MoMo offer cancelled — fiat returned to wallet',
                    $locked->currency,
                    ['reason' => 'cancel'],
                    $locked->user?->country_id,
                );
            }

            return $locked->fresh();
        });
    }

    /**
     * Record on-chain depositAndReserve fill and settle (release + credit filler).
     *
     * @param  array{transaction_key:int|string,transaction_number:string,reservation_id:string|int,depositor:string,amount?:string}  $onchain
     */
    public function recordFill(BuyOrder $order, User $filler, array $onchain): BuyOrder
    {
        if (! $order->isOpen()) {
            throw new RuntimeException('This MoMo offer is not open for filling.');
        }

        if ($order->user_id === $filler->id) {
            throw new RuntimeException('You cannot fill your own MoMo offer.');
        }

        if (! $filler->eth_address
            || strtolower($filler->eth_address) !== strtolower($onchain['depositor'])) {
            throw new RuntimeException('Depositor wallet must match your connected MetaMask address.');
        }

        if (strtolower($order->buyer_address) === strtolower($onchain['depositor'])) {
            throw new RuntimeException('Invalid fill: depositor cannot be the MoMo buyer wallet.');
        }

        $usdtToken = Token::query()->where('token_slug', 'usdt')->orWhere('symbol', 'USDT')->first();
        if (! $usdtToken) {
            $usdtToken = Token::query()->orderBy('id')->first();
        }
        if (! $usdtToken) {
            throw new RuntimeException('USDT token is not configured in the database.');
        }

        $order = DB::transaction(function () use ($order, $filler, $onchain, $usdtToken) {
            $locked = BuyOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if (! $locked->isOpen()) {
                throw new RuntimeException('This MoMo offer is not open for filling.');
            }

            $tx = new Transaction;
            $tx->user_id = $filler->id;
            $tx->transaction_key = (int) $onchain['transaction_key'];
            $tx->transaction_number = (string) $onchain['transaction_number'];
            $tx->amount = $locked->usdt_amount;
            $tx->status = 1; // Processing
            $tx->recipient = $onchain['depositor'];
            $tx->reserved_buyer = $locked->buyer_address;
            $tx->reservation_id = (string) $onchain['reservation_id'];
            $tx->buy_order_id = $locked->id;
            $tx->save();

            TransactionToken::create([
                'transaction_id' => $tx->id,
                'token_id' => $usdtToken->id,
                'price' => $locked->unit_price,
                'currency' => $locked->currency,
            ]);

            $locked->status = BuyOrder::STATUS_FILLING;
            $locked->filler_user_id = $filler->id;
            $locked->transaction_id = $tx->id;
            $locked->save();

            return $locked->fresh(['transaction']);
        });

        // MoMo already collected — release USDT to buyer, then credit filler fiat.
        $this->settleFilledOrder($order->fresh(['transaction', 'user', 'filler']));

        return $order->fresh(['transaction', 'user', 'filler']);
    }

    /**
     * releaseToBuyer + credit USDT filler's fiat wallet with locked MoMo.
     */
    public function settleFilledOrder(BuyOrder $order): BuyOrder
    {
        if ($order->status !== BuyOrder::STATUS_FILLING) {
            return $order;
        }

        $tx = $order->transaction;
        if (! $tx) {
            Log::warning('Buy order missing transaction for settle', ['buy_order_id' => $order->id]);

            return $order;
        }

        $metaKey = 'buy_order_settled_'.$order->id;
        // Idempotency via ledger type+reference.
        $existing = WalletLedgerEntry::query()
            ->where('type', WalletLedgerEntry::TYPE_BUY_ORDER_FILL_CREDIT)
            ->where('reference_type', 'buy_orders')
            ->where('reference_id', $order->id)
            ->first();
        if ($existing && $order->status === BuyOrder::STATUS_COMPLETE) {
            return $order;
        }

        try {
            $this->operator->releaseToBuyer(
                (string) $tx->recipient,
                (int) $tx->transaction_key,
                (string) $tx->transaction_number,
                (string) $tx->reserved_buyer,
                (string) $tx->reservation_id,
            );
        } catch (\Throwable $e) {
            Log::error('Failed to releaseToBuyer for Sell MoMo fill', [
                'buy_order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        $filler = $order->filler ?? User::query()->find($order->filler_user_id);
        if (! $filler) {
            throw new RuntimeException('Filler user missing for buy order settle.');
        }

        $this->wallet->credit(
            $filler,
            (string) $order->fiat_amount,
            WalletLedgerEntry::TYPE_BUY_ORDER_FILL_CREDIT,
            'buy_orders',
            (int) $order->id,
            'Filled Sell MoMo offer — received locked fiat',
            $order->currency,
            [
                'transaction_id' => $tx->id,
                'usdt_amount' => (string) $order->usdt_amount,
            ],
            $order->user?->country_id,
        );

        $order->status = BuyOrder::STATUS_COMPLETE;
        $order->save();
        $tx->update(['status' => 2]);

        return $order->fresh();
    }

    public function findOrderForTransfer(MomoTransfer $transfer): ?BuyOrder
    {
        $id = $transfer->metadata['buy_order_id'] ?? null;
        if ($id) {
            return BuyOrder::query()->find((int) $id);
        }

        return BuyOrder::query()->where('momo_transfer_id', $transfer->id)->first();
    }
}
