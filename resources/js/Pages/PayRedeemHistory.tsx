import { Link, router } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import WaitingIndicator from '@/Components/WaitingIndicator';
import MarketingLayout from '@/Layouts/MarketingLayout';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import {
  isTerminalPayRedeemStatus,
  PaginatedPayRedeems,
  PayRedeemRow,
  payRedeemPaginationMeta,
  payRedeemStatusTone,
  shortenPaymentId,
} from '@/types/payRedeem';

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export default function PayRedeemHistory() {
  const page = useTypedPage();
  const route = useRoute();
  const filters = ((page.props as any).filters || {}) as { per_page?: number };
  const paginated =
    ((page.props as any).pay_redeems as PaginatedPayRedeems) || {
      data: [],
      links: [],
    };

  const rows = paginated.data || [];
  const meta = useMemo(
    () => payRedeemPaginationMeta(paginated),
    [paginated],
  );
  const perPage = Number(filters.per_page || meta.per_page || 10);

  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [localRows, setLocalRows] = useState<PayRedeemRow[]>(rows);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const openCount = localRows.filter(
    row => !isTerminalPayRedeemStatus(row.status),
  ).length;

  function visitPage(url: string | null) {
    if (!url) return;
    router.visit(url, {
      preserveScroll: true,
      preserveState: true,
    });
  }

  function changePerPage(next: number) {
    router.get(
      route('pay.history'),
      { per_page: next },
      { preserveScroll: true, preserveState: true },
    );
  }

  async function checkStatus(id: number) {
    setCheckingId(id);
    setStatusMessage('');
    try {
      const { data } = await axios.get(route('momo_transfers.status', id));
      const transfer = data.transfer;
      const metaPayload = transfer?.metadata || {};
      const status = String(transfer?.status || '').toUpperCase();
      const updated: PayRedeemRow = {
        id: Number(transfer?.id || id),
        status: String(transfer?.status || 'PENDING'),
        amount: String(transfer?.amount ?? ''),
        currency: String(transfer?.currency || '').toUpperCase(),
        usdt_amount:
          metaPayload.usdt_amount != null
            ? String(metaPayload.usdt_amount)
            : null,
        payment_id: transfer?.payment_id ?? null,
        phone: transfer?.phone ?? null,
        provider: transfer?.provider ?? null,
        settled: Boolean(metaPayload.settled),
        chain_refunded: Boolean(metaPayload.chain_refunded),
        failure_message:
          metaPayload.failure_message || metaPayload.failure_code || null,
        created_at: transfer?.created_at ?? null,
        updated_at: transfer?.updated_at ?? null,
      };
      setLocalRows(current =>
        current.map(row => (row.id === updated.id ? updated : row)),
      );

      if (status === 'COMPLETED') {
        setStatusMessage(
          updated.settled
            ? `Payment #${id} completed and settled on-chain.`
            : `Payment #${id} completed; settle requested.`,
        );
      } else if (status === 'FAILED') {
        setStatusMessage(
          `Payment #${id} failed${
            updated.chain_refunded ? '; chain refund attempted.' : '.'
          }`,
        );
      } else {
        setStatusMessage(`Payment #${id} still ${status || 'pending'}.`);
      }

      router.reload({
        only: ['pay_redeems'],
        preserveScroll: true,
      });
    } catch (error: any) {
      setStatusMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Could not refresh payout status.',
      );
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <MarketingLayout title="Pay with USDT activity">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-emerald">
              Pay with USDT
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink">
              Payment activity
            </h1>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Full history of USDT → MoMo payouts. Open items can be checked and
              reconciled after a refresh or closed tab.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={route('pay')}
              className="inline-flex rounded-lg bg-emerald px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              New payment
            </Link>
            <Link
              href={route('dashboard')}
              className="inline-flex rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            {meta.total === 0
              ? 'No payments yet'
              : `Showing ${meta.from ?? 0}–${meta.to ?? 0} of ${meta.total}`}
            {openCount > 0 ? (
              <span className="ml-2 font-medium text-emerald-deep">
                · {openCount} open on this page
              </span>
            ) : null}
          </p>
          <label className="flex items-center gap-2 text-sm text-ink">
            <span className="text-ink-muted">Per page</span>
            <select
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-emerald focus:ring-emerald"
              value={perPage}
              onChange={e => changePerPage(Number(e.currentTarget.value))}
            >
              {PER_PAGE_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {statusMessage ? (
          <div className="mt-4">
            {openCount > 0 && checkingId ? (
              <WaitingIndicator message={statusMessage} />
            ) : (
              <p className="text-sm font-medium text-ink">{statusMessage}</p>
            )}
          </div>
        ) : null}

        {localRows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-white px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold text-ink">
              No Pay with USDT payments yet
            </p>
            <p className="mt-2 text-ink-muted">
              Payments you send will appear here with status and settle details.
            </p>
            <Link
              href={route('pay')}
              className="mt-6 inline-flex rounded-lg bg-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-deep"
            >
              Pay with USDT
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {localRows.map(row => {
              const open = !isTerminalPayRedeemStatus(row.status);
              return (
                <li
                  key={row.id}
                  className={`rounded-2xl border bg-white p-4 shadow-soft sm:p-5 ${
                    open
                      ? 'border-emerald ring-1 ring-emerald/20'
                      : 'border-[var(--line)]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold text-ink">
                        {row.usdt_amount
                          ? `${row.usdt_amount} USDT`
                          : 'USDT payment'}
                        <span className="text-ink-muted"> → </span>
                        {row.currency} {row.amount}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        #{row.id}
                        {row.phone ? ` · ${row.phone}` : ''}
                        {row.provider ? ` · ${row.provider}` : ''}
                        {row.created_at
                          ? ` · ${new Date(row.created_at).toLocaleString()}`
                          : ''}
                      </p>
                      <p className="mt-1 font-mono text-xs text-ink-muted">
                        {shortenPaymentId(row.payment_id)}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${payRedeemStatusTone(
                        row.status,
                      )}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    {row.settled ? (
                      <span className="font-medium text-emerald-deep">
                        On-chain settled
                      </span>
                    ) : null}
                    {row.chain_refunded ? (
                      <span className="font-medium text-ink">
                        Chain refund attempted
                      </span>
                    ) : null}
                    {row.failure_message ? (
                      <span className="text-red-700">{row.failure_message}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {open ? (
                      <button
                        type="button"
                        disabled={checkingId === row.id}
                        onClick={() => void checkStatus(row.id)}
                        className="rounded-lg bg-emerald px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-deep disabled:opacity-60"
                      >
                        {checkingId === row.id
                          ? 'Checking…'
                          : 'Check / reconcile status'}
                      </button>
                    ) : null}
                    {String(row.status).toUpperCase() === 'COMPLETED' ? (
                      <Link
                        href={`${route('pay')}?repeat=${row.id}`}
                        className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold text-ink hover:border-emerald"
                      >
                        Repeat payment
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {meta.last_page > 1 ? (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
            aria-label="Pagination"
          >
            {(paginated.links || []).map((link, index) => {
              const label = link.label
                .replace(/&laquo;|&raquo;|<[^>]+>/g, match => {
                  if (match === '&laquo;') return '«';
                  if (match === '&raquo;') return '»';
                  return '';
                })
                .trim();
              const isDisabled = !link.url;
              return (
                <button
                  key={`${link.label}-${index}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => visitPage(link.url)}
                  className={`min-w-[2.5rem] rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    link.active
                      ? 'bg-emerald text-white'
                      : isDisabled
                        ? 'cursor-not-allowed bg-sand text-ink-muted opacity-60'
                        : 'border border-[var(--line)] bg-white text-ink hover:border-emerald'
                  }`}
                >
                  {label || '…'}
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
    </MarketingLayout>
  );
}
