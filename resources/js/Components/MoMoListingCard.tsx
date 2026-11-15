import React, { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { toSvg } from 'jdenticon';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import WaitingIndicator from '@/Components/WaitingIndicator';
import { useOptionalMarketingActions } from '@/Contexts/MarketingActions';
import { chainConfig } from '@/lib/chain';
import {
  clearAuthIntent,
  currentReturnTo,
  peekAuthIntent,
  setAuthIntent,
} from '@/lib/authIntent';
import {
  assertDepositAllowed,
  assertUsdtBalance,
  ensureUsdtAllowance,
  formatTxError,
  getBrowserSigner,
  getEmpiyaP2P,
  UserFacingTxError,
} from '@/lib/contracts';
import { formatUsdtAmount, parseUsdt } from '@/lib/units';

export type MoMoOrderRow = {
  id: number;
  user_id: number;
  buyer_address: string;
  currency: string;
  fiat_amount: string;
  usdt_amount: string;
  unit_price: string;
  status: string;
  momo_transfer_id?: number | null;
  lister_name?: string;
  created_at?: string;
};

type Props = {
  order: MoMoOrderRow;
  /** Show cancel for the lister's own pending/open offers */
  showOwnerActions?: boolean;
};

function shortenHex(value?: string | null, head = 6, tail = 4): string {
  if (!value) return '—';
  const s = String(value);
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending_momo: 'Awaiting MoMo',
  open: 'Open',
  filling: 'Filling',
  complete: 'Complete',
  cancelled: 'Cancelled',
};

export default function MoMoListingCard({
  order,
  showOwnerActions = false,
}: Props) {
  const route = useRoute();
  const page = useTypedPage();
  const user = page.props.user;
  const marketing = useOptionalMarketingActions();
  const svgString = toSvg(order.buyer_address || 'e-Mpiya MoMo', 56);

  const isLister = Boolean(user && user.id === order.user_id);
  const isOpen = order.status === 'open';
  const canCancel =
    showOwnerActions &&
    isLister &&
    (order.status === 'open' || order.status === 'pending_momo');
  const canFill = isOpen && !isLister;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [removed, setRemoved] = useState(false);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const fiatTotal = Number(order.fiat_amount);
  const currency = String(order.currency || 'ZMW').toUpperCase();

  // After guest MetaMask sign-up, return here and prompt to continue.
  useEffect(() => {
    if (!user || !canFill) {
      return;
    }
    const intent = peekAuthIntent();
    if (intent?.kind !== 'fill' || intent.orderId !== order.id) {
      return;
    }
    setAwaitingContinue(true);
    setMessage('You are signed in. Click Fill with USDT to continue.');
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [user, canFill, order.id]);

  async function fillWithUsdt() {
    if (!user) {
      setAuthIntent({
        kind: 'fill',
        orderId: order.id,
        returnTo: currentReturnTo(),
      });
      setMessage('Connect MetaMask to continue — you will return here next.');
      if (marketing?.loginWithMetamask) {
        await marketing.loginWithMetamask();
      }
      return;
    }

    setBusy(true);
    setMessage('Preparing USDT depositAndReserve…');
    try {
      const amount = parseUsdt(order.usdt_amount);
      const signer = await getBrowserSigner();
      const depositor = await signer.getAddress();
      if (depositor.toLowerCase() === order.buyer_address.toLowerCase()) {
        throw new UserFacingTxError('You cannot fill your own MoMo offer.');
      }

      const empiyaP2P = getEmpiyaP2P(signer);
      const p2pAddress = chainConfig.empiyaP2P();

      setMessage('Checking USDT balance…');
      await assertUsdtBalance(depositor, amount, signer);
      await assertDepositAllowed(amount, signer);

      setMessage('Checking USDT allowance…');
      await ensureUsdtAllowance(depositor, p2pAddress, amount, signer);

      setMessage('Confirm depositAndReserve in MetaMask…');
      const tx = await empiyaP2P.depositAndReserve(amount, order.buyer_address);
      setMessage('Waiting for confirmation…');
      await tx.wait();

      const txs = await empiyaP2P.getUserTransactions();
      const lastKey = txs.length > 0 ? txs.length - 1 : undefined;
      const last = lastKey !== undefined ? txs[lastKey] : undefined;
      if (lastKey === undefined || !last?.transactionNumber) {
        throw new UserFacingTxError(
          'On-chain fill succeeded but the reservation key could not be read.',
        );
      }

      setMessage('Recording fill and releasing USDT…');
      const { data } = await axios.post(route('buy_orders.fill', order.id), {
        depositor,
        transaction_key: lastKey,
        transaction_number: String(last.transactionNumber),
        reservation_id: String(last.reservationId ?? ''),
      });

      clearAuthIntent();
      setAwaitingContinue(false);
      setMessage(data.message || 'Fill complete.');
      setRemoved(true);
      router.reload({ only: ['open_orders', 'my_orders'] });
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          formatTxError(error) ||
          error?.message ||
          'Could not fill MoMo offer.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelOffer() {
    setBusy(true);
    setMessage('');
    try {
      const { data } = await axios.post(route('buy_orders.cancel', order.id));
      setMessage(data.message || 'Cancelled.');
      setRemoved(true);
      router.reload({ only: ['open_orders', 'my_orders'] });
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Could not cancel offer.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (removed) {
    return null;
  }

  return (
    <article
      ref={cardRef}
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-soft ${
        awaitingContinue
          ? 'border-emerald ring-2 ring-emerald/30'
          : 'border-[var(--line)]'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl bg-sand"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {order.lister_name || 'MoMo lister'}
          </p>
          <p
            className="truncate font-mono text-xs text-ink-muted"
            title={order.buyer_address}
          >
            {shortenHex(order.buyer_address)}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-5 py-5">
        <p className="font-display text-2xl font-bold text-ink">
          USDT {formatUsdtAmount(order.usdt_amount)}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Price</dt>
            <dd className="font-medium text-ink">
              {currency} {order.unit_price} / unit
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">MoMo total</dt>
            <dd className="font-semibold text-ink">
              {currency}{' '}
              {Number.isFinite(fiatTotal)
                ? fiatTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })
                : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 space-y-1 text-xs text-ink-muted">
          <p>Fill with USDT via depositAndReserve</p>
          <p className="font-medium text-ink">
            Fiat is locked from the lister&apos;s MoMo deposit
          </p>
        </div>

        {!message && order.status === 'pending_momo' ? (
          <div className="mt-4">
            <WaitingIndicator message="Approve the MoMo PIN prompt on your phone. Waiting for deposit confirmation…" />
          </div>
        ) : null}
        {message && busy ? (
          <div className="mt-4">
            <WaitingIndicator message={message} />
          </div>
        ) : null}
        {message && !busy ? (
          <p
            className={`mt-4 break-words text-xs ${
              awaitingContinue
                ? 'font-medium text-emerald-deep'
                : 'text-ink-muted'
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4">
        <span className="text-sm font-medium text-ink-muted">
          Sell MoMo · {currency}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {order.status !== 'open' && (
            <span className="rounded-lg bg-sand px-3 py-2 text-xs font-semibold text-ink-muted">
              {STATUS_LABEL[order.status] || order.status}
            </span>
          )}
          {canFill && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void fillWithUsdt()}
              className="rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-deep disabled:opacity-60"
            >
              {busy
                ? 'Filling…'
                : awaitingContinue && user
                  ? 'Continue fill'
                  : 'Fill with USDT'}
            </button>
          )}
          {isOpen && isLister && !showOwnerActions && (
            <span className="rounded-lg bg-sand px-3 py-2 text-xs font-semibold text-ink-muted">
              Your offer
            </span>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelOffer()}
              className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink-muted hover:border-ink hover:text-ink disabled:opacity-60"
            >
              Cancel offer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
