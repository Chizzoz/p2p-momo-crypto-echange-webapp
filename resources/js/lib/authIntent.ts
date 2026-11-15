export type AuthIntent =
  | { kind: 'buy'; listingId: number | string; returnTo: string }
  | { kind: 'fill'; orderId: number; returnTo: string }
  | { kind: 'sell_usdt'; returnTo: string }
  | { kind: 'sell_momo'; returnTo: string };

const STORAGE_KEY = 'empiya.pendingAuthIntent';

export function currentReturnTo(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  return `${window.location.pathname}${window.location.search}`;
}

export function setAuthIntent(intent: AuthIntent): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function peekAuthIntent(): AuthIntent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AuthIntent;
  } catch {
    return null;
  }
}

export function clearAuthIntent(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function takeAuthIntent(
  match: (intent: AuthIntent) => boolean,
): AuthIntent | null {
  const intent = peekAuthIntent();
  if (!intent || !match(intent)) {
    return null;
  }
  clearAuthIntent();
  return intent;
}
