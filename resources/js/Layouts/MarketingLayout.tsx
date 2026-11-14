import { Head, Link } from '@inertiajs/react';
import React, { createContext, ReactNode, useContext, useState } from 'react';
import ApplicationMark from '@/Components/ApplicationMark';
import CreateTransactionModal from '@/Components/CreateTransactionModal';
import DownloadMetamaskModal from '@/Components/DownloadMetamaskModal';
import GenericModal from '@/Components/GenericModal';
import MetamaskButton from '@/Components/MetamaskButton';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import useWalletAuth from '@/Hooks/useWalletAuth';

type MarketingActions = {
  openSellFlow: () => void;
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
    dialog,
    setDialog,
    loginWithMetamask,
    openSellFlow,
  } = useWalletAuth();

  const year = new Date().getFullYear();
  const isAuthenticated = Boolean(user);

  const actions: MarketingActions = {
    isAuthenticated,
    loginWithMetamask,
    openSellFlow: () => openSellFlow(isAuthenticated),
  };

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

            <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
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
                Listings
              </Link>
              <Link href={route('pay')} className="transition hover:text-ink">
                Pay &amp; redeem
              </Link>
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  <Link
                    href={route('dashboard')}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={actions.openSellFlow}
                    className="rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-deep"
                  >
                    List USDT
                  </button>
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
                <Link href={route('listings')} onClick={() => setMobileOpen(false)}>Listings</Link>
                <Link href={route('pay')} onClick={() => setMobileOpen(false)}>Pay &amp; redeem</Link>
                {user ? (
                  <>
                    <Link href={route('dashboard')}>Dashboard</Link>
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
              <Link href={route('listings')} className="hover:text-ink">Listings</Link>
              <Link href={route('pay')} className="hover:text-ink">Pay &amp; redeem</Link>
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
