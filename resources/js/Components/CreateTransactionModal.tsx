import React, { Fragment, useRef, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import InputLabel from './InputLabel';
import TextInput from './TextInput';
import InputError from './InputError';
import SecondaryButton from './SecondaryButton';
import classNames from 'classnames';
import { useForm } from '@inertiajs/inertia-react';
import axios from 'axios';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import { Alchemy, AlchemyProvider, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import contractABI from '../EmpiyaP2P-abi.json';

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

type CreateTransactionModalProps = {
    modalOpen: boolean;
    setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

type TokenProps = {
    id: number;
    token: string;
    symbol: string;
    token_slug: string;
    created_at: string;
    updated_at: string;
}

type PaymentMethodProps = {
    id: number;
    method: string;
    method_slug: string;
    created_at: string;
    updated_at: string;
}

export default function CreateTransactionModal({ modalOpen, setModalOpen }: CreateTransactionModalProps) {
    const route = useRoute();
    const page = useTypedPage();

    let tokens: any = page.props.tokens;
    let paymentMethods: any = page.props.payment_methods;

    const form = useForm({
        amount: "",
        token: "",
        payment_methods: "",
        price: 0,
    });

    const cancelButtonRef = useRef(null);
    const [responseData, setResponseData] = useState<{ [k: string]: string } | undefined>({});

    async function submitTransactionDetails() {
        form.processing = true;
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

        // Signer
        const seller = await web3Provider.getSigner();
        console.log(signer, form.data);
        try {
            // data
            let abiInterface: ethers.utils.Interface = new ethers.utils.Interface(contractABI);
            // Send MATIC to Escrow Acc
            await seller.sendTransaction({
                to: contractAddress,
                from: address,
                value: ethers.utils.parseEther(form.data.amount),
                gasPrice: ethers.utils.parseUnits('30', 'gwei'),
                gasLimit: 1000000,
                data: abiInterface.encodeFunctionData("deposit"),
            }).then(async (response) => {
                console.log('makeDeposit', response);
                // Lets wait.
                let receipt = await response.wait();
                console.log('receipt', receipt);
                console.log(signer, form.data);
            }).catch((error) => {
                console.log('deposit error', error);
            });
            form.processing = false;
        } catch (error) {
            console.error("error", error);
        }
    }

    return (
        <Transition.Root show={modalOpen} as={Fragment}>
            <Dialog
                as="div"
                auto-reopen="true"
                className="fixed z-40 inset-0 overflow-y-auto"
                initialFocus={cancelButtonRef}
                onClose={setModalOpen}
            >
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                        &#8203;
                    </span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                                            Create Crypto Asset Listing
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <form>
                                                <div
                                                    className={classNames(
                                                        'px-4 py-5 bg-white sm:p-6 shadow',
                                                        'sm:rounded-md',
                                                    )}
                                                >
                                                    <div className="grid grid-cols-1 gap-6">
                                                        {/* <!-- Amount --> */}
                                                        <div className="col-span-6 sm:col-span-4">
                                                            <InputLabel htmlFor="amount" value="Amount" />
                                                            <TextInput
                                                                id="amount"
                                                                type="text"
                                                                className="mt-1 block w-full"
                                                                value={form.data.amount}
                                                                onChange={e => form.setData('amount', e.currentTarget.value)}
                                                                autoComplete="amount"
                                                            />
                                                            <InputError message={form.errors.amount} className="mt-2" />
                                                        </div>

                                                        {/* <!-- Token --> */}
                                                        <div className="col-span-6 sm:col-span-4">
                                                            <InputLabel htmlFor="token" value="Token" />


                                                            <select
                                                                id="token"
                                                                value={form.data.token}
                                                                className="mt-1 block w-full"
                                                                onChange={e => form.setData('token', e.currentTarget.value)}
                                                                autoComplete="token"
                                                            >
                                                                <option value="">Select</option>
                                                                {
                                                                    tokens &&
                                                                    tokens.map((token: TokenProps) => {
                                                                        return <option value={token.id} key={token.id}>{token.symbol}</option>
                                                                    })
                                                                }
                                                            </select>

                                                            {/* <!-- Payment method --> */}
                                                            <h3 className="mb-4 mt-4 font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
                                                            <ul className="w-48 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                                                <li className="w-full rounded-t-lg border-b border-gray-200 dark:border-gray-600">
                                                                    {
                                                                        paymentMethods &&
                                                                        paymentMethods.map((paymentMethod: PaymentMethodProps) => {
                                                                            return (paymentMethod.id == 2 ?
                                                                                (
                                                                                    (<div className="flex items-center pl-3" key={paymentMethod.id}>
                                                                                        <input disabled id={paymentMethod.method_slug} type="checkbox" autoComplete='payment_methods' className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500" />
                                                                                        <label htmlFor={paymentMethod.method_slug} className="py-3 ml-2 w-full text-sm font-medium text-gray-900 dark:text-gray-300">{paymentMethod.method}</label>
                                                                                    </div>)
                                                                                )
                                                                                :
                                                                                (
                                                                                    (<div className="flex items-center pl-3" key={paymentMethod.id}>
                                                                                        <input id='payment_methods' type="checkbox" onChange={e => form.setData('payment_methods', e.currentTarget.value)} value={paymentMethod.method_slug} autoComplete={paymentMethod.method_slug} className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500" />
                                                                                        <label htmlFor='payment_methods' className="py-3 ml-2 w-full text-sm font-medium text-gray-900 dark:text-gray-300">{paymentMethod.method}</label>
                                                                                    </div>)
                                                                                ))
                                                                        })
                                                                    }
                                                                </li>
                                                            </ul>
                                                            <InputError message={form.errors.payment_methods} className="mt-2" />
                                                        </div>
                                                        {/* <!-- Unit Price --> */}
                                                        <div className="col-span-6 sm:col-span-4">
                                                            <InputLabel htmlFor="price" value="Unit Price in ZMW" />
                                                            <TextInput
                                                                id="price"
                                                                type="number"
                                                                className="mt-1 block w-full"
                                                                value={form.data.price}
                                                                onChange={e => form.setData('price', e.currentTarget.value)}
                                                                autoComplete="price"
                                                            />
                                                            <InputError message={form.errors.price} className="mt-2" />
                                                        </div>

                                                        <div className="col-span-6 sm:col-span-4">

                                                            <SecondaryButton
                                                                className={classNames({ 'opacity-25': form.processing }, "mt-2 mr-2")}
                                                                type="button"
                                                                onClick={() => submitTransactionDetails()}
                                                                disabled={form.processing}
                                                            >
                                                                SUBMIT
                                                            </SecondaryButton>
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setModalOpen(false)}
                                    ref={cancelButtonRef}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
