import { CountryOption, PaymentMethodOption } from '@/types';

export type MnoBrandKey =
  | 'mtn'
  | 'airtel'
  | 'orange'
  | 'mpesa'
  | 'vodacom'
  | 'wave'
  | 'moov'
  | 'zamtel'
  | 'telebirr'
  | 'cbebirr'
  | 'airteltigo'
  | 'telecel'
  | 'tnm'
  | 'movitel'
  | 'yas'
  | 'halotel'
  | 'ecocash'
  | 'unknown';

const BRAND_LABELS: Record<MnoBrandKey, string> = {
  mtn: 'MTN MoMo',
  airtel: 'Airtel Money',
  orange: 'Orange',
  mpesa: 'M-Pesa',
  vodacom: 'Vodacom M-Pesa',
  wave: 'Wave',
  moov: 'Moov',
  zamtel: 'Zamtel',
  telebirr: 'Telebirr',
  cbebirr: 'CBE Birr',
  airteltigo: 'AirtelTigo',
  telecel: 'Telecel',
  tnm: 'TNM Mpamba',
  movitel: 'Movitel',
  yas: 'Yas',
  halotel: 'Halotel',
  ecocash: 'EcoCash',
  unknown: 'Mobile money',
};

/** Brands with raster logos under /public/images/mno */
const LOGO_FILES: Partial<Record<MnoBrandKey, string>> = {
  mtn: 'mtn.png',
  airtel: 'airtel.png',
  orange: 'orange.png',
  mpesa: 'mpesa.png',
  vodacom: 'vodacom.png',
  wave: 'wave.png',
  moov: 'moov.png',
  zamtel: 'zamtel.png',
  telebirr: 'telebirr.png',
  airteltigo: 'airteltigo.png',
  telecel: 'telecel.png',
  tnm: 'tnm.png',
  movitel: 'movitel.png',
  yas: 'yas.png',
  halotel: 'halotel.png',
  ecocash: 'ecocash.png',
  // cbebirr: no reliable public mark yet — text fallback
};

export function flagUrl(iso2: string, width = 40): string {
  return `https://flagcdn.com/w${width}/${iso2.toLowerCase()}.png`;
}

export function flagSrcSet(iso2: string): string {
  const code = iso2.toLowerCase();
  return `https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`;
}

export function resolveMnoBrandKey(
  method: Pick<PaymentMethodOption, 'method' | 'pawapay_provider'>,
): MnoBrandKey {
  const provider = (method.pawapay_provider || '').toUpperCase();
  const name = (method.method || '').toUpperCase();
  const haystack = `${provider} ${name}`;

  if (haystack.includes('AIRTELTIGO')) return 'airteltigo';
  if (haystack.includes('AIRTEL')) return 'airtel';
  if (haystack.includes('MTN')) return 'mtn';
  if (haystack.includes('ORANGE')) return 'orange';
  if (haystack.includes('VODACOM')) return 'vodacom';
  if (haystack.includes('MPESA') || haystack.includes('M-PESA')) return 'mpesa';
  if (haystack.includes('WAVE')) return 'wave';
  if (haystack.includes('MOOV')) return 'moov';
  if (haystack.includes('ZAMTEL')) return 'zamtel';
  if (haystack.includes('TELEBIRR')) return 'telebirr';
  if (haystack.includes('CBE')) return 'cbebirr';
  if (haystack.includes('VODAFONE') || haystack.includes('TELECEL')) {
    return 'telecel';
  }
  if (haystack.includes('TNM')) return 'tnm';
  if (haystack.includes('MOVITEL') || haystack.includes('EMOLA')) {
    return 'movitel';
  }
  if (
    haystack.includes('FREE_') ||
    haystack.includes('TIGO') ||
    haystack.includes('YAS') ||
    haystack.includes('MIXX')
  ) {
    return 'yas';
  }
  if (haystack.includes('HALOTEL')) return 'halotel';
  if (haystack.includes('ECOCASH')) return 'ecocash';

  return 'unknown';
}

export function mnoLogoPath(brand: MnoBrandKey): string | null {
  const file = LOGO_FILES[brand];
  if (!file) {
    return null;
  }
  return `/images/mno/${file}`;
}

export function mnoBrandLabel(
  brand: MnoBrandKey,
  fallback?: string,
): string {
  if (brand === 'unknown' && fallback) {
    return fallback;
  }
  return BRAND_LABELS[brand];
}

export type MarketCountry = CountryOption & {
  methods: PaymentMethodOption[];
};

export function groupMarketsByCountry(
  countries: CountryOption[],
  paymentMethods: PaymentMethodOption[],
): MarketCountry[] {
  return countries
    .map(country => ({
      ...country,
      methods: paymentMethods.filter(
        method => method.country_id === country.id,
      ),
    }))
    .filter(country => country.methods.length > 0);
}
