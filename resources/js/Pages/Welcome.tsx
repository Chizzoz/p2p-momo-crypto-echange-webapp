import { InertiaLink } from '@inertiajs/inertia-react';
import React, { useEffect, useState } from 'react';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import { Head } from '@inertiajs/inertia-react';
import { ethers } from 'ethers';
import DownloadMetamaskModal from '@/Components/DownloadMetamaskModal';
import CreateTransactionModal from '@/Components/CreateTransactionModal';
import ListingCard from '@/Components/ListingCard';
import AppLayout from '@/Layouts/AppLayout';
import { User } from '@/types';

type Props = {
    modal: boolean;
    setModal: React.Dispatch<React.SetStateAction<boolean>>;
    user: User;
    window: any;
    empiyaP2PContract: ethers.Contract;
    walletAddress: string;
    setWalletAddress: React.Dispatch<React.SetStateAction<string>>;
    createTransactionModalOpen: boolean;
    setCreateTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Welcome({modal, setModal, walletAddress, setWalletAddress, createTransactionModalOpen, setCreateTransactionModalOpen, user, window, empiyaP2PContract}: Props) {
    const route = useRoute();
    const page = useTypedPage();

    return (
        <AppLayout
            title="Homepage"
            renderHeader={() => (
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Homepage
                </h2>
            )}
        >
            {
                ({modal, setModal, createTransactionModalOpen, setCreateTransactionModalOpen}: Props) => (
                    <div className="relative flex items-top justify-center min-h-screen bg-gray-100 dark:bg-gray-900 sm:items-center sm:pt-0">
                        <Head title="Welcome" />

                        <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
                            <h3>Header</h3>
                            <div className="mt-8 bg-white dark:bg-gray-800 overflow-hidden shadow sm:rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3">
                                    <ListingCard address={walletAddress} />
                                </div>
                            </div>
                        </div>
                        <DownloadMetamaskModal modalOpen={modal} setModalOpen={setModal} />
                        <CreateTransactionModal modalOpen={createTransactionModalOpen} setModalOpen={setCreateTransactionModalOpen} />
                    </div>
                )
            }
        </AppLayout>
    );
}
