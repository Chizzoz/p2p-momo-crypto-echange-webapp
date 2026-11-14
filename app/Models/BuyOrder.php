<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuyOrder extends Model
{
    public const STATUS_PENDING_MOMO = 'pending_momo';

    public const STATUS_OPEN = 'open';

    public const STATUS_FILLING = 'filling';

    public const STATUS_COMPLETE = 'complete';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'user_id',
        'buyer_address',
        'currency',
        'fiat_amount',
        'usdt_amount',
        'unit_price',
        'status',
        'momo_transfer_id',
        'transaction_id',
        'filler_user_id',
    ];

    protected $casts = [
        'fiat_amount' => 'decimal:2',
        'usdt_amount' => 'decimal:6',
        'unit_price' => 'decimal:6',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function filler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'filler_user_id');
    }

    public function momoTransfer(): BelongsTo
    {
        return $this->belongsTo(MomoTransfer::class, 'momo_transfer_id');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING_MOMO,
            self::STATUS_OPEN,
        ], true);
    }
}
