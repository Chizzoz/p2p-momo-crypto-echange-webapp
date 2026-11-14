import { useState } from 'react';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import { ensureSepoliaChain, getBrowserProvider } from '@/lib/contracts';

declare let window: any;

type DialogState = {
  open: boolean;
  title: string;
  message: string;
};

export default function useWalletAuth() {
  const route = useRoute();
  const [metamaskModalOpen, setMetamaskModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [createTransactionModalOpen, setCreateTransactionModalOpen] =
    useState(false);
  const [createMoMoOfferModalOpen, setCreateMoMoOfferModalOpen] =
    useState(false);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    title: '',
    message: '',
  });

  const closeDialog = () =>
    setDialog(current => ({ ...current, open: false }));

  const loginWithMetamask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setMetamaskModalOpen(true);
      return;
    }

    try {
      const web3Provider = getBrowserProvider();
      await ensureSepoliaChain();

      const message = (await axios.get(route('metamask.signature'))).data;
      const [address] = await web3Provider.send('eth_requestAccounts', []);
      setWalletAddress(address);

      const signature = await web3Provider.getSigner().signMessage(message);
      const { status } = await axios.post(route('metamask.authenticate'), {
        address,
        signature,
      });

      if (status === 200) {
        window.location = route('dashboard');
      }
    } catch (e: any) {
      console.error(e);
      const errorMessage: string = e?.message || '';
      if (errorMessage.includes('500')) {
        setDialog({
          open: true,
          title: 'Wallet connect error',
          message:
            'The address you are trying to connect is already linked to another user.',
        });
      }
    }
  };

  const openSellFlow = (isAuthenticated: boolean) => {
    if (!isAuthenticated) {
      void loginWithMetamask();
      return;
    }
    setCreateTransactionModalOpen(true);
  };

  const openMoMoFlow = (isAuthenticated: boolean) => {
    if (!isAuthenticated) {
      void loginWithMetamask();
      return;
    }
    setCreateMoMoOfferModalOpen(true);
  };

  return {
    metamaskModalOpen,
    setMetamaskModalOpen,
    walletAddress,
    setWalletAddress,
    createTransactionModalOpen,
    setCreateTransactionModalOpen,
    createMoMoOfferModalOpen,
    setCreateMoMoOfferModalOpen,
    dialog,
    setDialog,
    closeDialog,
    loginWithMetamask,
    openSellFlow,
    openMoMoFlow,
  };
}
