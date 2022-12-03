import React from 'react';
import Welcome from '@/Components/Welcome';
import AppLayout from '@/Layouts/AppLayout';
import { Alchemy, AlchemyProvider } from 'alchemy-sdk';
import { ethers } from 'ethers';
import contractABI from '../EmpiyaP2P-abi.json';

type Props = {
    alchemy: Alchemy;
    walletAddress: string;
    setWalletAddress: React.Dispatch<React.SetStateAction<string>>;
    privateKey: any;
    contractAddress: any;
}

declare let window: any;

export default function Dashboard({ alchemy, walletAddress, setWalletAddress, privateKey, contractAddress }: Props) {

    const getTransactions = async () => {
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
        setWalletAddress(address);
        // Call Contract functions
        const escrowContractAddress = await empiyaP2PContract.connect(address).getUserBalance();
        console.log('escrowContractAddress', ethers.utils.formatEther(escrowContractAddress));

        console.log("Fetching Admin...");
        const tx = await empiyaP2PContract.connect(address).getUserTransactions();
        // await tx.wait();
        console.log("The Arbitrator account is: " + tx);
    }

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
                            <div className="p-6 sm:px-20 bg-white border-b border-gray-200">
                                <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                                    <Welcome address={walletAddress} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </AppLayout>
    );
}
