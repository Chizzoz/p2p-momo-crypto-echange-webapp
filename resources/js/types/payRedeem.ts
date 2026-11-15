export type PayRedeemRow = {
  id: number;
  status: string;
  amount: string;
  currency: string;
  usdt_amount?: string | null;
  payment_id?: string | null;
  phone?: string | null;
  provider?: string | null;
  settled?: boolean;
  chain_refunded?: boolean;
  failure_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PaginatedPayRedeems = {
  data: PayRedeemRow[];
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  meta?: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
  // Laravel sometimes flattens meta onto the root for Inertia.
  current_page?: number;
  from?: number | null;
  last_page?: number;
  path?: string;
  per_page?: number;
  to?: number | null;
  total?: number;
};

export function isTerminalPayRedeemStatus(status?: string | null): boolean {
  const s = String(status || '').toUpperCase();
  return s === 'COMPLETED' || s === 'FAILED';
}

export function payRedeemStatusTone(status: string): string {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'bg-emerald/15 text-emerald-deep';
  if (s === 'FAILED') return 'bg-red-100 text-red-800';
  return 'bg-accent/30 text-ink';
}

export function shortenPaymentId(value?: string | null): string {
  if (!value) return '—';
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function payRedeemPaginationMeta(page: PaginatedPayRedeems) {
  return {
    current_page: page.meta?.current_page ?? page.current_page ?? 1,
    from: page.meta?.from ?? page.from ?? null,
    last_page: page.meta?.last_page ?? page.last_page ?? 1,
    per_page: page.meta?.per_page ?? page.per_page ?? 10,
    to: page.meta?.to ?? page.to ?? null,
    total: page.meta?.total ?? page.total ?? page.data.length,
  };
}

export function formatPayRedeemFiatInput(value?: string | null): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return String(Number(n.toFixed(2)));
}
