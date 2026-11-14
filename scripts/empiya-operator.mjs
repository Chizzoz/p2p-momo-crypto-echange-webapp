#!/usr/bin/env node
/**
 * Server-side Empiya operator helper (ethers v5).
 * Invoked by PHP: node scripts/empiya-operator.mjs <action> <json-payload>
 *
 * Env: EMPIYA_RPC_URL, EMPIYA_OPERATOR_PRIVATE_KEY, EMPIYA_P2P_ADDRESS, EMPIYA_PAYMENTS_ADDRESS
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ethers = require('ethers');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadAbi(name) {
  return JSON.parse(
    readFileSync(join(root, 'resources/js/abis', name), 'utf8'),
  );
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

function getWallet() {
  const rpc = requireEnv('EMPIYA_RPC_URL');
  const key = requireEnv('EMPIYA_OPERATOR_PRIVATE_KEY');
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  return new ethers.Wallet(key, provider);
}

function getP2P(wallet) {
  return new ethers.Contract(
    requireEnv('EMPIYA_P2P_ADDRESS'),
    loadAbi('EmpiyaP2P-abi.json'),
    wallet,
  );
}

function getPayments(wallet) {
  return new ethers.Contract(
    requireEnv('EMPIYA_PAYMENTS_ADDRESS'),
    loadAbi('EmpiyaPayments-abi.json'),
    wallet,
  );
}

async function releaseToBuyer(payload) {
  const wallet = getWallet();
  const p2p = getP2P(wallet);
  const tx = await p2p.releaseToBuyer(
    payload.depositor,
    payload.transactionKey,
    payload.transactionNumber,
    payload.buyer,
    payload.reservationId,
  );
  const receipt = await tx.wait();
  return { hash: receipt.transactionHash, status: receipt.status };
}

async function refundSeller(payload) {
  const wallet = getWallet();
  const p2p = getP2P(wallet);
  const tx = await p2p.refundSeller(
    payload.depositor,
    payload.transactionKey,
    payload.transactionNumber,
    payload.reservationId,
  );
  const receipt = await tx.wait();
  return { hash: receipt.transactionHash, status: receipt.status };
}

async function settlePayment(payload) {
  const wallet = getWallet();
  const payments = getPayments(wallet);
  const tx = await payments.settle(payload.paymentId);
  const receipt = await tx.wait();
  return { hash: receipt.transactionHash, status: receipt.status };
}

async function refundPayment(payload) {
  const wallet = getWallet();
  const payments = getPayments(wallet);
  const tx = await payments.refund(payload.paymentId);
  const receipt = await tx.wait();
  return { hash: receipt.transactionHash, status: receipt.status };
}

const actions = {
  releaseToBuyer,
  refundSeller,
  settlePayment,
  refundPayment,
};

async function main() {
  const [action, raw] = process.argv.slice(2);
  if (!action || !actions[action]) {
    throw new Error(
      `Usage: empiya-operator.mjs <${Object.keys(actions).join('|')}> <json>`,
    );
  }
  const payload = JSON.parse(raw || '{}');
  const result = await actions[action](payload);
  process.stdout.write(JSON.stringify({ ok: true, result }));
}

main().catch(error => {
  process.stdout.write(
    JSON.stringify({
      ok: false,
      error: error?.message || String(error),
    }),
  );
  process.exit(1);
});
