import { createContext, useContext } from 'react';

export type MarketingActions = {
  openSellFlow: () => void;
  openMoMoFlow: () => void;
  loginWithMetamask: (redirectTo?: string) => Promise<void>;
  isAuthenticated: boolean;
};

export const MarketingActionsContext =
  createContext<MarketingActions | null>(null);

export function useMarketingActions(): MarketingActions {
  const ctx = useContext(MarketingActionsContext);
  if (!ctx) {
    throw new Error('useMarketingActions must be used within MarketingLayout');
  }
  return ctx;
}

/** Safe outside MarketingLayout (e.g. Dashboard ListingCards). */
export function useOptionalMarketingActions(): MarketingActions | null {
  return useContext(MarketingActionsContext);
}
