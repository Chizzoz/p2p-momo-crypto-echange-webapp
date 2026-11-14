# e-Mpiya P2P MoMo Crypto eXchange (Web App)

Laravel + Inertia/React frontend for the e-Mpiya P2P mobile-money crypto exchange.

1. Frontend repository: https://github.com/Chizzoz/p2p-momo-crypto-echange-webapp  
   Demo DApp: https://p2p.oneziko.com/
2. Smart contracts (Hardhat): https://github.com/Chizzoz/p2p-momo-crypto-exchange

## Stack

Hardhat contracts, ethers.js v5, MetaMask, Alchemy (Sepolia RPC), Laravel 13, Jetstream 5, Inertia 2, React (TypeScript), Tailwind, MySQL. Fiat rails use bundled [laravel-pawapay](https://github.com/Chizzoz/laravel-pawapay) (`packages/laravel-pawapay`) for deposits/payouts plus a server-side Empiya operator (`scripts/empiya-operator.mjs`).

## Current network (foundation)

**Ethereum Sepolia** (chain ID `11155111`) with:

| Role | Env var | Notes |
|------|---------|--------|
| EmpiyaP2P | `VITE_EMPIYA_P2P_ADDRESS` | Escrow entry point (services 1–2) |
| EmpiyaPayments | `VITE_EMPIYA_PAYMENTS_ADDRESS` | ABI present; UI not wired yet |
| Test USDT | `VITE_USDT_ADDRESS` | e.g. `0x7169D38820dfd117C3FA1f22a697dBA58d90BA06` (6 decimals) |

Copy addresses from the contracts repo `.env` after `pnpm deploy:sepolia` / `pnpm deploy-payments:sepolia`. Never put private keys in `VITE_*` variables.

ABIs live under `resources/js/abis/` (synced from Hardhat artifacts). Chain helpers: `resources/js/lib/chain.ts`, `contracts.ts`, `units.ts`.

## Local setup with DDEV (Laravel 9)

This app runs **Laravel 13** on PHP **8.3**. DDEV uses PHP 8.3, nginx, and MySQL 8. Production (Dokploy) uses FrankenPHP PHP 8.3.

Requirements: [Docker Desktop](https://www.docker.com/products/docker-desktop/) running, and [DDEV](https://ddev.readthedocs.io/).

```bash
cd p2p-momo-crypto-echange-webapp
cp .env.example .env   # if needed; keep VITE_* Sepolia values
ddev start
ddev composer install
ddev exec php artisan key:generate
ddev exec php artisan migrate
ddev npm install
ddev npm run build    # or: ddev npm run dev
ddev launch
```

Site URL: `http://empiya-p2p-webapp.ddev.site` (use HTTPS after `brew install mkcert nss && mkcert -install`).  
DB (from the web container): host `db`, database/user/password `db`.

PHP **gmp** is enabled via `webimage_extra_packages` (required by MetaMask SIWE / `simplito/elliptic-php`).

Frontend: Vite 3 + React. A real `npm run build` is required for the UI; without it Laravel looks for `public/build/manifest.json`. If `npm install` fails with TLS/`UNABLE_TO_VERIFY_LEAF_SIGNATURE` on your host, fix corporate CA / proxy settings, or run installs inside DDEV once registry access works.

**Always use `ddev npm …` for installs/builds inside the project.** Container `node_modules` is a Linux Docker volume (`.ddev/docker-compose.node_modules.yaml`), so a Mac host `npm install` no longer overwrites esbuild for DDEV. After cloning or wiping volumes: `ddev npm ci && ddev npm run build`.

Useful commands: `ddev ssh`, `ddev artisan …`, `ddev mysql`, `ddev stop`, `ddev launch`.

Connect MetaMask to Sepolia. Sellers need Sepolia ETH for gas and test USDT for deposits.

## Production (Dokploy)

`main` deploys to **https://p2p.oneziko.com** via FrankenPHP (`Dockerfile`). Full steps, env vars, and Vite build-args: see **[DOKPLOY.md](./DOKPLOY.md)**.

## Foundation flows (this pass)

1. MetaMask login (existing SIWE) switches / adds Sepolia.
2. Create listing: USDT `approve` (reset-to-zero if needed) then EmpiyaP2P `deposit(amount)` — **no** native ETH value.
3. Dashboard reads `getUserTransactions()` including `reservationId` / `reservedAt`, formats amounts with 6 decimals, and reconciles into Laravel.

## MoMo + settlement flows

1. **Buy USDT**: buyer requests buy → seller confirms with on-chain `reserve(buyer)` → buyer continues payment → PawaPay deposit → operator `releaseToBuyer` → seller MoMo payout.
2. **Pay & redeem**: client `EmpiyaPayments.pay` → PawaPay payout to recipient MoMo → operator `settle`.
3. Webhooks: `/webhooks/pawapay/deposits` and `/webhooks/pawapay/payouts` (plus minute poller fallback).

Set `PAWAPAY_API_KEY` (sandbox) and `EMPIYA_OPERATOR_PRIVATE_KEY` before end-to-end MoMo tests. Never put operator keys in `VITE_*`.

Sandbox MSISDNs (no real PIN): [PawaPay test numbers](https://docs.pawapay.io/v2/docs/test_numbers). Zambia **COMPLETED** examples:

| Provider | Code | Deposit / Payout MSISDN |
| --- | --- | --- |
| MTN | `MTN_MOMO_ZMB` | `260763456789` |
| Airtel | `AIRTEL_OAPI_ZMB` | `260973456789` |
| Zamtel | `ZAMTEL_ZMB` | `260953456700` |

API-only smoke (no chain): `ddev exec php scripts/smoke-pawapay-sandbox.php`

## Related contracts docs

See the Hardhat repo README for EmpiyaP2P / EmpiyaPayments roles, caps, and backend settlement rules.
