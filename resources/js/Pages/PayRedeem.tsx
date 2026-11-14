import { Link } from '@inertiajs/react';
import React, { FormEvent, useMemo, useState } from 'react';
import CountryFlag from '@/Components/CountryFlag';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import MnoLogo from '@/Components/MnoLogo';
import TextInput from '@/Components/TextInput';
import MarketingLayout from '@/Layouts/MarketingLayout';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import { detectMsisdn, formatMsisdnDisplay } from '@/lib/msisdn';
import { CountryOption, PaymentMethodOption } from '@/types';

type FormState = 'idle' | 'reviewing' | 'submitting' | 'pending' | 'error';

export default function PayRedeem() {
  const page = useTypedPage();
  const route = useRoute();
  const countries = (page.props.countries as CountryOption[]) || [];
  const paymentMethods =
    (page.props.payment_methods as PaymentMethodOption[]) || [];

  const [amount, setAmount] = useState('');
  const [mobile, setMobile] = useState('');
  const [countryIso3, setCountryIso3] = useState(
    countries[0]?.iso3 || 'ZMB',
  );
  const [methodSlug, setMethodSlug] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const selectedCountry =
    countries.find(country => country.iso3 === countryIso3) || null;

  const detection = useMemo(
    () => (mobile ? detectMsisdn(mobile, countryIso3) : null),
    [mobile, countryIso3],
  );

  const networks = useMemo(() => {
    if (!selectedCountry) {
      return [] as PaymentMethodOption[];
    }
    return paymentMethods.filter(
      method => method.country_id === selectedCountry.id,
    );
  }, [paymentMethods, selectedCountry]);

  const selectedMethod =
    networks.find(method => method.method_slug === methodSlug) ||
    networks.find(
      method => method.method_slug === detection?.suggestedMethodSlug,
    ) ||
    networks[0] ||
    null;

  function goToReview(event: FormEvent) {
    event.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setFormState('error');
      setStatusMessage('Enter a USDT amount greater than zero.');
      return;
    }
    if (!mobile || !selectedCountry || !selectedMethod) {
      setFormState('error');
      setStatusMessage('Add recipient mobile, country, and network.');
      return;
    }
    setFormState('reviewing');
    setStatusMessage('');
  }

  async function submitPayment() {
    setFormState('submitting');
    setStatusMessage('Preparing EmpiyaPayments…');

    // UI shell first — wire getEmpiyaPayments().pay(...) in a follow-up.
    await new Promise(resolve => setTimeout(resolve, 700));
    setFormState('pending');
    setStatusMessage(
      'Pay & redeem UI is ready. On-chain EmpiyaPayments settlement comes next — your details were not submitted.',
    );
  }

  return (
    <MarketingLayout title="Pay USDT & redeem MoMo">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-emerald">
          Pay &amp; redeem
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">
          Pay with USDT. Redeem as mobile money.
        </h1>
        <p className="mt-3 text-ink-muted">
          Lock USDT for a recipient who collects fiat on their MoMo wallet.
          Contract wiring lands after this UI shell.
        </p>

        <form
          onSubmit={goToReview}
          className="mt-10 space-y-6 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft sm:p-8"
        >
          <div>
            <InputLabel htmlFor="amount" value="USDT amount" />
            <TextInput
              id="amount"
              type="number"
              min="0"
              step="0.01"
              className="mt-1 block w-full"
              value={amount}
              onChange={e => setAmount(e.currentTarget.value)}
              required
            />
          </div>

          <div>
            <InputLabel htmlFor="country" value="Recipient country" />
            <select
              id="country"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald focus:ring-emerald"
              value={countryIso3}
              onChange={e => {
                setCountryIso3(e.currentTarget.value);
                setMethodSlug('');
              }}
            >
              {countries.map(country => (
                <option key={country.id} value={country.iso3}>
                  {country.name}
                </option>
              ))}
            </select>
            {selectedCountry && (
              <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                <CountryFlag
                  iso2={selectedCountry.iso2}
                  name={selectedCountry.name}
                />
                {selectedCountry.name}
              </div>
            )}
          </div>

          <div>
            <InputLabel htmlFor="mobile" value="Recipient mobile number" />
            <TextInput
              id="mobile"
              type="tel"
              className="mt-1 block w-full"
              value={mobile}
              onChange={e => setMobile(e.currentTarget.value)}
              placeholder="+260…"
              required
            />
            {detection?.e164 && (
              <p className="mt-1 text-xs text-ink-muted">
                Detected {formatMsisdnDisplay(detection.e164)}
              </p>
            )}
          </div>

          <div>
            <InputLabel htmlFor="network" value="Mobile network" />
            <div className="mt-2 flex flex-wrap gap-2">
              {networks.map(method => {
                const active =
                  (methodSlug || selectedMethod?.method_slug) ===
                  method.method_slug;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setMethodSlug(method.method_slug)}
                    className={`rounded-xl border p-1 transition ${
                      active
                        ? 'border-emerald ring-2 ring-emerald/30'
                        : 'border-[var(--line)]'
                    }`}
                  >
                    <MnoLogo method={method} />
                  </button>
                );
              })}
            </div>
            {!networks.length && (
              <InputError
                message="No networks for this country yet."
                className="mt-2"
              />
            )}
          </div>

          {formState !== 'reviewing' &&
            formState !== 'submitting' &&
            formState !== 'pending' && (
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
              >
                Review payment
              </button>
            )}

          {(formState === 'reviewing' ||
            formState === 'submitting' ||
            formState === 'pending') && (
            <div className="rounded-xl border border-[var(--line)] bg-paper p-4 text-sm">
              <p className="font-display text-lg font-semibold text-ink">
                Review
              </p>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">You pay</dt>
                  <dd className="font-semibold text-ink">{amount} USDT</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Recipient</dt>
                  <dd className="text-right font-medium text-ink">
                    {mobile}
                    <br />
                    <span className="text-ink-muted">
                      {selectedCountry?.name} · {selectedMethod?.method}
                    </span>
                  </dd>
                </div>
              </dl>
              {formState === 'reviewing' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState('idle')}
                    className="rounded-lg border border-[var(--line)] px-4 py-2 font-semibold text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitPayment()}
                    className="rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-emerald-deep"
                  >
                    Pay USDT
                  </button>
                </div>
              )}
              {formState === 'submitting' && (
                <p className="mt-3 text-ink-muted">{statusMessage}</p>
              )}
              {formState === 'pending' && (
                <div className="mt-3 space-y-3">
                  <p className="text-emerald">{statusMessage}</p>
                  <Link
                    href={route('home')}
                    className="inline-flex font-semibold text-ink underline"
                  >
                    Back to home
                  </Link>
                </div>
              )}
            </div>
          )}

          {formState === 'error' && (
            <InputError message={statusMessage} className="mt-2" />
          )}
        </form>
      </div>
    </MarketingLayout>
  );
}
