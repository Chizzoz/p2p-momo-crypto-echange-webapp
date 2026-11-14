/** Currencies PawaPay / MNOs typically accept as whole units only. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'XOF',
  'XAF',
  'UGX',
  'RWF',
  'BIF',
  'DJF',
  'GNF',
  'KMF',
  'VUV',
  'PYG',
  'CLP',
  'ISK',
  'JPY',
  'KRW',
]);

/** Providers known to reject fractional amounts even when the currency usually allows them. */
const ZERO_DECIMAL_PROVIDERS = new Set([
  'ORANGE_SEN',
  'FREE_SEN',
  'EXPRESSO_SEN',
]);

export function fiatDecimalsForProvider(
  provider?: string | null,
  currency?: string | null,
): number {
  const p = (provider || '').toUpperCase();
  const c = (currency || '').toUpperCase();
  if (p && ZERO_DECIMAL_PROVIDERS.has(p)) {
    return 0;
  }
  if (c && ZERO_DECIMAL_CURRENCIES.has(c)) {
    return 0;
  }
  return 2;
}

export function fiatStep(decimals: number): string {
  if (decimals <= 0) {
    return '1';
  }
  return `0.${'0'.repeat(decimals - 1)}1`;
}

/** Count fractional digits in a user-entered amount string. */
export function fractionalDigitCount(value: string): number {
  const match = String(value).trim().match(/\.(\d+)/);
  return match ? match[1].length : 0;
}
