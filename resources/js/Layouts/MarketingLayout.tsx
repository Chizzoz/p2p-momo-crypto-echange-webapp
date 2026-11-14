import { Head, Link, router } from '@inertiajs/react';
import React, { createContext, FormEvent, ReactNode, useContext, useState } from 'react';
import ApplicationMark from '@/Components/ApplicationMark';
import CreateMoMoOfferModal from '@/Components/CreateMoMoOfferModal';
import CreateTransactionModal from '@/Components/CreateTransactionModal';
import DownloadMetamaskModal from '@/Components/DownloadMetamaskModal';
import Dropdown from '@/Components/Dropdown';
import DropdownLink from '@/Components/DropdownLink';
import GenericModal from '@/Components/GenericModal';
import MetamaskButton from '@/Components/MetamaskButton';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import useWalletAuth from '@/Hooks/useWalletAuth';

type MarketingActions = {
  openSellFlow: () => void;
  openMoMoFlow: () => void;
  loginWithMetamask: () => Promise<void>;
  isAuthenticated: boolean;
};

const MarketingActionsContext = createContext<MarketingActions | null>(null);

export function useMarketingActions(): MarketingActions {
  const ctx = useContext(MarketingActionsContext);
  if (!ctx) {
    throw new Error('useMarketingActions must be used within MarketingLayout');
  }
  return ctx;
}

type Props = {
  title: string;
  children: ReactNode;
};

export default function MarketingLayout({ title, children }: Props) {
  const page = useTypedPage();
  const route = useRoute();
  const user = page.props.user;
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    metamaskModalOpen,
    setMetamaskModalOpen,
    createTransactionModalOpen,
    setCreateTransactionModalOpen,
    createMoMoOfferModalOpen,
    setCreateMoMoOfferModalOpen,
    dialog,
    setDialog,
    loginWithMetamask,
    openSellFlow,
    openMoMoFlow,
  } = useWalletAuth();

  const year = new Date().getFullYear();
  const isAuthenticated = Boolean(user);

  const actions: MarketingActions = {
    isAuthenticated,
    loginWithMetamask,
    openSellFlow: () => openSellFlow(isAuthenticated),
    openMoMoFlow: () => openMoMoFlow(isAuthenticated),
  };

  function logout(e: FormEvent) {
    e.preventDefault();
    router.post(route('logout'));
  }

  return (
    <MarketingActionsContext.Provider value={actions}>
      <div className="flex min-h-screen flex-col">
        <Head title={title} />

        <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-paper/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href={route('home')} className="flex items-center gap-3">
              <ApplicationMark className="h-9 w-auto" />
              <span className="font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
                e-Mpiya
              </span>
            </Link>

            <nav className="hidden items-center gap-4 text-sm font-medium text-ink-muted md:flex lg:gap-5">
              <Link href={`${route('home')}#use-cases`} className="transition hover:text-ink">
                Use cases
              </Link>
              <Link href={`${route('home')}#how-it-works`} className="transition hover:text-ink">
                How it works
              </Link>
              <Link href={`${route('home')}#markets`} className="transition hover:text-ink">
                Markets
              </Link>
              <Link
                href={route('listings')}
                className={`transition hover:text-ink ${route().current('listings') ? 'text-ink' : ''}`}
              >
                USDT offers
              </Link>
              <Link
                href={route('buy_orders.index')}
                className={`transition hover:text-ink ${route().current('buy_orders.index') ? 'text-ink' : ''}`}
              >
                MoMo offers
              </Link>
              <Link href={route('pay')} className="transition hover:text-ink">
                Pay with USDT
              </Link>
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={actions.openMoMoFlow}
                    className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-emerald"
                  >
                    List MoMo
                  </button>
                  <button
                    type="button"
                    onClick={actions.openSellFlow}
                    className="rounded-lg bg-emerald px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-deep"
                  >
                    List USDT
                  </button>
                  <Dropdown
                    align="right"
                    width="48"
                    renderTrigger={() => (
                      <button
                        type="button"
                        className="flex rounded-full border border-[var(--line)] p-0.5 transition hover:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/30"
                        aria-label="Account menu"
                      >
                        <img
                          className="h-9 w-9 rounded-full object-cover"
                          src={user.profile_photo_url}
                          alt=""
                        />
                      </button>
                    )}
                  >
                    <div className="border-b border-[var(--line)] px-4 py-3">
                      <p className="truncate text-sm font-semibold text-ink">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {user.email}
                      </p>
                    </div>
                    <DropdownLink href={route('dashboard')}>
                      Dashboard
                    </DropdownLink>
                    <DropdownLink href={route('profile.show')}>
                      Profile
                    </DropdownLink>
                    {page.props.jetstream.hasApiFeatures ? (
                      <DropdownLink href={route('api-tokens.index')}>
                        API Tokens
                      </DropdownLink>
                    ) : null}
                    <div className="border-t border-[var(--line)]" />
                    <form onSubmit={logout}>
                      <DropdownLink as="button">Log Out</DropdownLink>
                    </form>
                  </Dropdown>
                </>
              ) : (
                <>
                  <MetamaskButton loginWithMetamask={loginWithMetamask} />
                  <Link
                    href={route('login')}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
                  >
                    Log in
                  </Link>
                  <Link
                    href={route('register')}
                    className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-deep"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--line)] p-2 text-ink md:hidden"
              onClick={() => setMobileOpen(open => !open)}
              aria-label="Toggle menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {mobileOpen && (
            <div className="border-t border-[var(--line)] px-4 py-4 md:hidden">
              <div className="flex flex-col gap-3 text-sm font-medium text-ink">
                <Link href={`${route('home')}#use-cases`} onClick={() => setMobileOpen(false)}>Use cases</Link>
                <Link href={`${route('home')}#how-it-works`} onClick={() => setMobileOpen(false)}>How it works</Link>
                <Link href={`${route('home')}#markets`} onClick={() => setMobileOpen(false)}>Markets</Link>
                <Link href={route('listings')} onClick={() => setMobileOpen(false)}>
                  USDT offers
                </Link>
                <Link href={route('buy_orders.index')} onClick={() => setMobileOpen(false)}>
                  MoMo offers
                </Link>
                <Link href={route('pay')} onClick={() => setMobileOpen(false)}>
                  Pay with USDT
                </Link>
                {user ? (
                  <>
                    <Link href={route('dashboard')} onClick={() => setMobileOpen(false)}>
                      Dashboard
                    </Link>
                    <Link href={route('profile.show')} onClick={() => setMobileOpen(false)}>
                      Profile
                    </Link>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-left font-semibold text-ink"
                      onClick={() => {
                        setMobileOpen(false);
                        actions.openMoMoFlow();
                      }}
                    >
                      List MoMo
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-emerald px-4 py-2.5 text-left font-semibold text-white"
                      onClick={() => {
                        setMobileOpen(false);
                        actions.openSellFlow();
                      }}
                    >
                      List USDT
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-left"
                      onClick={() => {
                        setMobileOpen(false);
                        router.post(route('logout'));
                      }}
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-left"
                      onClick={() => {
                        setMobileOpen(false);
                        void loginWithMetamask();
                      }}
                    >
                      Connect wallet
                    </button>
                    <Link href={route('login')}>Log in</Link>
                    <Link href={route('register')}>Register</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[var(--line)] bg-white/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              © {year}{' '}
              <a href="https://p2p.oneziko.com/" className="font-medium text-ink hover:underline">
                e-Mpiya P2P MoMo Crypto eXchange
              </a>
              . All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href={route('listings')} className="hover:text-ink">USDT offers</Link>
              <Link href={route('buy_orders.index')} className="hover:text-ink">MoMo offers</Link>
              <Link href={route('pay')} className="hover:text-ink">Pay with USDT</Link>
              <Link href={`${route('home')}#markets`} className="hover:text-ink">Markets</Link>
            </div>
          </div>
        </footer>

        <DownloadMetamaskModal
          modalOpen={metamaskModalOpen}
          setModalOpen={setMetamaskModalOpen}
        />
        <CreateTransactionModal
          modalOpen={createTransactionModalOpen}
          setModalOpen={setCreateTransactionModalOpen}
        />
        <CreateMoMoOfferModal
          modalOpen={createMoMoOfferModalOpen}
          setModalOpen={setCreateMoMoOfferModalOpen}
        />
        <GenericModal
          dialogOpen={dialog.open}
          setDialogOpen={open =>
            setDialog(current => ({ ...current, open }))
          }
          dialogTitle={dialog.title}
          dialogMessage={dialog.message}
        />
      </div>
    </MarketingActionsContext.Provider>
  );
}
