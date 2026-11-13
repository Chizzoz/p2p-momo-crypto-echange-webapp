import React, { useEffect, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import { TransactionProp } from '@/Layouts/AppLayout';
import ListingCard from '@/Components/ListingCard';
import {
  ensureSepoliaChain,
  getBrowserProvider,
  getEmpiyaP2P,
} from '@/lib/contracts';
import { formatUsdt } from '@/lib/units';

declare let window: any;

type Props = {
  walletAddress: string;
  setWalletAddress: React.Dispatch<React.SetStateAction<string>>;
};

type OnChainTx = {
  transactionNumber: string;
  amount: any;
  status: number;
  recipient: string;
  reservedAt: any;
  reservationId: any;
};

export default function Dashboard() {
  const route = useRoute();
  const page = useTypedPage();
  const [userTransactions, setUserTransactions] = useState<OnChainTx[]>([]);

  const transactionsByUuser: any = page.props.transactions_by_user;

  async function getTransactions() {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        console.warn('MetaMask required to load on-chain listings for the connected seller.');
        return;
      }
      await ensureSepoliaChain();
      const provider = getBrowserProvider();
      await provider.send('eth_requestAccounts', []);
      const empiyaP2P = getEmpiyaP2P(provider.getSigner());
      const txs: OnChainTx[] = await empiyaP2P.getUserTransactions();
      console.log('on-chain user transactions', txs);
      setUserTransactions(Array.from(txs));
    } catch (error) {
      console.error('getUserTransactions failed', error);
    }
  }

  function reconcileTransactions() {
    userTransactions.forEach((transaction, key) => {
      const full_transaction: TransactionProp = {
        _token: page.props.csrf_token,
        transaction_key: key,
        transaction_number: transaction.transactionNumber,
        amount: parseFloat(formatUsdt(transaction.amount)),
        status: Number(transaction.status),
        recipient: transaction.recipient,
        momo_payment: 'momo_payment',
        token_id: 1,
        price: 15.78,
      };
      console.log(`full_transaction ${key}`, {
        ...full_transaction,
        reservedAt: transaction.reservedAt?.toString?.(),
        reservationId: transaction.reservationId?.toString?.(),
      });

      axios
        .post(route('store_transaction'), full_transaction)
        .then(function (response) {
          console.log(response);
        })
        .catch(function (error) {
          console.log(error);
        });
    });
  }

  useEffect(() => {
    getTransactions();
  }, []);

  useEffect(() => {
    if (userTransactions.length > 0) {
      reconcileTransactions();
    }
  }, [userTransactions]);

  return (
    <AppLayout
      title="Dashboard"
      renderHeader={() => (
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">Dashboard</h2>
      )}
    >
      {({ walletAddress }: Props) => (
        <div className="py-12">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
              <div className="p-6 sm:px-6 bg-white border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3">
                  {transactionsByUuser &&
                    Object.entries(transactionsByUuser).map((transaction: any, index: number) => {
                      return <ListingCard transaction={transaction} key={index} />;
                    })}
                </div>
              </div>
              {page.props.user.id == 1 && (
                <button
                  type="button"
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                  onClick={() => reconcileTransactions()}
                >
                  Reconcile
                </button>
              )}
              {walletAddress && (
                <p className="p-4 text-sm text-gray-500">Connected: {walletAddress}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
