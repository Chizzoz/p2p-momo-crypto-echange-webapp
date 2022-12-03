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

export default function Welcome({ modal, setModal, walletAddress, setWalletAddress, createTransactionModalOpen, setCreateTransactionModalOpen, user, window, empiyaP2PContract }: Props) {
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
                ({ modal, setModal, createTransactionModalOpen, setCreateTransactionModalOpen }: Props) => (
                    <div className="py-12">
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                            <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                                <div className="p-6 sm:px-20 bg-white border-b border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3">
                                        <ListingCard address={walletAddress} />
                                    </div>
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
