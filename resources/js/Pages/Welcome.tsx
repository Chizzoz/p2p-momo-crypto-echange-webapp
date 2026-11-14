import { Link } from '@inertiajs/react';
import React from 'react';
import ListingCard from '@/Components/ListingCard';
import MarketsDirectory from '@/Components/MarketsDirectory';
import MarketingLayout, {
  useMarketingActions,
} from '@/Layouts/MarketingLayout';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import { CountryOption, PaymentMethodOption } from '@/types';

function WelcomeContent() {
  const page = useTypedPage();
  const route = useRoute();
  const { openSellFlow } = useMarketingActions();

  const listings = (page.props.all_transactions as any[]) || [];
  const countries = (page.props.countries as CountryOption[]) || [];
  const paymentMethods =
    (page.props.payment_methods as PaymentMethodOption[]) || [];

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="hero-atmosphere pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-mint/80 blur-3xl" />
          <div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald/10 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <div>
            <p className="hero-rise font-display text-sm font-semibold uppercase tracking-[0.18em] text-emerald">
              e-Mpiya
            </p>
            <h1 className="hero-rise-delay mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance sm:text-5xl lg:text-6xl">
              Trade USDT with mobile money — list, buy, or pay and redeem.
            </h1>
            <p className="hero-rise-delay-2 mt-5 max-w-xl text-lg text-ink-muted">
              Peer-to-peer USDT locked in on-chain escrow until MoMo payment is
              confirmed. Built for African wallets you already use.
            </p>
            <div className="hero-rise-delay-2 mt-8 flex flex-wrap gap-3">
              <Link
                href={route('listings')}
                className="inline-flex items-center justify-center rounded-lg bg-emerald px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-deep"
              >
                Buy USDT with MoMo
              </Link>
              <button
                type="button"
                onClick={openSellFlow}
                className="inline-flex items-center justify-center rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-emerald hover:text-emerald-deep"
              >
                List USDT
              </button>
            </div>
          </div>

          <div className="hero-rise-delay relative min-h-[18rem] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-ink shadow-soft">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(200,245,66,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(13,122,95,0.55),transparent_50%)]" />
            <div className="relative flex h-full flex-col justify-between p-6 text-white sm:p-8">
              <div>
                <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                  Escrow protected
                </p>
                <p className="mt-3 max-w-sm font-display text-2xl font-bold leading-snug sm:text-3xl">
                  USDT stays locked until mobile money lands.
                </p>
              </div>
              <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 px-3 py-3 backdrop-blur">
                  List
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-3 backdrop-blur">
                  Buy with MoMo
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-3 backdrop-blur">
                  Pay &amp; redeem
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="border-t border-[var(--line)] bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Three ways to move value
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Pick the path that matches your intent. Same rails: wallet, MoMo, and escrow.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <button
              type="button"
              onClick={openSellFlow}
              className="group rounded-2xl border border-[var(--line)] bg-paper p-6 text-left transition hover:border-emerald"
            >
              <p className="font-display text-xl font-bold text-ink">List USDT</p>
              <p className="mt-3 text-sm text-ink-muted">
                Post USDT at your rate and receive mobile money from buyers when the trade clears.
              </p>
              <span className="mt-6 inline-flex text-sm font-semibold text-emerald group-hover:underline">
                Open listing →
              </span>
            </button>
            <Link
              href={route('listings')}
              className="group rounded-2xl border border-[var(--line)] bg-paper p-6 transition hover:border-emerald"
            >
              <p className="font-display text-xl font-bold text-ink">
                Request USDT for fiat
              </p>
              <p className="mt-3 text-sm text-ink-muted">
                Browse live offers, pay with MoMo, and receive USDT when escrow releases.
              </p>
              <span className="mt-6 inline-flex text-sm font-semibold text-emerald group-hover:underline">
                Browse offers →
              </span>
            </Link>
            <Link
              href={route('pay')}
              className="group rounded-2xl border border-[var(--line)] bg-paper p-6 transition hover:border-emerald"
            >
              <p className="font-display text-xl font-bold text-ink">
                Pay USDT, redeem MoMo
              </p>
              <p className="mt-3 text-sm text-ink-muted">
                Send USDT for a recipient to redeem as mobile money — payments with a local off-ramp.
              </p>
              <span className="mt-6 inline-flex text-sm font-semibold text-emerald group-hover:underline">
                Open pay &amp; redeem →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            One clear path whether you list, buy, or pay for redemption.
          </p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Connect wallet',
                body: 'Sign in with MetaMask on Sepolia and bind your MoMo profile.',
              },
              {
                step: '02',
                title: 'List, take, or pay',
                body: 'Create an offer, pick a live listing, or start a pay & redeem.',
              },
              {
                step: '03',
                title: 'MoMo settles fiat',
                body: 'Local mobile money moves between people while crypto stays locked.',
              },
              {
                step: '04',
                title: 'Confirm & release',
                body: 'When payment is confirmed, escrow releases USDT or completes redeem.',
              },
            ].map(item => (
              <li key={item.step} className="border-t border-emerald/30 pt-5">
                <p className="font-display text-sm font-semibold text-emerald">
                  {item.step}
                </p>
                <h3 className="mt-2 font-display text-xl font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-ink py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Escrow you can verify
          </h2>
          <p className="mt-4 max-w-2xl text-white/75">
            Seller USDT is locked in the Empiya P2P contract until the MoMo side
            of the trade is confirmed. No middleman custody theater — on-chain
            state is the source of truth.
          </p>
        </div>
      </section>

      <section id="markets" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Supported markets
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            Every country we support today, with the mobile money networks available for that market.
          </p>
          <div className="mt-10">
            <MarketsDirectory
              countries={countries}
              paymentMethods={paymentMethods}
            />
          </div>
        </div>
      </section>

      <section id="marketplace" className="border-t border-[var(--line)] bg-white/70 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                Live marketplace
              </h2>
              <p className="mt-3 max-w-xl text-ink-muted">
                Open USDT offers for MoMo buyers. Full catalog on the listings page.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={route('listings')}
                className="inline-flex items-center justify-center rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-deep"
              >
                All listings
              </Link>
              <button
                type="button"
                onClick={openSellFlow}
                className="inline-flex items-center justify-center rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-emerald"
              >
                List USDT
              </button>
            </div>
          </div>

          {listings.length > 0 ? (
            <>
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing: any) => (
                  <ListingCard
                    listing={listing}
                    key={listing.listing_id || listing.transaction_number}
                  />
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link
                  href={route('listings')}
                  className="text-sm font-semibold text-emerald hover:underline"
                >
                  View all USDT listings →
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] bg-paper px-6 py-16 text-center">
              <p className="font-display text-xl font-semibold text-ink">
                No open offers yet
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

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Ready to move USDT with MoMo?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-muted">
            List inventory, buy from peers, or pay someone who redeems in mobile money.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={route('listings')}
              className="inline-flex rounded-lg bg-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              Buy USDT with MoMo
            </Link>
            <button
              type="button"
              onClick={openSellFlow}
              className="inline-flex rounded-lg border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-emerald"
            >
              List USDT
            </button>
            <Link
              href={route('pay')}
              className="inline-flex rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              Pay &amp; redeem
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Welcome() {
  return (
    <MarketingLayout title="Trade USDT with Mobile Money">
      <WelcomeContent />
    </MarketingLayout>
  );
}
