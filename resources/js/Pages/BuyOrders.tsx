import { Link, router } from '@inertiajs/react';
import React, { useEffect } from 'react';
import axios from 'axios';
import MoMoListingCard, {
  MoMoOrderRow,
} from '@/Components/MoMoListingCard';
import MarketingLayout, {
  useMarketingActions,
} from '@/Layouts/MarketingLayout';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';

function BuyOrdersContent() {
  const page = useTypedPage();
  const route = useRoute();
  const { openSellFlow, openMoMoFlow } = useMarketingActions();
  const openOrders = ((page.props as any).open_orders as MoMoOrderRow[]) || [];
  const myOrders = ((page.props as any).my_orders as MoMoOrderRow[]) || [];

  // With QUEUE_CONNECTION=sync there is no worker; poll pending MoMo deposits.
  useEffect(() => {
    const pending = myOrders.filter(
      o => o.status === 'pending_momo' && o.momo_transfer_id,
    );
    if (pending.length === 0) {
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        await Promise.all(
          pending.map(o =>
            axios.get(route('momo_transfers.status', o.momo_transfer_id)),
          ),
        );
        if (!cancelled) {
          router.reload({ only: ['open_orders', 'my_orders'] });
        }
      } catch {
        // keep trying
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [myOrders, route]);

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-emerald">
              Sell MoMo
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              MoMo offers
            </h1>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Deposit mobile money first at your rate. When someone fills with
              USDT, escrow reserves it to your wallet and they receive your
              locked fiat.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openMoMoFlow}
              className="inline-flex rounded-lg bg-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              List MoMo
            </button>
            <button
              type="button"
              onClick={openSellFlow}
              className="inline-flex rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-emerald"
            >
              List USDT instead
            </button>
            <Link
              href={route('listings')}
              className="inline-flex rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-emerald"
            >
              USDT offers
            </Link>
          </div>
        </div>

        {myOrders.length > 0 ? (
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">
              Your MoMo offers
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Pending deposits and offers you listed
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {myOrders.map(order => (
                <MoMoListingCard
                  key={`mine-${order.id}`}
                  order={order}
                  showOwnerActions
                />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <h2 className="font-display text-2xl font-bold text-ink">
            Open MoMo offers
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Fill an open offer by depositing USDT reserved to the lister&apos;s
            wallet.
          </p>
          {openOrders.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {openOrders.map(order => (
                <MoMoListingCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-paper px-6 py-16 text-center">
              <p className="font-display text-xl font-semibold text-ink">
                No open MoMo offers
              </p>
              <p className="mt-2 text-ink-muted">
                Be the first to list MoMo for USDT fillers.
              </p>
              <button
                type="button"
                onClick={openMoMoFlow}
                className="mt-6 inline-flex rounded-lg bg-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
              >
                List MoMo
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function BuyOrders() {
  return (
    <MarketingLayout title="MoMo offers">
      <BuyOrdersContent />
    </MarketingLayout>
  );
}
