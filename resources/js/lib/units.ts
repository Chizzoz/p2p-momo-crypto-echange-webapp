import { ethers } from 'ethers';
import { chainConfig } from './chain';

export function parseUsdt(amount: string | number): ethers.BigNumber {
  return ethers.utils.parseUnits(String(amount), chainConfig.usdtDecimals);
}

/**
 * Human-readable USDT amount (trims long DB/on-chain decimals).
 * Default: up to 2 fractional digits.
 */
export function formatUsdtAmount(
  amount: string | number | null | undefined,
  maxFractionDigits = 2,
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return '—';
  }
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

export function formatUsdt(
  amount: ethers.BigNumberish,
  maxFractionDigits = 2,
): string {
  return formatUsdtAmount(
    ethers.utils.formatUnits(amount, chainConfig.usdtDecimals),
    maxFractionDigits,
  );
}
