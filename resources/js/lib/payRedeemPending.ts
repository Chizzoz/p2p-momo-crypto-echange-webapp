const STORAGE_KEY = 'empiya.pendingPayRedeemId';

export function setPendingPayRedeemId(id: number): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // ignore
  }
}

export function getPendingPayRedeemId(): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function clearPendingPayRedeemId(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
