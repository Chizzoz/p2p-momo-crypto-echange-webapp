import React, { useEffect, useState } from 'react';
import { toSvg } from 'jdenticon';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import {
  ensureSepoliaChain,
  getBrowserProvider,
  getEmpiyaP2P,
} from '@/lib/contracts';
import { formatUsdtAmount } from '@/lib/units';

declare let window: any;

type ListingRow = Record<string, any>;

type Props = {
  /** Preferred: plain listing row from the API */
  listing?: ListingRow;
  /** Legacy Object.entries([key, row]) shape from Welcome */
  transaction?: [string | number, ListingRow] | ListingRow;
};

function resolveListing(props: Props): ListingRow {
  if (props.listing) {
    return props.listing;
  }
  const raw = props.transaction;
  if (Array.isArray(raw)) {
    return raw[1] || {};
  }
  return (raw as ListingRow) || {};
}

/** Trim hex addresses / tx hashes for UI + privacy. */
function shortenHex(value?: string | null, head = 6, tail = 4): string {
  if (!value) {
    return '';
  }
  const s = String(value);
  if (s.length <= head + tail + 1) {
    return s;
  }
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** On-chain transactionNumber must be a 32-byte hex string. */
function isValidBytes32(value?: string | null): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || ''));
}

function friendlyReserveError(error: any, transactionNumber?: string): string {
  const raw =
    error?.response?.data?.message ||
    error?.reason ||
    error?.data?.message ||
    error?.message ||
    'Reserve failed.';
  if (
    String(raw).includes('invalid arrayify') ||
    String(raw).includes('INVALID_ARGUMENT') ||
    !isValidBytes32(transactionNumber)
  ) {
    return 'This listing cannot be reserved on-chain (invalid or demo-only deposit id). Clear the buyer request, then list USDT again via a real on-chain deposit.';
  }
  return raw;
}

export default function ListingCard(props: Props) {
  const route = useRoute();
  const page = useTypedPage();
  const user = page.props.user;
  const transactionObj = resolveListing(props);
  const svgString = toSvg(transactionObj.eth_address || 'e-Mpiya P2P', 56);
  const total =
    Number(transactionObj.price || 0) * Number(transactionObj.amount || 0);
  const status = Number(transactionObj.status);
  const isOpen = status === 0;
  const isProcessing = status === 1;
  const isSold = status === 2;
  const isCancelled = status === 3;
  const listingId = transactionObj.listing_id;
  const isSeller =
    user &&
    transactionObj.eth_address &&
    String(user.eth_address || '').toLowerCase() ===
      String(transactionObj.eth_address).toLowerCase();
  const alreadyReserved =
    Boolean(transactionObj.reservation_id) || isProcessing;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [buyerConfirmed, setBuyerConfirmed] = useState(alreadyReserved);
  const [reserveTxHash, setReserveTxHash] = useState('');
  const [pendingBuyer, setPendingBuyer] = useState<string | null>(
    transactionObj.reserved_buyer || null,
  );
  const [removed, setRemoved] = useState(false);

  const userEth = String(user?.eth_address || '').toLowerCase();
  const isPendingBuyerForMe =
    Boolean(pendingBuyer) &&
    Boolean(userEth) &&
    String(pendingBuyer).toLowerCase() === userEth;
  const heldByOtherBuyer =
    Boolean(pendingBuyer) && !isPendingBuyerForMe && !isSeller;

  const hasValidOnchainId = isValidBytes32(transactionObj.transaction_number);
  // MoMo deposit only after seller has reserved this buyer on-chain.
  const sellerHasConfirmed =
    buyerConfirmed ||
    Boolean(transactionObj.reservation_id) ||
    isProcessing;
  const showConfirmBuyer =
    isSeller &&
    pendingBuyer &&
    (isOpen || isProcessing) &&
    !buyerConfirmed &&
    hasValidOnchainId;
  const showBuyerConfirmed =
    isSeller && pendingBuyer && buyerConfirmed && !isSold && !isCancelled;
  const showBuy =
    Boolean(user) &&
    isOpen &&
    !isSeller &&
    !pendingBuyer &&
    hasValidOnchainId &&
    !removed;
  const showCancelListing =
    isSeller && isOpen && !buyerConfirmed && !removed;
  // Seller waits for MoMo; reopen is available after the on-chain timeout window.
  const showExpireReservation =
    !removed &&
    !isSold &&
    !isCancelled &&
    sellerHasConfirmed &&
    (isSeller || isPendingBuyerForMe) &&
    (isProcessing || Boolean(transactionObj.reservation_id));
  const showContinuePayment =
    Boolean(user) &&
    !isSeller &&
    isPendingBuyerForMe &&
    sellerHasConfirmed &&
    !isSold &&
    (isOpen || isProcessing);
  const showWaitingForSeller =
    Boolean(user) &&
    !isSeller &&
    isPendingBuyerForMe &&
    !sellerHasConfirmed &&
    isOpen;
  const showSellerAwaitingPayment = showBuyerConfirmed && !isSold;
  const canClearBuyerRequest =
    Boolean(pendingBuyer) &&
    !buyerConfirmed &&
    isOpen &&
    !transactionObj.reservation_id &&
    (isSeller || isPendingBuyerForMe);

  // Sync chain ↔ UI: pending confirm, buyer waiting, or seller awaiting MoMo / completion.
  useEffect(() => {
    const watchingAsSeller = Boolean(isSeller && pendingBuyer && !buyerConfirmed);
    const watchingAsBuyer = Boolean(
      !isSeller && isPendingBuyerForMe && !sellerHasConfirmed,
    );
    const watchingSettledMismatch = Boolean(
      (isSeller || isPendingBuyerForMe) &&
        sellerHasConfirmed &&
        !isSold &&
        !isCancelled,
    );
    if (
      (!watchingAsSeller && !watchingAsBuyer && !watchingSettledMismatch) ||
      !window.ethereum
    ) {
      return;
    }
    if (!transactionObj.eth_address || transactionObj.transaction_key === undefined) {
      return;
    }
    if (!isValidBytes32(transactionObj.transaction_number)) {
      return;
    }

    let cancelled = false;

    async function syncReservation() {
      try {
        const provider = getBrowserProvider();
        const p2p = getEmpiyaP2P(provider);
        const onchain = await p2p.getUserTransactionByUser(
          transactionObj.eth_address,
          transactionObj.transaction_key,
        );
        if (cancelled) {
          return;
        }

        const chainStatus = Number(onchain.status);

        // DB still Processing but chain already Complete/Open/Cancelled.
        if (watchingSettledMismatch && chainStatus !== 1) {
          try {
            await axios.post(route('trades.sync_onchain', listingId), {
              status: chainStatus,
              reservation_id: onchain.reservationId?.toString?.() || null,
              reserved_buyer:
                chainStatus === 2 ? String(onchain.recipient || '') : null,
            });
          } catch {
            // ignore
          }
          if (chainStatus === 2) {
            setMessage('Trade already completed on-chain. Refreshing…');
            window.setTimeout(() => window.location.reload(), 900);
          } else if (chainStatus === 0) {
            setPendingBuyer(null);
            setBuyerConfirmed(false);
            setMessage('On-chain reservation ended. Listing can be reopened.');
          }
          return;
        }

        const reservedForBuyer =
          chainStatus === 1 &&
          String(onchain.recipient || '').toLowerCase() ===
            String(pendingBuyer).toLowerCase();
        if (!reservedForBuyer) {
          return;
        }

        const reservationId = onchain.reservationId?.toString?.() || '';
        setBuyerConfirmed(true);
        if (watchingAsBuyer) {
          setMessage('Seller confirmed. You can continue payment with MoMo.');
        }

        if (
          watchingAsSeller &&
          listingId &&
          reservationId &&
          !transactionObj.reservation_id
        ) {
          try {
            await axios.post(route('trades.confirm_reserve', listingId), {
              buyer: pendingBuyer,
              reservation_id: reservationId,
            });
          } catch {
            // UI already reflects confirmation; backend sync is best-effort.
          }
        }
      } catch {
        // Ignore read failures (wrong network, etc.).
      }
    }

    void syncReservation();
    const interval =
      watchingAsBuyer || watchingSettledMismatch
        ? window.setInterval(() => void syncReservation(), 8000)
        : undefined;

    return () => {
      cancelled = true;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [
    isSeller,
    isPendingBuyerForMe,
    pendingBuyer,
    buyerConfirmed,
    sellerHasConfirmed,
    isSold,
    isCancelled,
    listingId,
    transactionObj.eth_address,
    transactionObj.transaction_key,
    transactionObj.transaction_number,
    transactionObj.reservation_id,
    route,
  ]);

  async function requestBuy() {
    if (!user) {
      setMessage('Log in and connect your wallet first.');
      return;
    }
    if (!user.mobile_number || !user.payment_method_id) {
      setMessage('Bind mobile money in Profile before buying.');
      return;
    }
    if (!window.ethereum) {
      setMessage('MetaMask is required.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await ensureSepoliaChain();
      const provider = getBrowserProvider();
      const [buyer] = await provider.send('eth_requestAccounts', []);
      await axios.post(route('trades.request_buy', listingId), { buyer });
      setPendingBuyer(buyer);
      setMessage(
        'Buy requested. Waiting for the seller to confirm your wallet — Continue payment will appear after that.',
      );
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Could not request buy.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function clearBuyerRequest() {
    if (!listingId || !canClearBuyerRequest) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { data } = await axios.post(route('trades.clear_buyer', listingId));
      setPendingBuyer(null);
      setBuyerConfirmed(false);
      setMessage(data.message || 'Buyer request cleared.');
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Could not clear buyer request.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelListing() {
    if (!listingId || !showCancelListing) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { data } = await axios.post(route('trades.cancel', listingId));
      setPendingBuyer(null);
      setRemoved(true);
      setMessage(data.message || 'Listing cancelled.');
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Could not cancel listing.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function expireReservation() {
    if (!listingId || !showExpireReservation) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { data } = await axios.post(
        route('trades.expire_reservation', listingId),
      );
      setPendingBuyer(null);
      setBuyerConfirmed(false);
      setMessage(
        data.message ||
          'Reservation expired. Listing is open again for other buyers.',
      );
      // Soft-refresh so marketplace/dashboard props catch up.
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Could not expire reservation.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmReserveAsSeller() {
    if (!pendingBuyer || !window.ethereum) {
      return;
    }
    if (!isValidBytes32(transactionObj.transaction_number)) {
      setMessage(
        'This listing cannot be reserved on-chain (invalid or demo-only deposit id). Clear the buyer request, then create a real listing by depositing USDT.',
      );
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await ensureSepoliaChain();
      const provider = getBrowserProvider();
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const p2p = getEmpiyaP2P(signer);
      const tx = await p2p.reserve(
        transactionObj.transaction_key,
        transactionObj.transaction_number,
        pendingBuyer,
      );
      const receipt = await tx.wait();
      const onchain = await p2p.getUserTransactionByUser(
        transactionObj.eth_address,
        transactionObj.transaction_key,
      );
      const reservationId = onchain.reservationId?.toString?.() || '';
      const txHash = receipt.transactionHash as string;

      if (listingId && reservationId) {
        await axios.post(route('trades.confirm_reserve', listingId), {
          buyer: pendingBuyer,
          reservation_id: reservationId,
          reserve_tx_hash: txHash,
        });
      }

      setBuyerConfirmed(true);
      setReserveTxHash(txHash);
      setMessage(
        `Reserved on-chain. Tx: ${shortenHex(txHash, 10, 8)}`,
      );
    } catch (error: any) {
      setMessage(
        friendlyReserveError(error, transactionObj.transaction_number),
      );
    } finally {
      setBusy(false);
    }
  }

  async function syncListingFromChain(onchain: any) {
    if (!listingId) {
      return;
    }
    const chainStatus = Number(onchain.status);
    try {
      await axios.post(route('trades.sync_onchain', listingId), {
        status: chainStatus,
        reservation_id: onchain.reservationId?.toString?.() || null,
        reserved_buyer:
          chainStatus === 1 || chainStatus === 2
            ? String(onchain.recipient || '')
            : null,
      });
    } catch {
      // Best-effort; UI message still reflects chain.
    }
    if (chainStatus === 2) {
      setBuyerConfirmed(true);
    }
    if (chainStatus === 0) {
      setPendingBuyer(null);
      setBuyerConfirmed(false);
    }
  }

  async function continuePayment() {
    if (!user || !window.ethereum) {
      return;
    }
    setBusy(true);
    setMessage('Checking on-chain reservation…');
    try {
      await ensureSepoliaChain();
      const provider = getBrowserProvider();
      const [buyer] = await provider.send('eth_requestAccounts', []);
      const p2p = getEmpiyaP2P(provider);
      const onchain = await p2p.getUserTransactionByUser(
        transactionObj.eth_address,
        transactionObj.transaction_key,
      );
      const chainStatus = Number(onchain.status);
      const recipient = String(onchain.recipient || '').toLowerCase();

      if (chainStatus === 2) {
        await syncListingFromChain(onchain);
        setMessage(
          'This trade is already complete on-chain — USDT was released to the buyer. Refreshing…',
        );
        window.setTimeout(() => window.location.reload(), 1200);
        return;
      }
      if (chainStatus === 3) {
        await syncListingFromChain(onchain);
        setMessage('This listing was cancelled on-chain.');
        return;
      }
      if (chainStatus === 0) {
        await syncListingFromChain(onchain);
        setMessage(
          'On-chain reservation is no longer active (expired or reopened). Ask the seller to confirm again, or pick another listing.',
        );
        return;
      }
      if (chainStatus !== 1) {
        setMessage(
          `Unexpected on-chain status (${chainStatus}). Try refresh, or release/reopen the reservation.`,
        );
        return;
      }
      if (recipient !== String(buyer).toLowerCase()) {
        setMessage('This listing is reserved for another buyer.');
        return;
      }

      const { data } = await axios.post(
        route('trades.start_deposit', listingId),
        {
          buyer,
          reservation_id: onchain.reservationId.toString(),
          transaction_key: transactionObj.transaction_key,
          transaction_number: transactionObj.transaction_number,
          depositor: transactionObj.eth_address,
        },
      );
      setMessage(
        data.message ||
          'MoMo deposit started — approve the PIN prompt on your phone.',
      );

      if (data.transfer?.id) {
        pollTransfer(data.transfer.id);
      }
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Could not start MoMo deposit.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function pollTransfer(id: number) {
    try {
      const { data } = await axios.get(route('momo_transfers.status', id));
      const status = data.transfer?.status;
      if (status === 'COMPLETED') {
        setMessage('Payment completed. USDT release and seller payout are processing.');
        return;
      }
      if (status === 'FAILED') {
        setMessage('MoMo payment failed. The reservation will be refunded if possible.');
        return;
      }
      setTimeout(() => pollTransfer(id), 8000);
    } catch {
      // ignore poll errors
    }
  }

  if (removed) {
    return null;
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-soft">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl bg-sand"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {transactionObj.name || 'Seller'}
          </p>
          <p
            className="truncate font-mono text-xs text-ink-muted"
            title={transactionObj.eth_address || undefined}
          >
            {shortenHex(transactionObj.eth_address)}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-5 py-5">
        <p className="font-display text-2xl font-bold text-ink">
          {transactionObj.symbol}{' '}
          {formatUsdtAmount(transactionObj.amount)}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Price</dt>
            <dd className="font-medium text-ink">
              {String(transactionObj.currency || 'ZMW').toUpperCase()}{' '}
              {transactionObj.price} / unit
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Total</dt>
            <dd className="font-semibold text-ink">
              {String(transactionObj.currency || 'ZMW').toUpperCase()}{' '}
              {Number.isFinite(total)
                ? total.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })
                : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 space-y-1 text-xs text-ink-muted">
          <p>Pay with mobile money</p>
          <p className="font-medium text-ink">
            Bound MoMo profile required
          </p>
          {pendingBuyer && (showConfirmBuyer || showBuyerConfirmed) && (
            <p className="mt-2 font-mono text-ink" title={pendingBuyer}>
              Buyer: {shortenHex(pendingBuyer)}
            </p>
          )}
        </div>

        {message && (
          <p
            className="mt-4 break-all font-mono text-xs text-ink-muted"
            title={reserveTxHash || undefined}
          >
            {message}
          </p>
        )}
        {!message && showSellerAwaitingPayment && (
          <p className="mt-4 text-xs text-ink-muted">
            Waiting for buyer to pay with MoMo
            {transactionObj.reservation_id
              ? ` (reservation #${shortenHex(String(transactionObj.reservation_id), 4, 4)})`
              : ''}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4">
        <span className="text-sm font-medium text-ink-muted">
          {transactionObj.token} {transactionObj.symbol}
        </span>
        {isCancelled && (
          <span className="rounded-lg bg-sand px-3 py-2 text-xs font-semibold text-ink-muted">
            Cancelled
          </span>
        )}
        {isSold && (
          <span className="rounded-lg bg-sand px-3 py-2 text-xs font-semibold text-ink-muted">
            Sold
          </span>
        )}
        {heldByOtherBuyer && (isOpen || isProcessing) && (
          <span className="rounded-lg bg-sand px-3 py-2 text-xs font-semibold text-ink-muted">
            Reserved for another buyer
          </span>
        )}
        {showWaitingForSeller && (
          <span className="rounded-lg bg-sand px-3 py-2 text-xs font-semibold text-ink-muted">
            Waiting for seller confirmation
          </span>
        )}
        {(showBuy || showContinuePayment) && (
          <div className="flex flex-wrap gap-2">
            {showBuy && (
              <button
                type="button"
                disabled={busy || !listingId}
                onClick={() => void requestBuy()}
                className="rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-deep disabled:opacity-60"
              >
                Buy with MoMo
              </button>
            )}
            {showContinuePayment && (
              <button
                type="button"
                disabled={busy || !listingId}
                onClick={() => void continuePayment()}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink"
              >
                Continue payment
              </button>
            )}
          </div>
        )}
        {showConfirmBuyer && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmReserveAsSeller()}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-deep disabled:opacity-60"
            >
              Confirm buyer
            </button>
            {canClearBuyerRequest && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void clearBuyerRequest()}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60"
              >
                Clear request
              </button>
            )}
          </div>
        )}
        {isSeller &&
          pendingBuyer &&
          !hasValidOnchainId &&
          isOpen &&
          !buyerConfirmed && (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-sand px-3 py-2 text-xs font-semibold text-ink-muted">
                Demo listing — cannot reserve
              </span>
              {canClearBuyerRequest && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void clearBuyerRequest()}
                  className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60"
                >
                  Clear request
                </button>
              )}
            </div>
          )}
        {!showConfirmBuyer && canClearBuyerRequest && !isSeller && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void clearBuyerRequest()}
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60"
          >
            Cancel my request
          </button>
        )}
        {showCancelListing && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancelListing()}
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink-muted hover:border-ink hover:text-ink disabled:opacity-60"
          >
            {hasValidOnchainId ? 'Cancel listing' : 'Remove listing'}
          </button>
        )}
        {showSellerAwaitingPayment && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-emerald/10 px-3 py-2 text-xs font-semibold text-emerald">
              Awaiting MoMo payment
            </span>
            {showExpireReservation && (
              <button
                type="button"
                disabled={busy}
                title="Only works after the 1-hour on-chain reservation window"
                onClick={() => void expireReservation()}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-ink-muted hover:border-ink hover:text-ink disabled:opacity-60"
              >
                Reopen after timeout
              </button>
            )}
          </div>
        )}
        {!isSeller && showExpireReservation && (
          <button
            type="button"
            disabled={busy}
            title="Only works after the 1-hour on-chain reservation window"
            onClick={() => void expireReservation()}
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60"
          >
            Release reservation
          </button>
        )}
      </div>
    </article>
  );
}
