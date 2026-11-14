<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var string[]
     */
    protected $fillable = [
        'user_id',
        'transaction_key',
        'transaction_number',
        'amount',
        'status',
        'recipient',
        'reserved_buyer',
        'reservation_id',
        'momo_deposit_id',
        'momo_payout_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function paymentMethods()
    {
        return $this->belongsToMany(
            PaymentMethod::class,
            'transaction_payment_methods',
            'transaction_id',
            'payment_method_id'
        );
    }

    public function tokenPivot()
    {
        return $this->hasOne(TransactionToken::class);
    }

    public function momoDeposit()
    {
        return $this->belongsTo(MomoTransfer::class, 'momo_deposit_id');
    }

    public function momoPayout()
    {
        return $this->belongsTo(MomoTransfer::class, 'momo_payout_id');
    }
}
