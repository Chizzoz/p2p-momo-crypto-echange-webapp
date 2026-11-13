/** Sepolia-first chain config for EmpiyaP2P + USDT. Values come from Vite env. */

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

function requireEnv(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) {
    throw new Error(`Set ${name} in the webapp .env (Vite).`);
  }
  return value;
}

export const chainConfig = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID || SEPOLIA_CHAIN_ID),
  chainIdHex: SEPOLIA_CHAIN_ID_HEX,
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [
    import.meta.env.VITE_ALCHEMY_API_KEY
      ? `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`
      : 'https://ethereum-sepolia-rpc.publicnode.com',
  ],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
  alchemyApiKey: (import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined) || '',
  empiyaP2P: () => requireEnv('VITE_EMPIYA_P2P_ADDRESS'),
  empiyaPayments: () =>
    (import.meta.env.VITE_EMPIYA_PAYMENTS_ADDRESS as string | undefined) || '',
  usdt: () => requireEnv('VITE_USDT_ADDRESS'),
  usdtDecimals: Number(import.meta.env.VITE_USDT_DECIMALS || '6'),
};

export function isConfiguredChain(chainId: number): boolean {
  return chainId === chainConfig.chainId;
}
