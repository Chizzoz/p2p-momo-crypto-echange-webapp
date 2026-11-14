<?php

namespace Chizzoz\PawaPay\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static array deposit(string $depositId, string $amount, string $phoneNumber, string $provider, string $currency = 'ZMW', string $description = 'Payment', array $metadata = [])
 * @method static array payout(string $payoutId, string $amount, string $phoneNumber, string $provider, string $currency = 'ZMW', string $description = 'Payout', array $metadata = [])
 * @method static array refund(string $refundId, string $depositId, string $amount, string $currency = 'ZMW', array $metadata = [])
 * @method static array checkDepositStatus(string $depositId)
 * @method static array checkPayoutStatus(string $payoutId)
 * @method static array checkRefundStatus(string $refundId)
 * @method static array getBalance(string $country = 'ZMB')
 * @method static array predictProvider(string $phoneNumber)
 * @method static array getPublicKeys()
 * @method static array getAvailability(string $country = 'ZMB', string $operationType = 'DEPOSIT')
 * @method static array getActiveConf(string $country = 'ZMB', string $operationType = 'DEPOSIT')
 * @method static string getProviderCode(string $shortCode)
 * @method static array formatMetadata(array $metadata)
 *
 * @see \Chizzoz\PawaPay\PawaPayService
 */
class PawaPay extends Facade
{
    /**
     * Get the registered name of the component.
     */
    protected static function getFacadeAccessor(): string
    {
        return 'pawapay';
    }
}
