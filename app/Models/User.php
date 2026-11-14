<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Jetstream\HasProfilePhoto;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasProfilePhoto;
    use Notifiable;
    use TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var string[]
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'eth_address',
        'mobile_number',
        'country_id',
        'payment_method_id',
        'account_balance',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_recovery_codes',
        'two_factor_secret',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'account_balance' => 'decimal:2',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'profile_photo_url',
        'has_password',
    ];

    /**
     * Whether the user has a password they can authenticate with / confirm.
     */
    public function hasPassword(): bool
    {
        return filled($this->password);
    }

    /**
     * @return bool
     */
    public function getHasPasswordAttribute(): bool
    {
        return $this->hasPassword();
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function fiatWallets(): HasMany
    {
        return $this->hasMany(FiatWallet::class);
    }

    /**
     * Profile MoMo wallet is ready when number, country, and MNO are all set.
     */
    public function hasBoundMomoAccount(): bool
    {
        return filled($this->mobile_number)
            && filled($this->country_id)
            && filled($this->payment_method_id);
    }
}
