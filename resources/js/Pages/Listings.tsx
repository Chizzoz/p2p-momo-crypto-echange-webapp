import { Link } from '@inertiajs/react';
import React from 'react';
import ListingCard from '@/Components/ListingCard';
import MarketingLayout, {
  useMarketingActions,
} from '@/Layouts/MarketingLayout';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';

function ListingsContent() {
  const page = useTypedPage();
  const route = useRoute();
  const { openSellFlow } = useMarketingActions();
  const listings = (page.props.listings as any[]) || [];

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-mint/70 blur-3xl" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-emerald">
              Marketplace
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              USDT listings
            </h1>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Request USDT against open seller offers. Pay with mobile money;
              escrow releases crypto when MoMo clears.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openSellFlow}
              className="inline-flex rounded-lg bg-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              List USDT
            </button>
            <Link
              href={route('dashboard')}
              className="inline-flex rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-emerald"
            >
              My dashboard
            </Link>
          </div>
        </div>

        {listings.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing: any) => (
              <ListingCard
                listing={listing}
                key={listing.listing_id || listing.transaction_number}
              />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-dashed border-[var(--line)] bg-paper px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold text-ink">
              No open USDT offers yet
            </p>
            <p className="mt-2 text-ink-muted">
              Be the first to list USDT for mobile money buyers.
            </p>
            <button
              type="button"
              onClick={openSellFlow}
              className="mt-6 inline-flex rounded-lg bg-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              List USDT
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Listings() {
  return (
    <MarketingLayout title="USDT Listings">
      <ListingsContent />
    </MarketingLayout>
  );
}
