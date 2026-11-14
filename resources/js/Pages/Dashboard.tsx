import { Link, router } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import ListingCard from '@/Components/ListingCard';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import {
  ensureSepoliaChain,
  getBrowserProvider,
  getUsdtBalance,
} from '@/lib/contracts';
import { formatUsdt, formatUsdtAmount } from '@/lib/units';

declare let window: any;

const STATUS_LABEL: Record<number, string> = {
  0: 'Open',
  1: 'Processing',
  2: 'Complete',
  3: 'Cancelled',
};

function shortAddr(value?: string | null) {
  if (!value) return '—';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function StatusPill({ status }: { status: number }) {
  const label = STATUS_LABEL[status] || 'Unknown';
  const tone =
    status === 0
      ? 'bg-mint/60 text-emerald-deep'
      : status === 2
        ? 'bg-emerald/15 text-emerald-deep'
        : status === 1
          ? 'bg-accent/30 text-ink'
          : 'bg-sand text-ink-muted';

  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export default function Dashboard() {
  const route = useRoute();
  const page = useTypedPage();
  const user = page.props.user;
  const myListings = (page.props.my_listings as any[]) || [];
  const purchases = (page.props.purchases as any[]) || [];
  const activePurchases = purchases.filter((row) => {
    const status = Number(row.status);
    return status === 0 || status === 1;
  });
  const pastPurchases = purchases.filter((row) => {
    const status = Number(row.status);
    return status === 2 || status === 3;
  });
  const stats = (page.props.stats as any) || {
    open_listed_usdt: 0,
    open_count: 0,
    sold_count: 0,
    purchase_count: 0,
  };
  const initialWallets =
    ((page.props as any).fiat_wallets as any[]) || [];
  const ledger = ((page.props as any).wallet_ledger as any[]) || [];
  const withdrawNetworks =
    ((page.props as any).withdraw_networks as any[]) || [];

  const [walletAddress, setWalletAddress] = useState(
    String(user?.eth_address || ''),
  );
  const [walletUsdt, setWalletUsdt] = useState<string>('—');
  const [balanceError, setBalanceError] = useState('');
  const [fiatWallets, setFiatWallets] = useState(initialWallets);
  const [withdrawCurrency, setWithdrawCurrency] = useState(
    String(
      initialWallets.find((w: any) => Number(w.balance) > 0)?.currency ||
        initialWallets[0]?.currency ||
        'ZMW',
    ),
  );
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState(
    String(user?.mobile_number || ''),
  );
  const networksForCurrency = useMemo(
    () =>
      withdrawNetworks.filter(
        (n: any) =>
          !n.currency ||
          String(n.currency).toUpperCase() ===
            String(withdrawCurrency).toUpperCase(),
      ),
    [withdrawNetworks, withdrawCurrency],
  );
  const [withdrawMethodId, setWithdrawMethodId] = useState(
    String(
      user?.payment_method_id ||
        networksForCurrency[0]?.id ||
        withdrawNetworks[0]?.id ||
        '',
    ),
  );
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState('');

  const selectedWallet = useMemo(
    () =>
      fiatWallets.find(
        (w: any) =>
          String(w.currency).toUpperCase() ===
          String(withdrawCurrency).toUpperCase(),
      ),
    [fiatWallets, withdrawCurrency],
  );

  const selectedBalance = Number(selectedWallet?.balance ?? 0);

  useEffect(() => {
    const stillValid = networksForCurrency.some(
      (n: any) => String(n.id) === String(withdrawMethodId),
    );
    if (!stillValid) {
      setWithdrawMethodId(String(networksForCurrency[0]?.id || ''));
    }
  }, [networksForCurrency, withdrawMethodId]);

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawBusy(true);
    setWithdrawMessage('');
    try {
      const { data } = await axios.post(route('wallet.withdraw'), {
        amount: withdrawAmount,
        phone: withdrawPhone,
        payment_method_id: Number(withdrawMethodId),
        currency: withdrawCurrency,
      });
      if (Array.isArray(data.wallets)) {
        setFiatWallets(data.wallets);
      }
      setWithdrawMessage(data.message || 'Withdraw started.');
      setWithdrawAmount('');
      router.reload({
        only: ['fiat_wallets', 'zmw_balance', 'wallet_ledger', 'stats'],
      });
    } catch (error: any) {
      setWithdrawMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Withdraw failed.',
      );
    } finally {
      setWithdrawBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      if (typeof window === 'undefined' || !window.ethereum) {
        setBalanceError('Connect MetaMask to load wallet USDT.');
        return;
      }
      try {
        await ensureSepoliaChain();
        const provider = getBrowserProvider();
        const accounts: string[] = await provider.send('eth_requestAccounts', []);
        const address = accounts[0] || user?.eth_address;
        if (!address) {
          setBalanceError('No wallet connected.');
          return;
        }
        if (!cancelled) {
          setWalletAddress(address);
        }
        const bal = await getUsdtBalance(address, provider);
        if (!cancelled) {
          setWalletUsdt(formatUsdt(bal));
          setBalanceError('');
        }
      } catch (error: any) {
        if (!cancelled) {
          setBalanceError(error?.message || 'Could not read USDT balance.');
        }
      }
    }

    void loadBalance();
    return () => {
      cancelled = true;
    };
  }, [user?.eth_address]);

  return (
    <AppLayout
      title="Dashboard"
      renderHeader={() => (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Dashboard</h2>
            <p className="text-sm text-ink-muted">
              Balance, your listings, and purchase history
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={route('buy_orders.index')}
              className="inline-flex rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              MoMo offers
            </Link>
            <Link
              href={route('listings')}
              className="inline-flex rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-emerald"
            >
              USDT offers
            </Link>
          </div>
        </div>
      )}
    >
      {() => (
        <div className="py-8">
          <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft sm:col-span-2 xl:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Fiat wallets
                </p>
                {fiatWallets.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {fiatWallets.map((w: any) => (
                      <li key={w.id || w.currency} className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-ink-muted">
                          {w.currency}
                          {w.country_name ? ` · ${w.country_name}` : ''}
                        </span>
                        <span className="font-display text-xl font-bold text-ink">
                          {Number(w.balance).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="mt-2 font-display text-2xl font-bold text-ink">
                      —
                    </p>
                    <p className="mt-2 text-xs text-ink-muted">
                      Connect a MoMo number in Profile to open a currency wallet
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Wallet USDT
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  {walletUsdt}
                </p>
                <p className="mt-2 truncate text-xs text-ink-muted">
                  {walletAddress || 'Not connected'}
                </p>
                {balanceError && (
                  <p className="mt-2 text-xs text-ink-muted">{balanceError}</p>
                )}
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Open listed USDT
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  {formatUsdtAmount(stats.open_listed_usdt)}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  {stats.open_count} open listing
                  {stats.open_count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Sold / purchases
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  {stats.sold_count}
                  <span className="text-lg font-semibold text-ink-muted">
                    {' '}
                    / {stats.purchase_count}
                  </span>
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  Completed as seller / buys requested
                </p>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
                <h3 className="font-display text-xl font-bold text-ink">
                  Withdraw to MoMo
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Payouts use the country network and currency for the wallet
                  you open when connecting a mobile number.
                </p>
                <form className="mt-5 space-y-4" onSubmit={submitWithdraw}>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Wallet currency
                    </label>
                    <select
                      required
                      value={withdrawCurrency}
                      onChange={(e) => setWithdrawCurrency(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-ink"
                      disabled={fiatWallets.length === 0}
                    >
                      {fiatWallets.length === 0 ? (
                        <option value="">No wallets yet</option>
                      ) : (
                        fiatWallets.map((w: any) => (
                          <option key={w.currency} value={w.currency}>
                            {w.currency}
                            {w.country_name ? ` (${w.country_name})` : ''} —{' '}
                            {Number(w.balance).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Amount ({withdrawCurrency || '—'})
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-ink"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Mobile number
                    </label>
                    <input
                      type="tel"
                      required
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-ink"
                      placeholder="260…"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Network ({withdrawCurrency})
                    </label>
                    <select
                      required
                      value={withdrawMethodId}
                      onChange={(e) => setWithdrawMethodId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-ink"
                    >
                      <option value="" disabled>
                        Select network
                      </option>
                      {networksForCurrency.map((n: any) => (
                        <option key={n.id} value={n.id}>
                          {n.method || n.method_slug}
                          {n.country_name ? ` · ${n.country_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={
                      withdrawBusy ||
                      !withdrawMethodId ||
                      !withdrawCurrency ||
                      selectedBalance <= 0
                    }
                    className="rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-deep disabled:opacity-60"
                  >
                    {withdrawBusy ? 'Sending…' : 'Withdraw to MoMo'}
                  </button>
                  {withdrawMessage && (
                    <p className="text-xs text-ink-muted">{withdrawMessage}</p>
                  )}
                </form>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
                <h3 className="font-display text-xl font-bold text-ink">
                  Wallet activity
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Recent credits and withdrawals
                </p>
                {ledger.length > 0 ? (
                  <ul className="mt-5 divide-y divide-[var(--line)]">
                    {ledger.map((row: any) => (
                      <li
                        key={row.id}
                        className="flex items-start justify-between gap-3 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-ink">
                            {row.description || row.type}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {row.currency || 'ZMW'} ·{' '}
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString()
                              : '—'}
                          </p>
                        </div>
                        <p
                          className={
                            row.direction === 'credit'
                              ? 'font-semibold text-emerald'
                              : 'font-semibold text-ink'
                          }
                        >
                          {row.direction === 'credit' ? '+' : '−'}
                          {Number(row.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          <span className="text-xs font-medium text-ink-muted">
                            {row.currency || ''}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-6 text-sm text-ink-muted">
                    No wallet activity yet. Completed sales credit the buyer&apos;s
                    country currency here.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-ink">
                    Your listings
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    USDT you deposited for MoMo buyers
                  </p>
                </div>
                <Link
                  href={route('listings')}
                  className="text-sm font-semibold text-emerald hover:underline"
                >
                  View marketplace
                </Link>
              </div>

              {myListings.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {myListings.map((listing: any) => (
                    <ListingCard
                      listing={listing}
                      key={listing.listing_id || listing.transaction_number}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-paper px-5 py-10 text-center">
                  <p className="font-medium text-ink">No listings yet</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Use List USDT in the header to post an offer.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-soft">
              <div>
                <h3 className="font-display text-xl font-bold text-ink">
                  Active purchases
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Reserved for you — use Continue payment for MoMo (Processing
                  listings leave the public marketplace)
                </p>
              </div>

              {activePurchases.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {activePurchases.map((listing: any) => (
                    <ListingCard
                      listing={listing}
                      key={`buy-${listing.listing_id || listing.transaction_number}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-paper px-5 py-10 text-center">
                  <p className="font-medium text-ink">No active purchases</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Request a listing, wait for seller confirmation, then pay
                    with MoMo here.
                  </p>
                  <Link
                    href={route('listings')}
                    className="mt-4 inline-flex rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-deep"
                  >
                    Browse listings
                  </Link>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-soft">
              <div className="border-b border-[var(--line)] px-6 py-5">
                <h3 className="font-display text-xl font-bold text-ink">
                  Purchase history
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Completed or cancelled buys
                </p>
              </div>

              {pastPurchases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-paper text-xs uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-6 py-3 font-semibold">When</th>
                        <th className="px-6 py-3 font-semibold">Amount</th>
                        <th className="px-6 py-3 font-semibold">Total fiat</th>
                        <th className="px-6 py-3 font-semibold">Seller</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastPurchases.map((row: any) => {
                        const total =
                          Number(row.price || 0) * Number(row.amount || 0);
                        return (
                          <tr
                            key={row.listing_id || row.transaction_number}
                            className="border-t border-[var(--line)]"
                          >
                            <td className="px-6 py-4 text-ink-muted">
                              {row.created_at
                                ? new Date(row.created_at).toLocaleString()
                                : '—'}
                            </td>
                            <td className="px-6 py-4 font-medium text-ink">
                              {formatUsdtAmount(row.amount)}{' '}
                              {row.symbol || 'USDT'}
                            </td>
                            <td className="px-6 py-4 text-ink">
                              {String(row.currency || 'ZMW').toUpperCase()}{' '}
                              {Number.isFinite(total)
                                ? total.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })
                                : '—'}
                            </td>
                            <td className="px-6 py-4 text-ink">
                              <div>{row.name || 'Seller'}</div>
                              <div className="text-xs text-ink-muted">
                                {shortAddr(row.eth_address)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusPill status={Number(row.status)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="font-medium text-ink">No completed purchases yet</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Finished MoMo buys will show up here.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
