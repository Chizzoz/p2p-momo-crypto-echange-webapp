import React from 'react';
import { toSvg } from 'jdenticon';

export default function ListingCard(transaction: any) {
  const transactionObj = transaction.transaction[1];
  const svgString = toSvg(transactionObj.eth_address || 'e-Mpiya P2P', 56);
  const total =
    Number(transactionObj.price || 0) * Number(transactionObj.amount || 0);
  const isOpen = Number(transactionObj.status) === 0;
  const isSold = Number(transactionObj.status) === 2;
  const isCancelled = Number(transactionObj.status) === 3;

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
            Airtel Money · MTN MoMo · Zamtel Kwacha
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4">
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
        {isOpen && (
          <button
            type="button"
            className="rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-deep"
          >
            Buy
          </button>
        )}
      </div>
    </article>
  );
}
