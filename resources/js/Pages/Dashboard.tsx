import { Link } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import ListingCard from '@/Components/ListingCard';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import {
  ensureSepoliaChain,
  getBrowserProvider,
  getUsdtBalance,
} from '@/lib/contracts';
import { formatUsdt } from '@/lib/units';

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
  const stats = (page.props.stats as any) || {
    open_listed_usdt: 0,
    open_count: 0,
    sold_count: 0,
    purchase_count: 0,
  };

  const [walletAddress, setWalletAddress] = useState(
    String(user?.eth_address || ''),
  );
  const [walletUsdt, setWalletUsdt] = useState<string>('—');
  const [balanceError, setBalanceError] = useState('');

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
          <Link
            href={route('listings')}
            className="text-sm font-semibold text-emerald hover:underline"
          >
            Browse USDT listings →
          </Link>
        </div>
      )}
    >
      {() => (
        <div className="py-8">
          <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  {stats.open_listed_usdt}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  {stats.open_count} open listing
                  {stats.open_count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Sold listings
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  {stats.sold_count}
                </p>
                <p className="mt-2 text-xs text-ink-muted">Completed as seller</p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Purchases
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  {stats.purchase_count}
                </p>
                <p className="mt-2 text-xs text-ink-muted">Buys you requested</p>
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

            <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-soft">
              <div className="border-b border-[var(--line)] px-6 py-5">
                <h3 className="font-display text-xl font-bold text-ink">
                  Purchase history
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Listings you requested or paid for as buyer
                </p>
              </div>

              {purchases.length > 0 ? (
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
                      {purchases.map((row: any) => {
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
                              {row.amount} {row.symbol || 'USDT'}
                            </td>
                            <td className="px-6 py-4 text-ink">
                              ZMW{' '}
                              {Number.isFinite(total)
                                ? total.toLocaleString()
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
                  <p className="font-medium text-ink">No purchases yet</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Browse open offers and request USDT with MoMo.
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
          </div>
        </div>
      )}
    </AppLayout>
  );
}
