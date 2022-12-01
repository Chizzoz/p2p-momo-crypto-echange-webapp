import { InertiaLink } from '@inertiajs/inertia-react';
import React, { useState } from 'react';
import useRoute from '@/Hooks/useRoute';
import useTypedPage from '@/Hooks/useTypedPage';
import { Head } from '@inertiajs/inertia-react';
import { ethers } from 'ethers';
import axios from 'axios';
import { Alchemy, Network } from 'alchemy-sdk';
import contractABI from '../EmpiyaP2P-abi.json';
import DownloadMetamaskModal from '@/Components/DownloadMetamaskModal';
import 'react-simple-tailwind-table/build/style.css';
import { useTableConfiguration, TailwindTable } from 'react-simple-tailwind-table';

const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY;
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const privateKey = import.meta.env.VITE_PRIVATE_KEY;

declare let window: any;

interface Props {
  canLogin: boolean;
  canRegister: boolean;
  laravelVersion: string;
  phpVersion: string;
}

export default function Welcome({
  canLogin,
  canRegister,
}: Props) {
    const [modal, setModal] = useState(false);
    const loginWithMetamask =async () => {
        if (typeof window.ethereum !== 'undefined') {
            // Provider
            let provider: ethers.providers.Web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            // Signer
            const signer = new ethers.Wallet(privateKey, provider);
            // Contract
            const empiyaP2PContract = new ethers.Contract(
              contractAddress,
              contractABI,
              signer,
            );

            const settings = {
                apiKey: alchemyKey,
                network: Network.MATIC_MUMBAI,
            };
            const alchemy = new Alchemy(settings);

            const message = (await axios.get(route('metamask.signature'))).data;
            console.log(message);

            const [ address ] = await provider.send("eth_requestAccounts", []);
            console.log(address);

            const signature = await provider.getSigner().signMessage(message);
            console.log(signature);

            try {
                const { status } = await axios.post(route('metamask.authenticate'), {
                    'address': address,
                    'signature': signature,
                });
                if (status == 200) {
                    window.location = route('dashboard');
                }
            } catch (e) {
                console.error(e);
            }

        } else {
            setModal(true);
        }
        // Table
        const temp = [
            { name: 'CRIS', status: 'DONE', score: 1000 },
            { name: 'NIDA', status: 'DONE', score: 200 },
            { name: 'TEEL', status: 'DOING', score: 450 },
            { name: 'LOUS', status: 'DOING', score: 800 },
            { name: 'JAN', status: 'PENDING', score: 0 },
          ];

          const { tableData, tableColumns } = useTableConfiguration(temp, [
            {
              label: 'Username',
              accessor: 'name',
              body: { className: 'font-bold text-gray-600' },
              header: { background: '#345543', className: 'text-white' },
              align: 'left',
            },
            {
              label: 'Status',
              accessor: 'status',
              body: { className: 'px-2' },
              renderData: (data) => {
                const color = {
                  DONE: 'text-green-500',
                  DOING: 'text-orange-600',
                  PENDING: 'text-gray-500',
                };
                return <span className={color[data.status]}>{data.status}</span>;
              },
            },
            { label: 'Score', accessor: 'score', sort: (a, b) => a.score - b.score },
        ]);
    }

  const route = useRoute();
  const page = useTypedPage();

  return (
    <div className="relative flex items-top justify-center min-h-screen bg-gray-100 dark:bg-gray-900 sm:items-center sm:pt-0">
      <Head title="Welcome" />

      {canLogin ? (
        <div className="hidden fixed top-0 right-0 px-6 py-4 sm:block">
          {page.props.user ? (
            <InertiaLink
              href={route('dashboard')}
              className="text-sm text-gray-700 dark:text-gray-500 underline"
            >
              Dashboard
            </InertiaLink>
          ) : (
            <>
              <button
                type="button"
                className="text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                onClick={ () => loginWithMetamask() }
              >
                <svg
                  aria-hidden="true"
                  className="mr-2 -ml-1 w-6 h-5"
                  viewBox="0 0 2405 2501"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {' '}
                  <g clipPath="url(#clip0_1512_1323)">
                    {' '}
                    <path
                      d="M2278.79 1730.86L2133.62 2221.69L1848.64 2143.76L2278.79 1730.86Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1848.64 2143.76L2123.51 1767.15L2278.79 1730.86L1848.64 2143.76Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2065.2 1360.79L2278.79 1730.86L2123.51 1767.15L2065.2 1360.79ZM2065.2 1360.79L2202.64 1265.6L2278.79 1730.86L2065.2 1360.79Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1890.29 1081.17L2285.34 919.338L2265.7 1007.99L1890.29 1081.17ZM2253.21 1114.48L1890.29 1081.17L2265.7 1007.99L2253.21 1114.48Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2253.21 1114.48L2202.64 1265.6L1890.29 1081.17L2253.21 1114.48ZM2332.34 956.82L2265.7 1007.99L2285.34 919.338L2332.34 956.82ZM2253.21 1114.48L2265.7 1007.99L2318.65 1052.01L2253.21 1114.48Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1542.24 2024.17L1641 2055.7L1848.64 2143.75L1542.24 2024.17Z"
                      fill="#E2761B"
                      stroke="#E2761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2202.64 1265.6L2253.21 1114.48L2296.64 1147.8L2202.64 1265.6ZM2202.64 1265.6L1792.71 1130.55L1890.29 1081.17L2202.64 1265.6Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1987.86 617.696L1890.29 1081.17L1792.71 1130.55L1987.86 617.696Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2285.34 919.338L1890.29 1081.17L1987.86 617.696L2285.34 919.338Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1987.86 617.696L2400.16 570.1L2285.34 919.338L1987.86 617.696Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2202.64 1265.6L2065.2 1360.79L1792.71 1130.55L2202.64 1265.6Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2382.31 236.33L2400.16 570.1L1987.86 617.696L2382.31 236.33Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2382.31 236.33L1558.3 835.45L1547.59 429.095L2382.31 236.33Z"
                      fill="#E2761B"
                      stroke="#E2761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M934.789 380.309L1547.59 429.095L1558.3 835.449L934.789 380.309Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1792.71 1130.55L1558.3 835.449L1987.86 617.696L1792.71 1130.55Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1792.71 1130.55L2065.2 1360.79L1682.65 1403.04L1792.71 1130.55Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1682.65 1403.04L1558.3 835.449L1792.71 1130.55L1682.65 1403.04Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1987.86 617.696L1558.3 835.45L2382.31 236.33L1987.86 617.696Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M940.144 2134.24L1134.69 2337.11L869.939 2096.16L940.144 2134.24Z"
                      fill="#C0AD9E"
                      stroke="#C0AD9E"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1848.64 2143.75L1940.86 1793.33L2123.51 1767.15L1848.64 2143.75Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M151.234 1157.92L487.978 803.917L194.666 1115.67L151.234 1157.92Z"
                      fill="#E2761B"
                      stroke="#E2761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2123.51 1767.15L1940.86 1793.33L2065.2 1360.79L2123.51 1767.15ZM1558.3 835.449L1230.48 824.74L934.789 380.309L1558.3 835.449Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2065.2 1360.79L1940.86 1793.33L1930.74 1582.12L2065.2 1360.79Z"
                      fill="#E4751F"
                      stroke="#E4751F"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1682.65 1403.04L2065.2 1360.79L1930.74 1582.12L1682.65 1403.04Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1230.48 824.74L1558.3 835.449L1682.65 1403.04L1230.48 824.74Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1230.48 824.74L345.784 6.08252L934.79 380.309L1230.48 824.74ZM934.195 2258.58L165.513 2496.56L12.0146 1910.53L934.195 2258.58Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M265.465 1304.27L555.803 1076.41L799.14 1132.93L265.465 1304.27Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M799.139 1132.93L555.803 1076.41L686.098 538.567L799.139 1132.93Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M194.666 1115.67L555.803 1076.41L265.465 1304.27L194.666 1115.67Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1930.74 1582.12L1780.81 1506.56L1682.65 1403.04L1930.74 1582.12Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M194.666 1115.67L169.083 980.618L555.803 1076.41L194.666 1115.67Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1749.88 1676.72L1780.81 1506.56L1930.74 1582.12L1749.88 1676.72Z"
                      fill="#233447"
                      stroke="#233447"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1940.86 1793.33L1749.88 1676.72L1930.74 1582.12L1940.86 1793.33Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M555.803 1076.41L169.082 980.618L137.55 866.982L555.803 1076.41ZM686.098 538.567L555.803 1076.41L137.55 866.982L686.098 538.567ZM686.098 538.567L1230.48 824.74L799.139 1132.93L686.098 538.567Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M799.14 1132.93L1230.48 824.74L1422.65 1411.96L799.14 1132.93ZM1422.65 1411.96L826.508 1399.47L799.14 1132.93L1422.65 1411.96Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M265.465 1304.27L799.14 1132.93L826.508 1399.47L265.465 1304.27ZM1682.65 1403.04L1422.65 1411.96L1230.48 824.74L1682.65 1403.04Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1780.81 1506.56L1749.88 1676.72L1682.65 1403.04L1780.81 1506.56Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M345.784 6.08252L1230.48 824.74L686.098 538.567L345.784 6.08252Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M12.0146 1910.53L758.088 1879.59L934.195 2258.58L12.0146 1910.53Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M934.194 2258.58L758.088 1879.59L1124.58 1861.75L934.194 2258.58Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1749.88 1676.72L1940.86 1793.33L2046.16 2041.42L1749.88 1676.72ZM826.508 1399.47L12.0146 1910.53L265.465 1304.27L826.508 1399.47ZM758.088 1879.59L12.0146 1910.53L826.508 1399.47L758.088 1879.59ZM1682.65 1403.04L1731.43 1580.33L1495.83 1594.02L1682.65 1403.04ZM1495.83 1594.02L1422.65 1411.96L1682.65 1403.04L1495.83 1594.02Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1134.69 2337.11L934.194 2258.58L1631.48 2375.79L1134.69 2337.11Z"
                      fill="#C0AD9E"
                      stroke="#C0AD9E"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M265.465 1304.27L151.234 1157.91L194.666 1115.67L265.465 1304.27Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1710.61 2288.92L1631.48 2375.79L934.194 2258.58L1710.61 2288.92Z"
                      fill="#D7C1B3"
                      stroke="#D7C1B3"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1748.09 2075.93L934.194 2258.58L1124.58 1861.75L1748.09 2075.93Z"
                      fill="#E4761B"
                      stroke="#E4761B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M934.194 2258.58L1748.09 2075.93L1710.61 2288.92L934.194 2258.58Z"
                      fill="#D7C1B3"
                      stroke="#D7C1B3"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M137.55 866.982L110.777 409.462L686.098 538.567L137.55 866.982ZM194.665 1115.67L115.536 1035.35L169.082 980.618L194.665 1115.67Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1289.38 1529.76L1422.65 1411.96L1403.61 1699.92L1289.38 1529.76Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1422.65 1411.96L1289.38 1529.76L1095.43 1630.31L1422.65 1411.96Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2046.16 2041.42L2009.87 2014.65L1749.88 1676.72L2046.16 2041.42Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1095.43 1630.31L826.508 1399.47L1422.65 1411.96L1095.43 1630.31Z"
                      fill="#CD6116"
                      stroke="#CD6116"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1403.61 1699.92L1422.65 1411.96L1495.83 1594.02L1403.61 1699.92Z"
                      fill="#E4751F"
                      stroke="#E4751F"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M89.3589 912.199L137.55 866.982L169.083 980.618L89.3589 912.199Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1403.61 1699.92L1095.43 1630.31L1289.38 1529.76L1403.61 1699.92Z"
                      fill="#233447"
                      stroke="#233447"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M686.098 538.567L110.777 409.462L345.784 6.08252L686.098 538.567Z"
                      fill="#763D16"
                      stroke="#763D16"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1631.48 2375.79L1664.2 2465.03L1134.69 2337.12L1631.48 2375.79Z"
                      fill="#C0AD9E"
                      stroke="#C0AD9E"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1124.58 1861.75L1095.43 1630.31L1403.61 1699.92L1124.58 1861.75Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M826.508 1399.47L1095.43 1630.31L1124.58 1861.75L826.508 1399.47Z"
                      fill="#E4751F"
                      stroke="#E4751F"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1495.83 1594.02L1731.43 1580.33L2009.87 2014.65L1495.83 1594.02ZM826.508 1399.47L1124.58 1861.75L758.088 1879.59L826.508 1399.47Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1495.83 1594.02L1788.55 2039.64L1403.61 1699.92L1495.83 1594.02Z"
                      fill="#E4751F"
                      stroke="#E4751F"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1403.61 1699.92L1788.55 2039.64L1748.09 2075.93L1403.61 1699.92Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1748.09 2075.93L1124.58 1861.75L1403.61 1699.92L1748.09 2075.93ZM2009.87 2014.65L1788.55 2039.64L1495.83 1594.02L2009.87 2014.65Z"
                      fill="#F6851B"
                      stroke="#F6851B"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2068.18 2224.07L1972.99 2415.05L1664.2 2465.03L2068.18 2224.07ZM1664.2 2465.03L1631.48 2375.79L1710.61 2288.92L1664.2 2465.03Z"
                      fill="#C0AD9E"
                      stroke="#C0AD9E"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1710.61 2288.92L1768.92 2265.72L1664.2 2465.03L1710.61 2288.92ZM1664.2 2465.03L1768.92 2265.72L2068.18 2224.07L1664.2 2465.03Z"
                      fill="#C0AD9E"
                      stroke="#C0AD9E"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2009.87 2014.65L2083.05 2059.27L1860.54 2086.04L2009.87 2014.65Z"
                      fill="#161616"
                      stroke="#161616"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1860.54 2086.04L1788.55 2039.64L2009.87 2014.65L1860.54 2086.04ZM1834.96 2121.15L2105.66 2088.42L2068.18 2224.07L1834.96 2121.15Z"
                      fill="#161616"
                      stroke="#161616"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M2068.18 2224.07L1768.92 2265.72L1834.96 2121.15L2068.18 2224.07ZM1768.92 2265.72L1710.61 2288.92L1748.09 2075.93L1768.92 2265.72ZM1748.09 2075.93L1788.55 2039.64L1860.54 2086.04L1748.09 2075.93ZM2083.05 2059.27L2105.66 2088.42L1834.96 2121.15L2083.05 2059.27Z"
                      fill="#161616"
                      stroke="#161616"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1834.96 2121.15L1860.54 2086.04L2083.05 2059.27L1834.96 2121.15ZM1748.09 2075.93L1834.96 2121.15L1768.92 2265.72L1748.09 2075.93Z"
                      fill="#161616"
                      stroke="#161616"
                      strokeWidth="5.94955"
                    />{' '}
                    <path
                      d="M1860.54 2086.04L1834.96 2121.15L1748.09 2075.93L1860.54 2086.04Z"
                      fill="#161616"
                      stroke="#161616"
                      strokeWidth="5.94955"
                    />{' '}
                  </g>{' '}
                  <defs>
                    {' '}
                    <clipPath id="clip0_1512_1323">
                      {' '}
                      <rect
                        width="2404"
                        height="2500"
                        fill="white"
                        transform="translate(0.519043 0.132812)"
                      />{' '}
                    </clipPath>{' '}
                  </defs>{' '}
                </svg>
                Connect with MetaMask
              </button>

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

              {canRegister ? (
                <InertiaLink href={route('register')} className="ml-4">
                  <button
                    type="button"
                    className="text-white bg-green-500 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                  >
                    Register
                  </button>
                </InertiaLink>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
        <div className="mt-8 bg-white dark:bg-gray-800 overflow-hidden shadow sm:rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <TailwindTable data={tableData} columns={tableColumns} />
          </div>
        </div>
      </div>
      <DownloadMetamaskModal modalOpen={modal} setModalOpen={setModal} />
    </div>
  );
}
