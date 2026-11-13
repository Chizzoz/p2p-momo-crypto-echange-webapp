import { ethers } from 'ethers';
import { chainConfig, isConfiguredChain } from './chain';
import { formatUsdt } from './units';
import empiyaP2PAbi from '../abis/EmpiyaP2P-abi.json';
import empiyaPaymentsAbi from '../abis/EmpiyaPayments-abi.json';
import ierc20Abi from '../abis/IERC20-abi.json';

declare let window: any;

export function getReadProvider(): ethers.providers.JsonRpcProvider {
  return new ethers.providers.JsonRpcProvider(chainConfig.rpcUrls[0], chainConfig.chainId);
}

export function getBrowserProvider(): ethers.providers.Web3Provider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not available.');
  }
  return new ethers.providers.Web3Provider(window.ethereum, 'any');
}

export async function getBrowserSigner(): Promise<ethers.providers.JsonRpcSigner> {
  const provider = getBrowserProvider();
  await provider.send('eth_requestAccounts', []);
  await ensureSepoliaChain();
  return provider.getSigner();
}

export async function ensureSepoliaChain(): Promise<void> {
  const provider = getBrowserProvider();
  const network = await provider.getNetwork();
  if (isConfiguredChain(network.chainId)) {
    return;
  }

  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: chainConfig.chainIdHex }]);
  } catch (error: any) {
    // 4902 = chain not added to MetaMask
    if (error?.code === 4902 || error?.data?.originalError?.code === 4902) {
      await provider.send('wallet_addEthereumChain', [
        {
          chainId: chainConfig.chainIdHex,
          chainName: chainConfig.chainName,
          nativeCurrency: chainConfig.nativeCurrency,
          rpcUrls: chainConfig.rpcUrls,
          blockExplorerUrls: chainConfig.blockExplorerUrls,
        },
      ]);
      return;
    }
    throw error;
  }
}

export function getEmpiyaP2P(
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
): ethers.Contract {
  return new ethers.Contract(chainConfig.empiyaP2P(), empiyaP2PAbi, signerOrProvider);
}

export function getEmpiyaPayments(
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
): ethers.Contract {
  const address = chainConfig.empiyaPayments();
  if (!address) {
    throw new Error('Set VITE_EMPIYA_PAYMENTS_ADDRESS in the webapp .env.');
  }
  return new ethers.Contract(address, empiyaPaymentsAbi, signerOrProvider);
}

export function getUsdt(
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
): ethers.Contract {
  return new ethers.Contract(chainConfig.usdt(), ierc20Abi, signerOrProvider);
}

export async function getUsdtBalance(
  owner: string,
  signerOrProvider?: ethers.Signer | ethers.providers.Provider,
): Promise<ethers.BigNumber> {
  const providerOrSigner = signerOrProvider ?? getReadProvider();
  const usdt = getUsdt(providerOrSigner);
  return usdt.balanceOf(owner);
}

/** Ethereum-style USDT: reset to 0 before setting a new non-zero allowance. */
export async function ensureUsdtAllowance(
  owner: string,
  spender: string,
  amount: ethers.BigNumber,
  signer: ethers.Signer,
): Promise<void> {
  const usdt = getUsdt(signer);
  const current: ethers.BigNumber = await usdt.allowance(owner, spender);
  if (current.gte(amount)) {
    return;
  }
  if (!current.isZero()) {
    const reset = await usdt.approve(spender, 0);
    await reset.wait();
  }
  const approveTx = await usdt.approve(spender, amount);
  await approveTx.wait();
}

export class UserFacingTxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingTxError';
  }
}

export async function assertUsdtBalance(
  owner: string,
  amount: ethers.BigNumber,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
): Promise<ethers.BigNumber> {
  const usdt = getUsdt(signerOrProvider);
  const balance: ethers.BigNumber = await usdt.balanceOf(owner);
  if (balance.lt(amount)) {
    throw new UserFacingTxError(
      `Insufficient Sepolia USDT. Your wallet has ${formatUsdt(balance)} USDT, but this deposit needs ${formatUsdt(amount)} USDT. Fund ${owner} with test USDT (${chainConfig.usdt()}), then try again.`,
    );
  }
  return balance;
}

export async function assertDepositAllowed(
  amount: ethers.BigNumber,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
): Promise<void> {
  const p2p = getEmpiyaP2P(signerOrProvider);
  const [paused, maxDeposit]: [boolean, ethers.BigNumber] = await Promise.all([
    p2p.paused(),
    p2p.maxDeposit(),
  ]);
  if (paused) {
    throw new UserFacingTxError('Deposits are temporarily paused on EmpiyaP2P.');
  }
  if (amount.gt(maxDeposit)) {
    throw new UserFacingTxError(
      `Amount exceeds the max deposit of ${formatUsdt(maxDeposit)} USDT.`,
    );
  }
}

function rawTxErrorText(error: any): string {
  return String(
    error?.reason ||
      error?.error?.message ||
      error?.data?.message ||
      error?.error?.data?.message ||
      error?.message ||
      '',
  );
}

/** Map wallet / RPC / revert noise into a short message safe to show in the UI. */
export function formatTxError(error: any): string {
  if (error instanceof UserFacingTxError) {
    return error.message;
  }

  const code = error?.code ?? error?.error?.code;
  const text = rawTxErrorText(error);
  const lower = text.toLowerCase();

  if (
    code === 4001 ||
    code === 'ACTION_REJECTED' ||
    lower.includes('user rejected') ||
    lower.includes('user denied')
  ) {
    return 'Transaction cancelled in MetaMask.';
  }

  if (
    lower.includes('insufficient funds') ||
    lower.includes('insufficient balance')
  ) {
    return 'Insufficient Sepolia ETH for gas. Add test ETH to your wallet and try again.';
  }

  if (lower.includes('insufficient sepolia usdt') || lower.includes('transfer amount exceeds balance')) {
    return 'Insufficient Sepolia USDT for this deposit. Fund your wallet with test USDT and try again.';
  }

  if (lower.includes('deposits are paused') || lower.includes('new deposits and reservations are paused')) {
    return 'Deposits are temporarily paused on EmpiyaP2P.';
  }

  if (lower.includes('deposit exceeds the per-deposit limit')) {
    return 'Amount exceeds the per-deposit limit.';
  }

  if (lower.includes('deposit exceeds the total escrow limit')) {
    return 'Amount exceeds the total escrow limit.';
  }

  if (
    code === 'UNPREDICTABLE_GAS_LIMIT' ||
    lower.includes('cannot estimate gas') ||
    lower.includes('execution reverted')
  ) {
    const reasonMatch = text.match(/reason="([^"]+)"/i);
    if (reasonMatch?.[1] && reasonMatch[1] !== 'execution reverted') {
      return reasonMatch[1];
    }
    return 'Deposit could not be submitted. Check your Sepolia USDT balance and allowance, then try again.';
  }

  if (!text) {
    return 'Something went wrong while submitting the transaction. Please try again.';
  }

  // Drop ethers docs suffixes / huge stacks.
  return text
    .replace(/\s*\[\s*See:\s*https?:\/\/[^\]]+\]/gi, '')
    .replace(/\s*\(note=.*?\)/gi, '')
    .split('\n')[0]
    .trim();
}
