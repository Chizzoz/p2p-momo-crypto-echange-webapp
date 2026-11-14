<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletLedgerEntry extends Model
{
    public const DIRECTION_CREDIT = 'credit';

    public const DIRECTION_DEBIT = 'debit';

    public const TYPE_P2P_SALE_CREDIT = 'p2p_sale_credit';

    public const TYPE_WALLET_WITHDRAW = 'wallet_withdraw';

    public const TYPE_WALLET_WITHDRAW_REVERSAL = 'wallet_withdraw_reversal';

    /** MoMo collected for a Sell MoMo order (held off spendable balance). */
    public const TYPE_BUY_ORDER_LOCK = 'buy_order_lock';

    /** Cancelled Sell MoMo order — fiat returned to spendable wallet. */
    public const TYPE_BUY_ORDER_UNLOCK = 'buy_order_unlock';

    /** USDT filler received locked fiat after releaseToBuyer. */
    public const TYPE_BUY_ORDER_FILL_CREDIT = 'buy_order_fill_credit';

    protected $fillable = [
        'user_id',
        'fiat_wallet_id',
        'direction',
        'currency',
        'amount',
        'balance_after',
        'type',
        'reference_type',
        'reference_id',
        'description',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fiatWallet(): BelongsTo
    {
        return $this->belongsTo(FiatWallet::class);
    }
}
