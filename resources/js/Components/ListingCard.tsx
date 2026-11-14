import React, { useState } from 'react';
import { toSvg } from 'jdenticon';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import {
  ensureSepoliaChain,
  getBrowserProvider,
  getEmpiyaP2P,
} from '@/lib/contracts';

declare let window: any;

export default function ListingCard(transaction: any) {
  const route = useRoute();
  const page = useTypedPage();
  const user = page.props.user;
  const transactionObj = transaction.transaction[1];
  const svgString = toSvg(transactionObj.eth_address || 'e-Mpiya P2P', 56);
  const total =
    Number(transactionObj.price || 0) * Number(transactionObj.amount || 0);
  const isOpen = Number(transactionObj.status) === 0;
  const isSold = Number(transactionObj.status) === 2;
  const isCancelled = Number(transactionObj.status) === 3;
  const listingId = transactionObj.listing_id;
  const isSeller =
    user &&
    transactionObj.eth_address &&
    String(user.eth_address || '').toLowerCase() ===
      String(transactionObj.eth_address).toLowerCase();
  const pendingBuyer = transactionObj.reserved_buyer;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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
      setMessage(
        'Buy requested. Ask the seller to confirm/reserve this listing for your wallet, then click Continue payment.',
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

  async function confirmReserveAsSeller() {
    if (!pendingBuyer || !window.ethereum) {
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
      setMessage(`Reserved on-chain. Tx: ${receipt.transactionHash}`);
    } catch (error: any) {
      setMessage(error?.message || 'Reserve failed.');
    } finally {
      setBusy(false);
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

      if (Number(onchain.status) !== 1) {
        setMessage('Seller has not reserved this listing yet.');
        return;
      }
      if (String(onchain.recipient).toLowerCase() !== String(buyer).toLowerCase()) {
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

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-soft">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`}
          alt=""
          className="h-12 w-12 rounded-xl bg-sand"
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {transactionObj.name || 'Seller'}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {transactionObj.eth_address}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-5">
        <p className="font-display text-2xl font-bold text-ink">
          {transactionObj.symbol} {transactionObj.amount}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Price</dt>
            <dd className="font-medium text-ink">
              ZMW {transactionObj.price} / unit
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Total</dt>
            <dd className="font-semibold text-ink">
              ZMW {Number.isFinite(total) ? total.toLocaleString() : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 space-y-1 text-xs text-ink-muted">
          <p>Pay with mobile money</p>
          <p className="font-medium text-ink">
            Bound MoMo profile required
          </p>
        </div>

        {message && (
          <p className="mt-4 text-xs text-ink-muted">{message}</p>
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
        {isOpen && !isSeller && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !listingId}
              onClick={() => void requestBuy()}
              className="rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-deep disabled:opacity-60"
            >
              Buy
            </button>
            <button
              type="button"
              disabled={busy || !listingId}
              onClick={() => void continuePayment()}
              className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-ink"
            >
              Continue payment
            </button>
          </div>
        )}
        {isOpen && isSeller && pendingBuyer && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirmReserveAsSeller()}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-deep disabled:opacity-60"
          >
            Confirm buyer
          </button>
        )}
      </div>
    </article>
  );
}
