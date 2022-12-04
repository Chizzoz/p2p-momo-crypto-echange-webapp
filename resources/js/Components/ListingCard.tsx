import React, { Fragment, useRef, useState } from 'react'
import { toSvg } from "jdenticon";
import { TransactionProp } from '@/Layouts/AppLayout';

export default function ListingCard(transaction: any) {
    console.log('transaction', transaction.transaction[1]);
    let transactionObj = transaction.transaction[1];
    const svgString = toSvg(transactionObj.eth_address || 'e-Mpiya P2P', 64);

    return (
        <div className="max-w-sm rounded overflow-hidden shadow-lg">
            <div className="px-6 py-4">
                <div>
                <img src={`data:image/svg+xml;utf8, ${encodeURIComponent(svgString)}`} />
                </div>
                <div className="text-sm">
                    <p className="text-gray-900 leading-none">{transactionObj.name}</p>
                    <p className="text-gray-600 truncate">{transactionObj.eth_address}</p>
                </div>
            </div>
            <div className="px-6">
                <div className="font-bold text-xl mb-2">{transactionObj.symbol} {transactionObj.amount}</div>
                <p className="text-gray-700 text-base">
                    Price: ZMW {transactionObj.price} per unit
                </p>
                <p className="text-gray-700 text-base">
                    Total: ZMW {transactionObj.price * transactionObj.amount}
                </p>
            </div>
            <div className="px-6 pt-4 grid grid-cols-3">
                <span className="bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-red-200 dark:text-red-900">Airtel Money</span>
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-yellow-200 dark:text-yellow-900">MTN Money</span>
                <span className="bg-green-100 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded dark:bg-green-200 dark:text-green-900">ZamKwacha</span>
            </div>
            <div className="px-6 pt-4 pb-2 flex justify-between items-center">
                <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">{transactionObj.token} {transactionObj.symbol}</span>
                {
                    transactionObj.status == 3 &&
                        <button type="button" className=" inline-block px-6 py-2.5 bg-gray-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-gray-700 hover:shadow-lg focus:bg-gray-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-gray-800 active:shadow-lg transition duration-150 ease-in-out">Cancelled</button>
                }
                {
                    transactionObj.status == 2 &&
                        <button type="button" className=" inline-block px-6 py-2.5 bg-gray-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-gray-700 hover:shadow-lg focus:bg-gray-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-gray-800 active:shadow-lg transition duration-150 ease-in-out">Sold</button>
                }
                {
                    transactionObj.status == 0 &&
                        <button type="button" className=" inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out">Buy</button>
                }
            </div>
        </div>
    )
}
