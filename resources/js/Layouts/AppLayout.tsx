import { Inertia } from '@inertiajs/inertia';
import { InertiaLink, Head } from '@inertiajs/inertia-react';
import classNames from 'classnames';
import React, { ReactNode, useEffect, useState } from 'react';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import ApplicationMark from '@/Components/ApplicationMark';
import Banner from '@/Components/Banner';
import Dropdown from '@/Components/Dropdown';
import DropdownLink from '@/Components/DropdownLink';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Team } from '@/types';
import { Alchemy, AlchemyProvider, Network } from 'alchemy-sdk';
import contractABI from '../EmpiyaP2P-abi.json';
import MetamaskButton from '@/Components/MetamaskButton';
import { ethers } from 'ethers';
import axios from 'axios';
import GenericModal from '@/Components/GenericModal';
import { BsCashCoin } from "react-icons/bs";
import CreateTransactionModal from '@/Components/CreateTransactionModal';

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
    title: string;
    renderHeader?(): JSX.Element;
    children({ }): ReactNode;
}

export default function AppLayout({
    title,
    renderHeader,
    children,
}: Props) {
    const page = useTypedPage();
    const route = useRoute();
    const [modal, setModal] = useState<boolean>(false);
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [dialogTitle, setDialogTitle] = useState<string>("");
    const [dialogMessage, setDialogMessage] = useState<string>("");
    const [walletAddress, setWalletAddress] = useState<string>("");
    const [createTransactionModalOpen, setCreateTransactionModalOpen] = useState<boolean>(false);
    const [user, setUser] = useState(page.props.user);
    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    function switchToTeam(e: React.FormEvent, team: Team) {
        e.preventDefault();
        Inertia.put(
            route('current-team.update'),
            {
                team_id: team.id,
            },
            {
                preserveState: false,
            },
        );
    }

    const loginWithMetamask = async () => {
        if (typeof window.ethereum !== 'undefined') {
            // Web3 Provider
            let web3Provider: ethers.providers.Web3Provider = new ethers.providers.Web3Provider(window.ethereum);

            const message = (await axios.get(route('metamask.signature'))).data;
            console.log(message);

            const [address] = await web3Provider.send("eth_requestAccounts", []);
            setWalletAddress(address);
            console.log(address);

            const signature = await web3Provider.getSigner().signMessage(message);
            console.log(signature);

            try {
                const { status } = await axios.post(route('metamask.authenticate'), {
                    'address': address,
                    'signature': signature,
                });
                if (status == 200) {
                    window.location = route('dashboard');
                }
            } catch (e: any) {
                console.error(e);
                let errorMessage: string = e.message;
                if (errorMessage.includes('500')) {
                    setDialogTitle('Metamask Connect Error!');
                    setDialogMessage('The address you are trying to connect is already linked to another user.');
                    setDialogOpen(true);
                }
            }

        } else {
            setModal(true);
        }
    }

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
        // Call Contract functions
        const escrowContractAddress = await empiyaP2PContract.connect(address).getUserBalance();
        console.log('escrowContractAddress', ethers.utils.formatEther(escrowContractAddress));

        console.log("Fetching Admin...");
        const tx = await empiyaP2PContract.connect(address).getUserTransactions();
        // await tx.wait();
        console.log("The Arbitrator account is: " + tx);
    }

    const openCreateTransactionModal = () => {
        setCreateTransactionModalOpen(true);
    }

    function logout(e: React.FormEvent) {
        e.preventDefault();
        Inertia.post(route('logout'));
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Head title={title} />

            <Banner />

            <div className="bg-gray-100">
                <nav className="bg-white border-b border-gray-100">
                    {/* <!-- Primary Navigation Menu --> */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex">
                                {/* <!-- Logo --> */}
                                <div className="flex-shrink-0 flex items-center">
                                    <InertiaLink href={route('dashboard')}>
                                        <ApplicationMark className="block h-9 w-auto" />
                                    </InertiaLink>
                                </div>

                                {/* <!-- Navigation Links --> */}
                                <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                    <NavLink
                                        href={route('home')}
                                        active={route().current('home')}
                                    >
                                        Home
                                    </NavLink>
                                </div>

                                <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                    <NavLink
                                        href={route('dashboard')}
                                        active={route().current('dashboard')}
                                    >
                                        Dashboard
                                    </NavLink>
                                </div>
                            </div>

                            {
                                user ?
                                    <div className="hidden sm:flex sm:items-center sm:ml-6">
                                        <div className="ml-3 relative">
                                            <>
                                                {window.ethereum ?
                                                    (
                                                        !user.eth_address &&
                                                        (
                                                            <MetamaskButton loginWithMetamask={loginWithMetamask} />
                                                        )
                                                    )
                                                    :
                                                    (
                                                        <MetamaskButton loginWithMetamask={loginWithMetamask} />
                                                    )
                                                }
                                            </>
                                        </div>

                                        <InertiaLink href={route('login')} className="ml-4">
                                            <button
                                                type="button"
                                                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                                                onClick={() => openCreateTransactionModal}
                                            >
                                                Sell Crypto
                                                <span className="pl-2"><BsCashCoin /></span>
                                            </button>
                                        </InertiaLink>
                                        <div className="ml-3 relative">
                                            {/* <!-- Teams Dropdown --> */}
                                            {page.props.jetstream.hasTeamFeatures ? (
                                                <Dropdown
                                                    align="right"
                                                    width="60"
                                                    renderTrigger={() => (
                                                        <span className="inline-flex rounded-md">
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:bg-gray-50 active:bg-gray-50 transition"
                                                            >
                                                                {user.current_team?.name}

                                                                <svg
                                                                    className="ml-2 -mr-0.5 h-4 w-4"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </span>
                                                    )}
                                                >
                                                    <div className="w-60">
                                                        {/* <!-- Team Management --> */}
                                                        {page.props.jetstream.hasTeamFeatures ? (
                                                            <>
                                                                <div className="block px-4 py-2 text-xs text-gray-400">
                                                                    Manage Team
                                                                </div>

                                                                {/* <!-- Team Settings --> */}
                                                                <DropdownLink
                                                                    href={route('teams.show', [
                                                                        user.current_team!,
                                                                    ])}
                                                                >
                                                                    Team Settings
                                                                </DropdownLink>

                                                                {page.props.jetstream.canCreateTeams ? (
                                                                    <DropdownLink href={route('teams.create')}>
                                                                        Create New Team
                                                                    </DropdownLink>
                                                                ) : null}

                                                                <div className="border-t border-gray-100"></div>

                                                                {/* <!-- Team Switcher --> */}
                                                                <div className="block px-4 py-2 text-xs text-gray-400">
                                                                    Switch Teams
                                                                </div>

                                                                {user.all_teams?.map(team => (
                                                                    <form
                                                                        onSubmit={e => switchToTeam(e, team)}
                                                                        key={team.id}
                                                                    >
                                                                        <DropdownLink as="button">
                                                                            <div className="flex items-center">
                                                                                {team.id ==
                                                                                    user.current_team_id && (
                                                                                        <svg
                                                                                            className="mr-2 h-5 w-5 text-green-400"
                                                                                            fill="none"
                                                                                            strokeLinecap="round"
                                                                                            strokeLinejoin="round"
                                                                                            strokeWidth="2"
                                                                                            stroke="currentColor"
                                                                                            viewBox="0 0 24 24"
                                                                                        >
                                                                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                                        </svg>
                                                                                    )}
                                                                                <div>{team.name}</div>
                                                                            </div>
                                                                        </DropdownLink>
                                                                    </form>
                                                                ))}
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </Dropdown>
                                            ) : null}
                                        </div>

                                        {/* <!-- Settings Dropdown --> */}
                                        <div className="ml-3 relative">
                                            <Dropdown
                                                align="right"
                                                width="48"
                                                renderTrigger={() =>
                                                    page.props.jetstream.managesProfilePhotos ? (
                                                        <button className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-gray-300 transition">
                                                            <img
                                                                className="h-8 w-8 rounded-full object-cover"
                                                                src={user.profile_photo_url}
                                                                alt={user.name}
                                                            />
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex rounded-md">
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition"
                                                            >
                                                                {user.name}

                                                                <svg
                                                                    className="ml-2 -mr-0.5 h-4 w-4"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </span>
                                                    )
                                                }
                                            >
                                                {/* <!-- Account Management --> */}
                                                <div className="block px-4 py-2 text-xs text-gray-400">
                                                    Manage Account
                                                </div>

                                                <DropdownLink href={route('profile.show')}>
                                                    Profile
                                                </DropdownLink>

                                                {page.props.jetstream.hasApiFeatures ? (
                                                    <DropdownLink href={route('api-tokens.index')}>
                                                        API Tokens
                                                    </DropdownLink>
                                                ) : null}

                                                <div className="border-t border-gray-100"></div>

                                                {/* <!-- Authentication --> */}
                                                <form onSubmit={logout}>
                                                    <DropdownLink as="button">Log Out</DropdownLink>
                                                </form>
                                            </Dropdown>
                                        </div>
                                    </div>
                                    :
                                    <div className="hidden fixed top-0 right-0 px-6 py-4 sm:block">
                                        <>
                                            <MetamaskButton loginWithMetamask={loginWithMetamask} />

                                            <InertiaLink href={route('login')} className="ml-4">
                                                <button
                                                    type="button"
                                                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                                                >
                                                    Log In
                                                    <svg
                                                        aria-hidden="true"
                                                        className="ml-2 -mr-1 w-5 h-5"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        ></path>
                                                    </svg>
                                                </button>
                                            </InertiaLink>

                                            <InertiaLink href={route('register')} className="ml-4">
                                                <button
                                                    type="button"
                                                    className="text-white bg-green-500 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                                                >
                                                    Register
                                                </button>
                                            </InertiaLink>
                                        </>
                                    </div>
                            }

                            {/* <!-- Hamburger --> */}
                            <div className="-mr-2 flex items-center sm:hidden">
                                <button
                                    onClick={() =>
                                        setShowingNavigationDropdown(!showingNavigationDropdown)
                                    }
                                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-500 transition"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            className={classNames({
                                                hidden: showingNavigationDropdown,
                                                'inline-flex': !showingNavigationDropdown,
                                            })}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                        <path
                                            className={classNames({
                                                hidden: !showingNavigationDropdown,
                                                'inline-flex': showingNavigationDropdown,
                                            })}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* <!-- Responsive Navigation Menu --> */}
                    {
                        user &&
                        <div
                            className={classNames('sm:hidden', {
                                block: showingNavigationDropdown,
                                hidden: !showingNavigationDropdown,
                            })}
                        >
                            <div className="pt-2 pb-3 space-y-1">
                                <ResponsiveNavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    Dashboard
                                </ResponsiveNavLink>
                            </div>

                            {/* <!-- Responsive Settings Options --> */}
                            <div className="pt-4 pb-1 border-t border-gray-200">
                                <div className="flex items-center px-4">
                                    {page.props.jetstream.managesProfilePhotos ? (
                                        <div className="flex-shrink-0 mr-3">
                                            <img
                                                className="h-10 w-10 rounded-full object-cover"
                                                src={user.profile_photo_url}
                                                alt={user.name}
                                            />
                                        </div>
                                    ) : null}

                                    <div>
                                        <div className="font-medium text-base text-gray-800">
                                            {user.name}
                                        </div>
                                        <div className="font-medium text-sm text-gray-500">
                                            {user.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-1">
                                    <ResponsiveNavLink
                                        href={route('profile.show')}
                                        active={route().current('profile.show')}
                                    >
                                        Profile
                                    </ResponsiveNavLink>

                                    {page.props.jetstream.hasApiFeatures ? (
                                        <ResponsiveNavLink
                                            href={route('api-tokens.index')}
                                            active={route().current('api-tokens.index')}
                                        >
                                            API Tokens
                                        </ResponsiveNavLink>
                                    ) : null}

                                    {/* <!-- Authentication --> */}
                                    <form method="POST" onSubmit={logout}>
                                        <ResponsiveNavLink as="button">
                                            Log Out
                                        </ResponsiveNavLink>
                                    </form>

                                    {/* <!-- Team Management --> */}
                                    {page.props.jetstream.hasTeamFeatures ? (
                                        <>
                                            <div className="border-t border-gray-200"></div>

                                            <div className="block px-4 py-2 text-xs text-gray-400">
                                                Manage Team
                                            </div>

                                            {/* <!-- Team Settings --> */}
                                            <ResponsiveNavLink
                                                href={route('teams.show', [
                                                    user.current_team!,
                                                ])}
                                                active={route().current('teams.show')}
                                            >
                                                Team Settings
                                            </ResponsiveNavLink>

                                            {page.props.jetstream.canCreateTeams ? (
                                                <ResponsiveNavLink
                                                    href={route('teams.create')}
                                                    active={route().current('teams.create')}
                                                >
                                                    Create New Team
                                                </ResponsiveNavLink>
                                            ) : null}

                                            <div className="border-t border-gray-200"></div>

                                            {/* <!-- Team Switcher --> */}
                                            <div className="block px-4 py-2 text-xs text-gray-400">
                                                Switch Teams
                                            </div>
                                            {user?.all_teams?.map(team => (
                                                <form onSubmit={e => switchToTeam(e, team)} key={team.id}>
                                                    <ResponsiveNavLink as="button">
                                                        <div className="flex items-center">
                                                            {team.id == user.current_team_id && (
                                                                <svg
                                                                    className="mr-2 h-5 w-5 text-green-400"
                                                                    fill="none"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                </svg>
                                                            )}
                                                            <div>{team.name}</div>
                                                        </div>
                                                    </ResponsiveNavLink>
                                                </form>
                                            ))}
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    }
                </nav>

                {/* <!-- Page Heading --> */}
                {renderHeader ? (
                    <header className="bg-white shadow">
                        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                            {renderHeader()}
                        </div>
                    </header>
                ) : null}

                {/* <!-- Page Content --> */}
                <main className="flex-1">{children({ modal, setModal, walletAddress, setWalletAddress, createTransactionModalOpen, setCreateTransactionModalOpen, user, window })}</main>
            </div>

            <footer className="p-4 bg-white rounded-lg shadow md:px-6 md:py-8 dark:bg-gray-900">
                <span className="block text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2022 <a href="https://p2p.oneziko.com/" className="hover:underline">e-Mpiya P2P MoMo Crypto eXchange</a>. All Rights Reserved.
                </span>
            </footer>

            <GenericModal dialogOpen={dialogOpen} setDialogOpen={setDialogOpen} dialogTitle={dialogTitle} dialogMessage={dialogMessage} />
            <CreateTransactionModal modalOpen={createTransactionModalOpen} setModalOpen={setCreateTransactionModalOpen} />
        </div>
    );
}
