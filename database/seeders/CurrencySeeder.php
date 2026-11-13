<?php

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    /**
     * Placeholder rates = local units per 1 USDT (indicative only; not live FX).
     *
     * @var array<int, array{currency: string, symbol: string, rate: string, currency_slug: string}>
     */
    private array $currencies = [
        ['currency' => 'Zambian Kwacha', 'symbol' => 'K', 'rate' => '27.5000', 'currency_slug' => 'zmw'],
        ['currency' => 'West African CFA Franc', 'symbol' => 'CFA', 'rate' => '600.0000', 'currency_slug' => 'xof'],
        ['currency' => 'Central African CFA Franc', 'symbol' => 'FCFA', 'rate' => '600.0000', 'currency_slug' => 'xaf'],
        ['currency' => 'Congolese Franc', 'symbol' => 'FC', 'rate' => '2850.0000', 'currency_slug' => 'cdf'],
        ['currency' => 'Ethiopian Birr', 'symbol' => 'Br', 'rate' => '120.0000', 'currency_slug' => 'etb'],
        ['currency' => 'Ghanaian Cedi', 'symbol' => 'GH₵', 'rate' => '15.5000', 'currency_slug' => 'ghs'],
        ['currency' => 'Kenyan Shilling', 'symbol' => 'KSh', 'rate' => '129.0000', 'currency_slug' => 'kes'],
        ['currency' => 'Lesotho Loti', 'symbol' => 'L', 'rate' => '18.0000', 'currency_slug' => 'lsl'],
        ['currency' => 'Malawian Kwacha', 'symbol' => 'MK', 'rate' => '1730.0000', 'currency_slug' => 'mwk'],
        ['currency' => 'Mozambican Metical', 'symbol' => 'MT', 'rate' => '64.0000', 'currency_slug' => 'mzn'],
        ['currency' => 'Nigerian Naira', 'symbol' => '₦', 'rate' => '1600.0000', 'currency_slug' => 'ngn'],
        ['currency' => 'Rwandan Franc', 'symbol' => 'FRw', 'rate' => '1350.0000', 'currency_slug' => 'rwf'],
        ['currency' => 'Sierra Leonean Leone', 'symbol' => 'Le', 'rate' => '22.5000', 'currency_slug' => 'sle'],
        ['currency' => 'Tanzanian Shilling', 'symbol' => 'TSh', 'rate' => '2650.0000', 'currency_slug' => 'tzs'],
        ['currency' => 'Ugandan Shilling', 'symbol' => 'USh', 'rate' => '3700.0000', 'currency_slug' => 'ugx'],
        ['currency' => 'US Dollar', 'symbol' => '$', 'rate' => '1.0000', 'currency_slug' => 'usd'],
        ['currency' => 'Liberian Dollar', 'symbol' => 'L$', 'rate' => '190.0000', 'currency_slug' => 'lrd'],
        ['currency' => 'South Sudanese Pound', 'symbol' => 'SSP', 'rate' => '1300.0000', 'currency_slug' => 'ssp'],
    ];

    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        foreach ($this->currencies as $currency) {
            Currency::updateOrCreate(
                ['currency_slug' => $currency['currency_slug']],
                $currency
            );
        }
    }
}
