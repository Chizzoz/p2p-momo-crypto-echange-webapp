# e-Mpiya P2P MoMo Crypto eXchange (Web App)

Laravel + Inertia/React frontend for the e-Mpiya P2P mobile-money crypto exchange.

**Hackathon judges:** see [HACKATHON_DISCLOSURE.md](./HACKATHON_DISCLOSURE.md) for pre-existing vs new work.

1. Frontend repository: https://github.com/Chizzoz/p2p-momo-crypto-echange-webapp  
   Demo DApp: https://p2p.oneziko.com/
2. Smart contracts (Hardhat): https://github.com/Chizzoz/p2p-momo-crypto-exchange

## Stack

| Piece | Choice |
| --- | --- |
| App | Laravel 13, Jetstream 5, Inertia 2, React (TypeScript), Tailwind, MySQL |
| Chain | ethers.js v5, MetaMask, Alchemy Sepolia RPC |
| Fiat | Bundled [laravel-pawapay](https://github.com/Chizzoz/laravel-pawapay) (`packages/laravel-pawapay`) |
| Operator | Server-only `EMPIYA_OPERATOR_PRIVATE_KEY` via `scripts/empiya-operator.mjs` |
| Deploy | Dokploy + FrankenPHP PHP 8.3 (`Dockerfile`) |

## Current network (Sepolia)

Chain ID `11155111`. Addresses must match the contracts repo deploy:

| Role | Env (browser build) | Env (server) | Current address |
| --- | --- | --- | --- |
| EmpiyaP2P | `VITE_EMPIYA_P2P_ADDRESS` | `EMPIYA_P2P_ADDRESS` | `0x76E69285D4dED0E5959F219014D4a64fc612d9Be` |
| EmpiyaPayments | `VITE_EMPIYA_PAYMENTS_ADDRESS` | `EMPIYA_PAYMENTS_ADDRESS` | `0x10C38D531d6C93E16ABc2f34b091a8E07B77C0de` |
| Mock USDT (6 dp) | `VITE_USDT_ADDRESS` | `EMPIYA_USDT_ADDRESS` | `0x2A51b5d05bbbDAB5A5746ed35C1A7708f7ADe6eD` |

**Important:** `VITE_*` values are baked in at **image/Vite build time**. Setting them only as runtime env in Dokploy will leave the browser bundle empty and surface `Set VITE_EMPIYA_P2P_ADDRESS…`. See [DOKPLOY.md](./DOKPLOY.md).

Never put operator or PawaPay private keys in `VITE_*`.

ABIs: `resources/js/abis/`. Helpers: `resources/js/lib/chain.ts`, `contracts.ts`, `units.ts`.

## Product surfaces

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing + markets + listing preview |
| `/listings` | Full open USDT marketplace |
| `/dashboard` | Wallet USDT balance, my listings, purchase history (auth) |
| `/pay` | Pay USDT & redeem MoMo |

### Flows

1. **List USDT** — MetaMask on Sepolia → approve USDT (reset-to-zero if needed) → EmpiyaP2P `deposit` → Laravel listing row.
2. **Buy / request USDT** — Buyer requests buy → seller on-chain `reserve(buyer)` → PawaPay MoMo deposit → operator `releaseToBuyer` → seller MoMo payout.
3. **Pay & redeem** — Client `EmpiyaPayments.pay` → PawaPay payout to recipient MoMo → operator `settle`.

Webhooks: `POST /webhooks/pawapay/deposits` and `/webhooks/pawapay/payouts` (plus scheduled status poller).

## Local setup (DDEV)

**Laravel 13 / PHP 8.3.** DDEV: PHP 8.3, nginx, MySQL 8.

Requirements: [Docker Desktop](https://www.docker.com/products/docker-desktop/), [DDEV](https://ddev.readthedocs.io/).

```bash
cd p2p-momo-crypto-echange-webapp
cp .env.example .env   # set VITE_* and PAWAPAY_* / EMPIYA_* as needed
ddev start
ddev composer install
ddev exec php artisan key:generate
ddev exec php artisan migrate
ddev npm install
ddev npm run build    # or: ddev npm run dev
ddev launch
```

Site: `http://empiya-p2p-webapp.ddev.site`  
DB (in container): host `db`, user/password/database `db`.

PHP **gmp** is enabled for MetaMask SIWE (`simplito/elliptic-php`).

**Always use `ddev npm …`** for installs/builds. Container `node_modules` is a Linux Docker volume; a Mac host `npm install` can break esbuild for DDEV. After clone: `ddev npm ci && ddev npm run build`.

Sellers need Sepolia ETH for gas and Mock USDT for deposits (mint from the contracts repo).

### Useful env (local)

```env
VITE_CHAIN_ID=11155111
VITE_ALCHEMY_API_KEY=
VITE_EMPIYA_P2P_ADDRESS=0x76E69285D4dED0E5959F219014D4a64fc612d9Be
VITE_EMPIYA_PAYMENTS_ADDRESS=0x10C38D531d6C93E16ABc2f34b091a8E07B77C0de
VITE_USDT_ADDRESS=0x2A51b5d05bbbDAB5A5746ed35C1A7708f7ADe6eD
VITE_USDT_DECIMALS=6

PAWAPAY_API_KEY=
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io/v2
PAWAPAY_MODE=sandbox

EMPIYA_RPC_URL=
EMPIYA_CHAIN_ID=11155111
EMPIYA_OPERATOR_PRIVATE_KEY=
EMPIYA_P2P_ADDRESS=0x76E69285D4dED0E5959F219014D4a64fc612d9Be
EMPIYA_PAYMENTS_ADDRESS=0x10C38D531d6C93E16ABc2f34b091a8E07B77C0de
```

## Production (Dokploy)

Deploys to **https://p2p.oneziko.com** via FrankenPHP. Full steps, build-args, and runtime env: **[DOKPLOY.md](./DOKPLOY.md)**.

After changing contract addresses: update Dokploy **Build args** for all `VITE_*`, then **rebuild** the image.

## PawaPay sandbox

Set `PAWAPAY_API_KEY` before live MoMo tests. Test MSISDNs: [PawaPay test numbers](https://docs.pawapay.io/v2/docs/test_numbers).

Zambia **COMPLETED** examples:

| Provider | Code | MSISDN |
| --- | --- | --- |
| MTN | `MTN_MOMO_ZMB` | `260763456789` |
| Airtel | `AIRTEL_OAPI_ZMB` | `260973456789` |
| Zamtel | `ZAMTEL_ZMB` | `260953456700` |

Smoke checks:

```bash
ddev exec php scripts/smoke-integration.php      # config + RPC + PawaPay auth
ddev exec php scripts/smoke-pawapay-sandbox.php  # deposit + payout COMPLETED numbers
```

## Playwright walkthroughs

```bash
ddev exec php scripts/setup-walkthrough-users.php
npm run e2e:walkthrough   # records videos + combines chapters
```

See [e2e/README.md](./e2e/README.md). Combined video: `e2e-videos/empiya-walkthrough.mp4`.

## Related contracts docs

See the Hardhat repo README for EmpiyaP2P / EmpiyaPayments roles, caps, and backend settlement rules.
