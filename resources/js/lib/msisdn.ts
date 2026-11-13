/** Lightweight MSISDN helpers for Empiya listing recipient MoMo selection. */

export type DetectedMsisdn = {
  e164: string;
  national: string;
  countryIso3: string | null;
  /** Local prefix used for MNO detection (e.g. "97" for Airtel ZM). */
  networkPrefix: string | null;
  /** Suggested payment method slug when known (e.g. airtel-money-zmb). */
  suggestedMethodSlug: string | null;
  /** Human label for suggested network. */
  suggestedNetworkLabel: string | null;
};

const DIGITS = /\D/g;

/** Dial codes for seeded PawaPay markets (longest match first). */
const COUNTRY_DIAL_CODES: Array<{ iso3: string; dial: string }> = [
  { iso3: 'COD', dial: '243' },
  { iso3: 'ETH', dial: '251' },
  { iso3: 'KEN', dial: '254' },
  { iso3: 'TZA', dial: '255' },
  { iso3: 'UGA', dial: '256' },
  { iso3: 'MOZ', dial: '258' },
  { iso3: 'ZMB', dial: '260' },
  { iso3: 'MDG', dial: '261' }, // unused in seed; kept for completeness
  { iso3: 'ZWE', dial: '263' },
  { iso3: 'MWI', dial: '265' },
  { iso3: 'LSO', dial: '266' },
  { iso3: 'BWA', dial: '267' },
  { iso3: 'SSD', dial: '211' },
  { iso3: 'NGA', dial: '234' },
  { iso3: 'GHA', dial: '233' },
  { iso3: 'CIV', dial: '225' },
  { iso3: 'SEN', dial: '221' },
  { iso3: 'SLE', dial: '232' },
  { iso3: 'LBR', dial: '231' },
  { iso3: 'MLI', dial: '223' },
  { iso3: 'BFA', dial: '226' },
  { iso3: 'BEN', dial: '229' },
  { iso3: 'CMR', dial: '237' },
  { iso3: 'GAB', dial: '241' },
  { iso3: 'COG', dial: '242' },
  { iso3: 'RWA', dial: '250' },
].sort((a, b) => b.dial.length - a.dial.length);

/**
 * Zambia national number (9 digits) MNO prefixes.
 * @see common Zambian MoMo MSISDN ranges
 */
const ZAMBIA_PREFIX_TO_METHOD: Array<{
  prefixes: string[];
  slug: string;
  label: string;
}> = [
  { prefixes: ['96', '76'], slug: 'mtn-momo-zmb', label: 'MTN MoMo' },
  { prefixes: ['97', '77'], slug: 'airtel-money-zmb', label: 'Airtel Money' },
  { prefixes: ['95', '75'], slug: 'zamtel-kwacha-zmb', label: 'Zamtel Kwacha' },
];

export function normalizeMsisdnDigits(input: string): string {
  return String(input || '').replace(DIGITS, '');
}

/**
 * Normalize a user-entered mobile number into E.164-ish digits (no +).
 * Zambia local numbers starting with 0 are rewritten to 260…
 */
export function toE164Digits(
  input: string,
  defaultCountryIso3: string | null = 'ZMB',
): string {
  let digits = normalizeMsisdnDigits(input);
  if (!digits) {
    return '';
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Local Zambia: 09xxxxxxxx / 07xxxxxxxx
  if (
    defaultCountryIso3 === 'ZMB' &&
    digits.startsWith('0') &&
    digits.length === 10
  ) {
    return `260${digits.slice(1)}`;
  }

  // Bare 9-digit Zambia national
  if (
    defaultCountryIso3 === 'ZMB' &&
    digits.length === 9 &&
    /^[79]/.test(digits)
  ) {
    return `260${digits}`;
  }

  return digits;
}

function detectCountryIso3(e164Digits: string): string | null {
  for (const { iso3, dial } of COUNTRY_DIAL_CODES) {
    if (e164Digits.startsWith(dial)) {
      return iso3;
    }
  }
  return null;
}

function detectZambiaNetwork(national: string): {
  prefix: string | null;
  slug: string | null;
  label: string | null;
} {
  const prefix = national.slice(0, 2);
  for (const row of ZAMBIA_PREFIX_TO_METHOD) {
    if (row.prefixes.includes(prefix)) {
      return { prefix, slug: row.slug, label: row.label };
    }
  }
  return { prefix: prefix || null, slug: null, label: null };
}

/**
 * Detect country + suggested MoMo network from a mobile number.
 * Network auto-detect is implemented for Zambia; other markets return country only.
 */
export function detectMsisdn(
  input: string,
  defaultCountryIso3: string | null = 'ZMB',
): DetectedMsisdn | null {
  const e164 = toE164Digits(input, defaultCountryIso3);
  if (e164.length < 10) {
    return null;
  }

  const countryIso3 = detectCountryIso3(e164);
  let national = e164;
  let networkPrefix: string | null = null;
  let suggestedMethodSlug: string | null = null;
  let suggestedNetworkLabel: string | null = null;

  if (countryIso3) {
    const dial =
      COUNTRY_DIAL_CODES.find(row => row.iso3 === countryIso3)?.dial || '';
    national = e164.slice(dial.length);
  }

  if (countryIso3 === 'ZMB') {
    const detected = detectZambiaNetwork(national);
    networkPrefix = detected.prefix;
    suggestedMethodSlug = detected.slug;
    suggestedNetworkLabel = detected.label;
  }

  return {
    e164: `+${e164}`,
    national,
    countryIso3,
    networkPrefix,
    suggestedMethodSlug,
    suggestedNetworkLabel,
  };
}

export function formatMsisdnDisplay(input: string | null | undefined): string {
  if (!input) {
    return '';
  }
  const detected = detectMsisdn(input);
  return detected?.e164 || input;
}
