<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Currency;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    /**
     * @var array<int, array{name: string, iso2: string, iso3: string, currency_slug: string}>
     */
    private array $countries = [
        ['name' => 'Benin', 'iso2' => 'BJ', 'iso3' => 'BEN', 'currency_slug' => 'xof'],
        ['name' => 'Burkina Faso', 'iso2' => 'BF', 'iso3' => 'BFA', 'currency_slug' => 'xof'],
        ['name' => 'Cameroon', 'iso2' => 'CM', 'iso3' => 'CMR', 'currency_slug' => 'xaf'],
        ['name' => "Côte d'Ivoire", 'iso2' => 'CI', 'iso3' => 'CIV', 'currency_slug' => 'xof'],
        ['name' => 'Democratic Republic of the Congo', 'iso2' => 'CD', 'iso3' => 'COD', 'currency_slug' => 'cdf'],
        ['name' => 'Ethiopia', 'iso2' => 'ET', 'iso3' => 'ETH', 'currency_slug' => 'etb'],
        ['name' => 'Gabon', 'iso2' => 'GA', 'iso3' => 'GAB', 'currency_slug' => 'xaf'],
        ['name' => 'Ghana', 'iso2' => 'GH', 'iso3' => 'GHA', 'currency_slug' => 'ghs'],
        ['name' => 'Kenya', 'iso2' => 'KE', 'iso3' => 'KEN', 'currency_slug' => 'kes'],
        ['name' => 'Lesotho', 'iso2' => 'LS', 'iso3' => 'LSO', 'currency_slug' => 'lsl'],
        ['name' => 'Malawi', 'iso2' => 'MW', 'iso3' => 'MWI', 'currency_slug' => 'mwk'],
        ['name' => 'Mozambique', 'iso2' => 'MZ', 'iso3' => 'MOZ', 'currency_slug' => 'mzn'],
        ['name' => 'Nigeria', 'iso2' => 'NG', 'iso3' => 'NGA', 'currency_slug' => 'ngn'],
        ['name' => 'Republic of the Congo', 'iso2' => 'CG', 'iso3' => 'COG', 'currency_slug' => 'xaf'],
        ['name' => 'Rwanda', 'iso2' => 'RW', 'iso3' => 'RWA', 'currency_slug' => 'rwf'],
        ['name' => 'Senegal', 'iso2' => 'SN', 'iso3' => 'SEN', 'currency_slug' => 'xof'],
        ['name' => 'Sierra Leone', 'iso2' => 'SL', 'iso3' => 'SLE', 'currency_slug' => 'sle'],
        ['name' => 'Tanzania', 'iso2' => 'TZ', 'iso3' => 'TZA', 'currency_slug' => 'tzs'],
        ['name' => 'Uganda', 'iso2' => 'UG', 'iso3' => 'UGA', 'currency_slug' => 'ugx'],
        ['name' => 'Zambia', 'iso2' => 'ZM', 'iso3' => 'ZMB', 'currency_slug' => 'zmw'],
        ['name' => 'Zimbabwe', 'iso2' => 'ZW', 'iso3' => 'ZWE', 'currency_slug' => 'usd'],
        // Orchestration-only on PawaPay Fees (no public provider codes yet)
        ['name' => 'Liberia', 'iso2' => 'LR', 'iso3' => 'LBR', 'currency_slug' => 'lrd'],
        ['name' => 'Mali', 'iso2' => 'ML', 'iso3' => 'MLI', 'currency_slug' => 'xof'],
        ['name' => 'South Sudan', 'iso2' => 'SS', 'iso3' => 'SSD', 'currency_slug' => 'ssp'],
    ];

    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $currencyIds = Currency::query()
            ->pluck('id', 'currency_slug');

        foreach ($this->countries as $country) {
            $currencyId = $currencyIds[$country['currency_slug']] ?? null;
            if (! $currencyId) {
                continue;
            }

            Country::updateOrCreate(
                ['iso3' => $country['iso3']],
                [
                    'name' => $country['name'],
                    'iso2' => $country['iso2'],
                    'currency_id' => $currencyId,
                ]
            );
        }
    }
}
