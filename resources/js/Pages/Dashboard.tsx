import React, { useEffect, useState } from 'react';
import Welcome from '@/Components/Welcome';
import AppLayout from '@/Layouts/AppLayout';
import { Alchemy, AlchemyProvider, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import contractABI from '../EmpiyaP2P-abi.json';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';

// Alchemy SDK Setup
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY;
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const privateKey = import.meta.env.VITE_PRIVATE_KEY;

const settings = {
    apiKey: alchemyKey,
    network: Network.MATIC_MUMBAI,
};

const alchemy = new Alchemy(settings);

declare let window: any;

type Props = {
    alchemy: Alchemy;
    walletAddress: string;
    setWalletAddress: React.Dispatch<React.SetStateAction<string>>;
    privateKey: any;
    contractAddress: any;
}

type TransactionProp = {
    _token: any,
    transaction_key: number;
    transaction_number: string;
    amount: number;
    status: number;
    recipient: string;
    momo_payment: string;
    token_id: string;
    price: number;
}

export default function Dashboard({ walletAddress, setWalletAddress }: Props) {
    const route = useRoute();
    const page = useTypedPage();
    const [userTransactions, setUserTransactions] = useState<any>([]);

    async function getTransactions() {
        // Provider
        let provider: AlchemyProvider = await alchemy.config.getProvider();
        // Admin Signer
        const signer = new ethers.Wallet(privateKey, provider);
        // Interact with Contract as Admin
        const empiyaP2PContract = new ethers.Contract(
            contractAddress,
            contractABI,
            signer,
        );
        // Web3 Provider
        let web3Provider: ethers.providers.Web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const [address] = await web3Provider.send("eth_requestAccounts", []);
        // Call Contract functions
        const userTransactions = await empiyaP2PContract.connect(address).getUserTransactions();
        // console.log('manele', ethers.utils.formatEther(escrowContractAddress));
        console.log(userTransactions);
        setUserTransactions(structuredClone(userTransactions));
    }

    async function reconcileTransactions() {
        userTransactions.forEach((transaction: [transactionNumber: string, amount: number, status: number, recipient: string], key: number) => {
            console.log("transaction", key, transaction);
            let full_transaction: TransactionProp = {
                _token: page.props.csrf_token,
                transaction_key: key,
                transaction_number: transaction[0],
                amount: parseFloat(ethers.utils.formatEther(transaction[1])),
                status: transaction[2],
                recipient: transaction[3],
                momo_payment: 'momo_payment',
                token_id: 'MATIC',
                price: 15.78
            }
            console.log(`full_transaction ${key}`, full_transaction);

            axios.post(route('store_transaction'), full_transaction)
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

        reconcileTransactions();
    }, []);

    return (
        <AppLayout
            title="Dashboard"
            renderHeader={() => (
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Dashboard
                </h2>
            )}
        >
            {
                ({ walletAddress }: Props) => (
                    <div className="py-12">
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                            <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                                <div className="p-6 sm:px-20 bg-white border-b border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3">
                                        {
                                            userTransactions &&
                                                userTransactions.map((userTransaction: any) => {
                                                    <Welcome address={userTransaction.transactionKey} />
                                                })
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </AppLayout>
    );
}
