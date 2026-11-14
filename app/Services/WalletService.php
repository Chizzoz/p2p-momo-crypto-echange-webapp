<?php

namespace App\Services;

use App\Models\Country;
use App\Models\FiatWallet;
use App\Models\User;
use App\Models\WalletLedgerEntry;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WalletService
{
    /**
     * Ensure a fiat wallet exists for the user's MoMo country currency.
     */
    public function ensureWalletForCountry(User $user, ?int $countryId): ?FiatWallet
    {
        if (! $countryId) {
            return null;
        }

        $country = Country::query()->with('currency')->find($countryId);
        if (! $country?->currency) {
            return null;
        }

        $currency = strtoupper((string) $country->currency->currency_slug);
        if (strlen($currency) !== 3) {
            return null;
        }

        return FiatWallet::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'currency' => $currency,
            ],
            [
                'country_id' => $country->id,
                'balance' => 0,
            ],
        );
    }

    public function ensureWalletForCurrency(
        User $user,
        string $currency,
        ?int $countryId = null,
    ): FiatWallet {
        $currency = strtoupper($currency);
        if (strlen($currency) !== 3) {
            throw new RuntimeException('Invalid wallet currency.');
        }

        $wallet = FiatWallet::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'currency' => $currency,
            ],
            [
                'country_id' => $countryId,
                'balance' => 0,
            ],
        );

        if ($countryId && ! $wallet->country_id) {
            $wallet->country_id = $countryId;
            $wallet->save();
        }

        return $wallet;
    }

    /**
     * Credit a currency wallet. Idempotent by type+reference.
     */
    public function credit(
        User $user,
        string $amount,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        string $description = '',
        string $currency = 'ZMW',
        array $metadata = [],
        ?int $countryId = null,
    ): ?WalletLedgerEntry {
        $amount = $this->normalizeAmount($amount);
        if ((float) $amount <= 0) {
            throw new RuntimeException('Credit amount must be positive.');
        }

        return DB::transaction(function () use (
            $user,
            $amount,
            $type,
            $referenceType,
            $referenceId,
            $description,
            $currency,
            $metadata,
            $countryId,
        ) {
            if ($referenceType && $referenceId) {
                $existing = WalletLedgerEntry::query()
                    ->where('type', $type)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId)
                    ->first();
                if ($existing) {
                    return $existing;
                }
            }

            $wallet = $this->ensureWalletForCurrency(
                $user,
                $currency,
                $countryId ?? $user->country_id,
            );
            $locked = FiatWallet::query()->whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            $newBalance = bcadd((string) $locked->balance, $amount, 2);
            $locked->balance = $newBalance;
            $locked->save();

            // Keep legacy column loosely in sync for ZMW during transition.
            if (strtoupper($locked->currency) === 'ZMW') {
                User::query()->whereKey($user->id)->update(['account_balance' => $newBalance]);
            }

            return WalletLedgerEntry::create([
                'user_id' => $user->id,
                'fiat_wallet_id' => $locked->id,
                'direction' => WalletLedgerEntry::DIRECTION_CREDIT,
                'currency' => $locked->currency,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'metadata' => $metadata,
            ]);
        });
    }

    /**
     * Debit a currency wallet.
     */
    public function debit(
        User $user,
        string $amount,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
        string $description = '',
        string $currency = 'ZMW',
        array $metadata = [],
    ): WalletLedgerEntry {
        $amount = $this->normalizeAmount($amount);
        if ((float) $amount <= 0) {
            throw new RuntimeException('Debit amount must be positive.');
        }

        return DB::transaction(function () use (
            $user,
            $amount,
            $type,
            $referenceType,
            $referenceId,
            $description,
            $currency,
            $metadata,
        ) {
            $wallet = FiatWallet::query()
                ->where('user_id', $user->id)
                ->where('currency', strtoupper($currency))
                ->lockForUpdate()
                ->first();

            if (! $wallet) {
                throw new RuntimeException('No '.$currency.' wallet found. Bind a MoMo number for that country first.');
            }

            if (bccomp((string) $wallet->balance, $amount, 2) < 0) {
                throw new RuntimeException('Insufficient '.$wallet->currency.' wallet balance.');
            }

            $newBalance = bcsub((string) $wallet->balance, $amount, 2);
            $wallet->balance = $newBalance;
            $wallet->save();

            if (strtoupper($wallet->currency) === 'ZMW') {
                User::query()->whereKey($user->id)->update(['account_balance' => $newBalance]);
            }

            return WalletLedgerEntry::create([
                'user_id' => $user->id,
                'fiat_wallet_id' => $wallet->id,
                'direction' => WalletLedgerEntry::DIRECTION_DEBIT,
                'currency' => $wallet->currency,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'metadata' => $metadata,
            ]);
        });
    }

    public function normalizeAmount(string|float|int $amount): string
    {
        return number_format((float) $amount, 2, '.', '');
    }

    /**
     * Decimal places PawaPay accepts for a provider/currency.
     * Zero-decimal currencies (e.g. XOF) and some providers reject amounts like "10.00".
     */
    public function decimalsForPawaPay(?string $provider, ?string $currency = null): int
    {
        $provider = strtoupper(trim((string) $provider));
        $currency = strtoupper(trim((string) $currency));

        // Providers that have rejected fractional amounts in sandbox/live.
        $zeroDecimalProviders = [
            'ORANGE_SEN',
            'FREE_SEN',
            'EXPRESSO_SEN',
        ];
        if ($provider !== '' && in_array($provider, $zeroDecimalProviders, true)) {
            return 0;
        }

        $zeroDecimalCurrencies = [
            'XOF', 'XAF', 'UGX', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF',
            'VUV', 'PYG', 'CLP', 'ISK', 'JPY', 'KRW',
        ];
        if ($currency !== '' && in_array($currency, $zeroDecimalCurrencies, true)) {
            return 0;
        }

        return 2;
    }

    /**
     * Format an amount for a PawaPay deposit/payout payload.
     * Always returns a plain decimal string (never Eloquent decimal:8 padding).
     */
    public function normalizeAmountForProvider(
        string|float|int $amount,
        ?string $provider,
        ?string $currency = null,
    ): string {
        $decimals = $this->decimalsForPawaPay($provider, $currency);
        $formatted = number_format((float) $amount, $decimals, '.', '');

        if ((float) $formatted <= 0) {
            throw new RuntimeException('Amount must be greater than zero after provider rounding.');
        }

        return $formatted;
    }
}
