<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MomoTransfer extends Model
{
    public const DIRECTION_DEPOSIT = 'deposit';

    public const DIRECTION_PAYOUT = 'payout';

    public const DIRECTION_REFUND = 'refund';

    public const PURPOSE_P2P_BUY = 'p2p_buy';

    public const PURPOSE_P2P_BUY_ORDER = 'p2p_buy_order';

    public const PURPOSE_P2P_SELLER_PAYOUT = 'p2p_seller_payout';

    public const PURPOSE_WALLET_WITHDRAW = 'wallet_withdraw';

    public const PURPOSE_PAY_REDEEM = 'pay_redeem';

    public const STATUS_PENDING = 'PENDING';

    public const STATUS_ACCEPTED = 'ACCEPTED';

    public const STATUS_SUBMITTED = 'SUBMITTED';

    public const STATUS_COMPLETED = 'COMPLETED';

    public const STATUS_FAILED = 'FAILED';

    protected $fillable = [
        'user_id',
        'transaction_id',
        'direction',
        'purpose',
        'status',
        'pawapay_id',
        'provider',
        'phone',
        'currency',
        'amount',
        'payment_id',
        'depositor_address',
        'onchain_transaction_key',
        'onchain_transaction_number',
        'buyer_address',
        'reservation_id',
        'metadata',
    ];

    protected $casts = [
        // Keep ≤2 places so re-reads never reintroduce the PawaPay INVALID_AMOUNT
        // "supports up to 2 decimal places" failure from decimal:8 padding.
        'amount' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function isTerminal(): bool
    {
        return in_array(strtoupper((string) $this->status), [
            self::STATUS_COMPLETED,
            self::STATUS_FAILED,
        ], true);
    }

    public function markStatus(string $status): void
    {
        $this->status = strtoupper($status);
        $this->save();
    }
}
