import { ethers } from 'ethers';
import { chainConfig } from './chain';

export function parseUsdt(amount: string | number): ethers.BigNumber {
  return ethers.utils.parseUnits(String(amount), chainConfig.usdtDecimals);
}

export function formatUsdt(amount: ethers.BigNumberish): string {
  return ethers.utils.formatUnits(amount, chainConfig.usdtDecimals);
}
