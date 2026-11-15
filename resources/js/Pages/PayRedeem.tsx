import { Link, router } from '@inertiajs/react';
import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import CountryFlag from '@/Components/CountryFlag';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import MnoLogo from '@/Components/MnoLogo';
import TextInput from '@/Components/TextInput';
import WaitingIndicator from '@/Components/WaitingIndicator';
import MarketingLayout from '@/Layouts/MarketingLayout';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import { chainConfig } from '@/lib/chain';
import {
  ensureSepoliaChain,
  ensureUsdtAllowance,
  formatTxError,
  getBrowserSigner,
  getEmpiyaPayments,
} from '@/lib/contracts';
import { fractionalDigitCount } from '@/lib/fiatDecimals';
import { detectMsisdn, formatMsisdnDisplay } from '@/lib/msisdn';
import {
  clearPendingPayRedeemId,
  getPendingPayRedeemId,
  setPendingPayRedeemId,
} from '@/lib/payRedeemPending';
import { parseUsdt } from '@/lib/units';
import { CountryOption, PaymentMethodOption } from '@/types';
import {
  formatPayRedeemFiatInput,
  isTerminalPayRedeemStatus,
  PayRedeemRow,
  payRedeemStatusTone,
  shortenPaymentId,
} from '@/types/payRedeem';

type FormState = 'idle' | 'reviewing' | 'submitting' | 'pending' | 'error';

const FIAT_MAX_DECIMALS = 2;

export default function PayRedeem() {
  const page = useTypedPage();
  const route = useRoute();
  const user = page.props.user;
  const countries = (page.props.countries as CountryOption[]) || [];
  const paymentMethods =
    (page.props.payment_methods as PaymentMethodOption[]) || [];
  const initialRedeems =
    ((page.props as any).pay_redeems as PayRedeemRow[]) || [];
  const repeatPayment =
    ((page.props as any).repeat_payment as PayRedeemRow | null) || null;

  const [amount, setAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [mobile, setMobile] = useState('');
  const [countryIso3, setCountryIso3] = useState(
    countries[0]?.iso3 || 'ZMB',
  );
  const [methodSlug, setMethodSlug] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [payRedeems, setPayRedeems] = useState<PayRedeemRow[]>(initialRedeems);
  const [activeTransferId, setActiveTransferId] = useState<number | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [repeatingId, setRepeatingId] = useState<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const bootstrappedRef = useRef(false);
  const formSectionRef = useRef<HTMLFormElement | null>(null);

  const selectedCountry =
    countries.find(country => country.iso3 === countryIso3) || null;

  const detection = useMemo(
    () => (mobile ? detectMsisdn(mobile, countryIso3) : null),
    [mobile, countryIso3],
  );

  // Recipient country owns both the currency and the network list.
  const currency = (
    selectedCountry?.currency_code ||
    ''
  ).toUpperCase();

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

  const inFlight = payRedeems.filter(
    row => !isTerminalPayRedeemStatus(row.status),
  );

  useEffect(() => {
    setPayRedeems(initialRedeems);
  }, [initialRedeems]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  function applyRepeat(source: PayRedeemRow) {
    const byProvider = paymentMethods.find(
      method =>
        method.pawapay_provider &&
        method.pawapay_provider === source.provider,
    );
    const country =
      (byProvider
        ? countries.find(c => c.id === byProvider.country_id)
        : null) ||
      countries.find(
        c =>
          String(c.currency_code || '').toUpperCase() ===
          String(source.currency || '').toUpperCase(),
      ) ||
      countries[0] ||
      null;

    const countryNetworks = country
      ? paymentMethods.filter(method => method.country_id === country.id)
      : [];
    const method =
      (byProvider && countryNetworks.some(n => n.id === byProvider.id)
        ? byProvider
        : null) ||
      countryNetworks[0] ||
      null;

    setCountryIso3(country?.iso3 || 'ZMB');
    setMethodSlug(method?.method_slug || '');
    setAmount(source.usdt_amount ? String(source.usdt_amount) : '');
    setFiatAmount(formatPayRedeemFiatInput(source.amount));
    setMobile(source.phone || '');
    setRepeatingId(source.id);
    setActiveTransferId(null);
    setFormState('reviewing');
    setStatusMessage('');
    window.setTimeout(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  // Prefer explicit ?repeat= prefill; otherwise resume a session pending payout.
  useEffect(() => {
    if (!user || bootstrappedRef.current) {
      return;
    }
    bootstrappedRef.current = true;

    if (repeatPayment) {
      applyRepeat(repeatPayment);
      return;
    }

    const pendingId = getPendingPayRedeemId();
    if (pendingId) {
      setActiveTransferId(pendingId);
      setFormState('pending');
      setStatusMessage(
        'Resuming payout status check after refresh. Waiting for MoMo confirmation…',
      );
      void pollTransfer(pendingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function upsertRedeem(row: PayRedeemRow) {
    setPayRedeems(current => {
      const without = current.filter(item => item.id !== row.id);
      return [row, ...without].sort((a, b) => b.id - a.id);
    });
  }

  function resetFormFields() {
    setAmount('');
    setFiatAmount('');
    setMobile('');
    setMethodSlug('');
    setRepeatingId(null);
  }

  function goToReview(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setFormState('error');
      setStatusMessage('Log in to pay and redeem.');
      return;
    }
    if (!selectedCountry || !currency) {
      setFormState('error');
      setStatusMessage('Choose a recipient country with a supported currency.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setFormState('error');
      setStatusMessage('Enter a USDT amount greater than zero.');
      return;
    }
    if (!fiatAmount || Number(fiatAmount) <= 0) {
      setFormState('error');
      setStatusMessage(`Enter the MoMo fiat amount in ${currency}.`);
      return;
    }
    if (fractionalDigitCount(fiatAmount) > FIAT_MAX_DECIMALS) {
      setFormState('error');
      setStatusMessage(
        `Fiat amount allows at most ${FIAT_MAX_DECIMALS} decimal places.`,
      );
      return;
    }
    if (!mobile || !selectedMethod) {
      setFormState('error');
      setStatusMessage('Add recipient mobile and choose a network for that country.');
      return;
    }
    setFormState('reviewing');
    setStatusMessage('');
  }

  async function submitPayment() {
    if (!selectedMethod?.pawapay_provider) {
      setFormState('error');
      setStatusMessage('Selected network is missing a PawaPay provider.');
      return;
    }

    setFormState('submitting');
    setStatusMessage('Approving USDT and calling EmpiyaPayments.pay…');

    try {
      await ensureSepoliaChain();
      const signer = await getBrowserSigner();
      const payer = await signer.getAddress();
      const payments = getEmpiyaPayments(signer);
      const paymentsAddress = chainConfig.empiyaPayments();
      if (!paymentsAddress) {
        throw new Error('EmpiyaPayments address is not configured.');
      }

      const amountBn = parseUsdt(amount);
      await ensureUsdtAllowance(payer, paymentsAddress, amountBn, signer);

      const paymentId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const payTx = await payments.pay(paymentId, amountBn);
      await payTx.wait();

      setStatusMessage('On-chain pay confirmed. Starting MoMo payout…');

      const { data } = await axios.post(route('pay_redeem.store'), {
        payment_id: paymentId,
        amount_usdt: amount,
        fiat_amount: fiatAmount,
        currency,
        phone: mobile,
        provider: selectedMethod.pawapay_provider,
        payment_method_id: selectedMethod.id,
      });

      setFormState('pending');
      setStatusMessage(
        data.message ||
          'MoMo payout started. On-chain settle runs after PawaPay confirms.',
      );

      if (data.transfer?.id) {
        const row = data.transfer as PayRedeemRow;
        upsertRedeem(row);
        setActiveTransferId(row.id);
        setPendingPayRedeemId(row.id);
        void pollTransfer(row.id);
      }
    } catch (error: any) {
      setFormState('error');
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        null;
      setStatusMessage(
        apiMessage || formatTxError(error) || 'Pay & redeem failed.',
      );
    }
  }

  async function pollTransfer(id: number) {
    try {
      const { data } = await axios.get(route('momo_transfers.status', id));
      const transfer = data.transfer;
      const status = String(transfer?.status || '').toUpperCase();
      const meta = transfer?.metadata || {};
      const row: PayRedeemRow = {
        id: Number(transfer?.id || id),
        status: String(transfer?.status || 'PENDING'),
        amount: String(transfer?.amount ?? ''),
        currency: String(transfer?.currency || '').toUpperCase(),
        usdt_amount: meta.usdt_amount != null ? String(meta.usdt_amount) : null,
        payment_id: transfer?.payment_id ?? null,
        phone: transfer?.phone ?? null,
        provider: transfer?.provider ?? null,
        settled: Boolean(meta.settled),
        chain_refunded: Boolean(meta.chain_refunded),
        failure_message: meta.failure_message || meta.failure_code || null,
        created_at: transfer?.created_at ?? null,
      };
      upsertRedeem(row);

      if (status === 'COMPLETED') {
        clearPendingPayRedeemId();
        setActiveTransferId(null);
        resetFormFields();
        setFormState('idle');
        setStatusMessage(
          row.settled
            ? 'MoMo payout completed and on-chain settle finished.'
            : 'MoMo payout completed and on-chain settle has been requested.',
        );
        router.reload({ only: ['pay_redeems'] });
        return;
      }
      if (status === 'FAILED') {
        clearPendingPayRedeemId();
        setActiveTransferId(null);
        setFormState('error');
        setStatusMessage(
          row.chain_refunded
            ? 'MoMo payout failed. A chain refund was attempted.'
            : 'MoMo payout failed. A chain refund will be attempted.',
        );
        router.reload({ only: ['pay_redeems'] });
        return;
      }

      setActiveTransferId(id);
      setFormState('pending');
      setStatusMessage(
        'Approve any MoMo prompt if asked. Waiting for payout confirmation…',
      );
      pollTimerRef.current = window.setTimeout(() => pollTransfer(id), 8000);
    } catch {
      pollTimerRef.current = window.setTimeout(() => pollTransfer(id), 8000);
    }
  }

  async function checkStatus(id: number) {
    setCheckingId(id);
    try {
      await pollTransfer(id);
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <MarketingLayout title="Pay with USDT · redeem as MoMo">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-emerald">
          Pay with USDT
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">
          Pay with USDT · redeem as MoMo
        </h1>
        <p className="mt-3 text-ink-muted">
          Lock USDT in EmpiyaPayments, then PawaPay pays the recipient via MoMo.
          Operator settle finalizes the on-chain payment. Refresh-safe: open
          payments stay visible below so you can check status anytime.
        </p>

        {user && inFlight.length > 0 && formState !== 'pending' && (
          <div className="mt-6">
            <WaitingIndicator
              message={`You have ${inFlight.length} open payout${
                inFlight.length === 1 ? '' : 's'
              }. Use Check status below if you refreshed mid-flow.`}
            />
          </div>
        )}

        {repeatingId && formState !== 'pending' && formState !== 'submitting' ? (
          <div className="mt-6 rounded-xl border border-emerald/30 bg-mint/40 px-4 py-3 text-sm text-emerald-deep">
            Repeating payment #{repeatingId}. Edit any field, then confirm to
            pay again.
          </div>
        ) : null}

        <form
          ref={formSectionRef}
          onSubmit={goToReview}
          className="mt-10 space-y-6 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft sm:p-8"
        >
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
                  {country.currency_code
                    ? ` · ${country.currency_code}`
                    : ''}
                </option>
              ))}
            </select>
            {selectedCountry && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <CountryFlag
                  iso2={selectedCountry.iso2}
                  name={selectedCountry.name}
                />
                <span>
                  {selectedCountry.name}
                  {currency ? ` · payout currency ${currency}` : ''}
                </span>
              </div>
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
            <InputLabel
              htmlFor="fiat_amount"
              value={
                currency
                  ? `MoMo fiat amount (${currency})`
                  : 'MoMo fiat amount'
              }
            />
            <TextInput
              id="fiat_amount"
              type="number"
              min="0"
              step="0.01"
              className="mt-1 block w-full"
              value={fiatAmount}
              onChange={e => setFiatAmount(e.currentTarget.value)}
              required
              disabled={!currency}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Up to {FIAT_MAX_DECIMALS} decimal places. Currency follows the
              recipient country.
            </p>
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
                {formState === 'pending' ? 'Payout in progress' : 'Review'}
              </p>
              {(amount || fiatAmount) && (
                <dl className="mt-3 space-y-2">
                  {amount ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">You pay</dt>
                      <dd className="font-semibold text-ink">{amount} USDT</dd>
                    </div>
                  ) : null}
                  {fiatAmount ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">Recipient gets</dt>
                      <dd className="font-semibold text-ink">
                        {fiatAmount} {currency}
                      </dd>
                    </div>
                  ) : null}
                  {mobile ? (
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
                  ) : null}
                  {activeTransferId ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">Transfer</dt>
                      <dd className="font-medium text-ink">
                        #{activeTransferId}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              )}
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
              {(formState === 'submitting' || formState === 'pending') &&
                statusMessage && (
                  <div className="mt-3">
                    <WaitingIndicator message={statusMessage} />
                  </div>
                )}
              {formState === 'pending' && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {activeTransferId ? (
                    <button
                      type="button"
                      disabled={checkingId === activeTransferId}
                      onClick={() => void checkStatus(activeTransferId)}
                      className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                    >
                      {checkingId === activeTransferId
                        ? 'Checking…'
                        : 'Check status now'}
                    </button>
                  ) : null}
                  <Link
                    href={route('dashboard')}
                    className="inline-flex items-center font-semibold text-ink underline"
                  >
                    Open dashboard
                  </Link>
                </div>
              )}
            </div>
          )}

          {formState === 'error' && (
            <InputError message={statusMessage} className="mt-2" />
          )}
          {formState === 'idle' && statusMessage && !statusMessage.includes('failed') && (
            <p className="text-sm font-medium text-emerald-deep">{statusMessage}</p>
          )}
        </form>

        {user ? (
          <section className="mt-12">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Latest payments on this page. Full history supports pagination.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.reload({ only: ['pay_redeems'] })}
                  className="inline-flex rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold text-ink"
                >
                  Refresh
                </button>
                <Link
                  href={route('pay.history')}
                  className="inline-flex rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-deep"
                >
                  View all activity
                </Link>
              </div>
            </div>

            {payRedeems.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-white px-6 py-10 text-center text-sm text-ink-muted">
                No Pay with USDT payments yet.
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {payRedeems.map(row => {
                  const open = !isTerminalPayRedeemStatus(row.status);
                  return (
                    <li
                      key={row.id}
                      className={`rounded-2xl border bg-white p-4 shadow-soft ${
                        open
                          ? 'border-emerald ring-1 ring-emerald/20'
                          : 'border-[var(--line)]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-lg font-bold text-ink">
                            {row.usdt_amount
                              ? `${row.usdt_amount} USDT`
                              : 'USDT payment'}
                            <span className="text-ink-muted"> → </span>
                            {row.currency} {row.amount}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            #{row.id}
                            {row.phone ? ` · ${row.phone}` : ''}
                            {row.provider ? ` · ${row.provider}` : ''}
                          </p>
                          <p className="mt-1 font-mono text-xs text-ink-muted">
                            {shortenPaymentId(row.payment_id)}
                          </p>
                        </div>
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${payRedeemStatusTone(
                            row.status,
                          )}`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                        {row.settled ? (
                          <span className="font-medium text-emerald-deep">
                            On-chain settled
                          </span>
                        ) : null}
                        {row.chain_refunded ? (
                          <span className="font-medium text-ink">
                            Chain refund attempted
                          </span>
                        ) : null}
                        {row.failure_message ? (
                          <span className="text-red-700">{row.failure_message}</span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {open ? (
                          <button
                            type="button"
                            disabled={checkingId === row.id}
                            onClick={() => void checkStatus(row.id)}
                            className="rounded-lg bg-emerald px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-deep disabled:opacity-60"
                          >
                            {checkingId === row.id
                              ? 'Checking…'
                              : 'Check / reconcile status'}
                          </button>
                        ) : null}
                        {String(row.status).toUpperCase() === 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => applyRepeat(row)}
                            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold text-ink hover:border-emerald"
                          >
                            Repeat payment
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {payRedeems.length > 0 ? (
              <div className="mt-4 text-center">
                <Link
                  href={route('pay.history')}
                  className="text-sm font-semibold text-emerald hover:underline"
                >
                  Browse full payment history →
                </Link>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="mt-8 text-sm text-ink-muted">
            Connect MetaMask to start a payment and track payout status after
            refresh.
          </p>
        )}
      </div>
    </MarketingLayout>
  );
}
