import React, { useMemo } from 'react';
import CountryFlag from '@/Components/CountryFlag';
import MnoLogo from '@/Components/MnoLogo';
import { groupMarketsByCountry } from '@/lib/mnoBrand';
import { CountryOption, PaymentMethodOption } from '@/types';

type Props = {
  countries: CountryOption[];
  paymentMethods: PaymentMethodOption[];
};

export default function MarketsDirectory({
  countries,
  paymentMethods,
}: Props) {
  const markets = useMemo(
    () => groupMarketsByCountry(countries, paymentMethods),
    [countries, paymentMethods],
  );

  if (markets.length === 0) {
    return (
      <p className="text-ink-muted">
        Mobile money markets will appear here once providers are seeded.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {markets.map(country => (
        <div
          key={country.id}
          className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <CountryFlag iso2={country.iso2} name={country.name} />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-ink">
                {country.name}
              </p>
              <p className="text-xs text-ink-muted">
                {country.methods.length} network
                {country.methods.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {country.methods.map(method => (
              <MnoLogo key={method.id} method={method} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
