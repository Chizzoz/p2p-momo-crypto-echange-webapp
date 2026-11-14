#!/usr/bin/env node
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ethers = require('ethers');
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const abi = JSON.parse(
  readFileSync(join(root, 'resources/js/abis/EmpiyaP2P-abi.json'), 'utf8'),
);

const rpc = process.env.EMPIYA_RPC_URL;
const p2pAddr = process.env.EMPIYA_P2P_ADDRESS || process.env.VITE_EMPIYA_P2P_ADDRESS;
const depositor = process.argv[2];
const key = process.argv[3] ?? '0';

if (!rpc || !p2pAddr || !depositor) {
  console.error('Usage: EMPIYA_RPC_URL=... EMPIYA_P2P_ADDRESS=... node read-onchain-listing.mjs <depositor> [key]');
  process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(rpc);
const p2p = new ethers.Contract(p2pAddr, abi, provider);
const timeout = await p2p.RESERVATION_TIMEOUT();
const tx = await p2p.getUserTransactionByUser(depositor, key);
const now = Math.floor(Date.now() / 1000);
const reservedAt = Number(tx.reservedAt);
const expiresAt = reservedAt ? reservedAt + Number(timeout) : 0;

console.log(
  JSON.stringify(
    {
      p2p: p2pAddr,
      depositor,
      key,
      transactionNumber: tx.transactionNumber,
      amount: tx.amount?.toString?.(),
      status: Number(tx.status),
      recipient: tx.recipient,
      reservedAt,
      reservationId: tx.reservationId?.toString?.(),
      reservationTimeoutSec: Number(timeout),
      now,
      expired: reservedAt ? now >= expiresAt : null,
      secondsLeft: reservedAt ? expiresAt - now : null,
    },
    null,
    2,
  ),
);

// Also dump page of deposits for this user
const page = await p2p.getTransactionsByUser(depositor);
console.log('all deposits count hint:', Array.isArray(page) ? page.length : typeof page);
if (Array.isArray(page)) {
  page.forEach((row, i) => {
    console.log(
      i,
      'status=',
      Number(row.status),
      'amount=',
      row.amount?.toString?.(),
      'tn=',
      row.transactionNumber,
      'recipient=',
      row.recipient,
      'resId=',
      row.reservationId?.toString?.(),
    );
  });
}
