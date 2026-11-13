<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PaymentMethodSeeder extends Seeder
{
    /**
     * PawaPay provider codes from https://docs.pawapay.io/v2/docs/providers
     *
     * @var array<string, array<int, array{method: string, provider: string}>>
     */
    private array $mnosByIso3 = [
        'BEN' => [
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_BEN'],
            ['method' => 'Moov', 'provider' => 'MOOV_BEN'],
        ],
        'BFA' => [
            ['method' => 'Moov', 'provider' => 'MOOV_BFA'],
            ['method' => 'Orange', 'provider' => 'ORANGE_BFA'],
        ],
        'CMR' => [
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_CMR'],
            ['method' => 'Orange', 'provider' => 'ORANGE_CMR'],
        ],
        'CIV' => [
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_CIV'],
            ['method' => 'Orange', 'provider' => 'ORANGE_CIV'],
            ['method' => 'Moov', 'provider' => 'MOOV_CIV'],
            ['method' => 'Wave', 'provider' => 'WAVE_CIV'],
        ],
        'COD' => [
            ['method' => 'Vodacom M-Pesa', 'provider' => 'VODACOM_MPESA_COD'],
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_COD'],
            ['method' => 'Orange', 'provider' => 'ORANGE_COD'],
        ],
        'ETH' => [
            ['method' => 'Safaricom M-Pesa', 'provider' => 'MPESA_ETH'],
            ['method' => 'Telebirr', 'provider' => 'TELEBIRR_ETH'],
            ['method' => 'CBE Birr', 'provider' => 'CBE_BIRR_ETH'],
        ],
        'GAB' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_GAB'],
            ['method' => 'Moov', 'provider' => 'MOOV_GAB'],
        ],
        'GHA' => [
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_GHA'],
            ['method' => 'AirtelTigo', 'provider' => 'AIRTELTIGO_GHA'],
            ['method' => 'Telecel', 'provider' => 'VODAFONE_GHA'],
        ],
        'KEN' => [
            ['method' => 'M-Pesa', 'provider' => 'MPESA_KEN'],
        ],
        'LSO' => [
            ['method' => 'Vodacom M-Pesa', 'provider' => 'MPESA_LSO'],
        ],
        'MWI' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_MWI'],
            ['method' => 'TNM Mpamba', 'provider' => 'TNM_MWI'],
        ],
        'MOZ' => [
            ['method' => 'Movitel', 'provider' => 'MOVITEL_MOZ'],
            ['method' => 'Vodacom M-Pesa', 'provider' => 'VODACOM_MOZ'],
        ],
        'NGA' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_NGA'],
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_NGA'],
        ],
        'COG' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_COG'],
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_COG'],
        ],
        'RWA' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_RWA'],
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_RWA'],
        ],
        'SEN' => [
            ['method' => 'Yas (Free)', 'provider' => 'FREE_SEN'],
            ['method' => 'Orange', 'provider' => 'ORANGE_SEN'],
            ['method' => 'Wave', 'provider' => 'WAVE_SEN'],
        ],
        'SLE' => [
            ['method' => 'Orange', 'provider' => 'ORANGE_SLE'],
        ],
        'TZA' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_TZA'],
            ['method' => 'Vodacom M-Pesa', 'provider' => 'VODACOM_TZA'],
            ['method' => 'Yas (Tigo)', 'provider' => 'TIGO_TZA'],
            ['method' => 'Halotel', 'provider' => 'HALOTEL_TZA'],
        ],
        'UGA' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_OAPI_UGA'],
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_UGA'],
        ],
        'ZMB' => [
            ['method' => 'Airtel Money', 'provider' => 'AIRTEL_OAPI_ZMB'],
            ['method' => 'MTN MoMo', 'provider' => 'MTN_MOMO_ZMB'],
            ['method' => 'Zamtel Kwacha', 'provider' => 'ZAMTEL_ZMB'],
        ],
        'ZWE' => [
            ['method' => 'EcoCash', 'provider' => 'ECOCASH_ZWE'],
        ],
    ];

    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        PaymentMethod::updateOrCreate(
            ['method_slug' => 'card'],
            [
                'method' => 'Card',
                'country_id' => null,
                'pawapay_provider' => null,
            ]
        );

        $countries = Country::query()->pluck('id', 'iso3');

        foreach ($this->mnosByIso3 as $iso3 => $mnos) {
            $countryId = $countries[$iso3] ?? null;
            if (! $countryId) {
                continue;
            }

            foreach ($mnos as $mno) {
                $slug = Str::slug($mno['method']).'-'.Str::lower($iso3);

                PaymentMethod::updateOrCreate(
                    ['pawapay_provider' => $mno['provider']],
                    [
                        'country_id' => $countryId,
                        'method' => $mno['method'],
                        'method_slug' => $slug,
                    ]
                );
            }
        }
    }
}
