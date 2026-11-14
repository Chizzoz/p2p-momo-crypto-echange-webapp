<?php

return [
    'rpc_url' => env('EMPIYA_RPC_URL', env('VITE_ALCHEMY_API_KEY')
        ? 'https://eth-sepolia.g.alchemy.com/v2/'.env('VITE_ALCHEMY_API_KEY')
        : 'https://ethereum-sepolia-rpc.publicnode.com'),

    'chain_id' => (int) env('EMPIYA_CHAIN_ID', env('VITE_CHAIN_ID', 11155111)),

    'operator_private_key' => env('EMPIYA_OPERATOR_PRIVATE_KEY'),

    'p2p_address' => env('EMPIYA_P2P_ADDRESS', env('VITE_EMPIYA_P2P_ADDRESS')),

    'payments_address' => env('EMPIYA_PAYMENTS_ADDRESS', env('VITE_EMPIYA_PAYMENTS_ADDRESS')),

    'usdt_address' => env('EMPIYA_USDT_ADDRESS', env('VITE_USDT_ADDRESS', '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06')),

    'usdt_decimals' => (int) env('EMPIYA_USDT_DECIMALS', env('VITE_USDT_DECIMALS', 6)),
];
