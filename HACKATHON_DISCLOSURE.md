# Hackathon disclosure — webapp

**Repository:** [Chizzoz/p2p-momo-crypto-echange-webapp](https://github.com/Chizzoz/p2p-momo-crypto-echange-webapp)  
**Companion contracts:** [Chizzoz/p2p-momo-crypto-exchange](https://github.com/Chizzoz/p2p-momo-crypto-exchange)  
**Demo:** https://p2p.oneziko.com/  
**Product:** e-Mpiya — P2P USDT ↔ mobile money (MoMo) exchange

This document discloses **pre-existing work**, what we **built on**, what **changed**, and what is **new**, plus how functional the webapp was **before vs now**.

---

## 1. What was existing (before this build period)

The webapp was an **existing Laravel + Jetstream + Inertia/React** project, separated earlier from the contracts monorepo. Prior work already included:

| Area | What already existed |
| --- | --- |
| App shell | Laravel Jetstream, Inertia, React (TypeScript), Tailwind, MySQL |
| Auth | MetaMask SIWE-style login (`Web3AuthController`), session/user model with `eth_address` |
| Listings (early) | Create/deposit-oriented UI toward EmpiyaP2P; dashboard reading on-chain txs and reconciling into Laravel |
| Data model | `transactions`, tokens pivot, users, countries / payment methods foundations |
| Ops beginnings | Moves toward Sepolia, MoMo profile fields, Dokploy/FrankenPHP deploy path |

**What was not finished previously:** a polished public marketplace, full **Buy with MoMo** loop (PawaPay deposit → operator release → seller payout), **Pay & redeem** product UI + settle, or a dedicated listings/dashboard experience with purchase history.

---

## 2. What we are building on

We extend the existing stack rather than replacing it:

1. **Laravel / Jetstream / Inertia / React** — same application identity and auth.
2. **EmpiyaP2P + EmpiyaPayments ABIs** — synced from the Hardhat repo; MetaMask + ethers v5 for user txs.
3. **Sepolia** as the demo chain; public addresses via `VITE_*` (build-time).
4. **PawaPay** as the MoMo rail — via bundled [`laravel-pawapay`](https://github.com/Chizzoz/laravel-pawapay) (Illuminate support extended for Laravel 13).
5. **Operator key server-side only** — never in `VITE_*`; Node sidecar signs `releaseToBuyer` / `settle` / refunds.

Third-party building blocks: Laravel ecosystem, Vite, Tailwind, ethers.js, Alchemy/public RPC, PawaPay Merchant API, Dokploy/FrankenPHP, Playwright (walkthrough videos).

---

## 3. What changed (refactor of existing)

Substantial refactor of the pre-existing app:

| Change | Why |
| --- | --- |
| **Laravel 9 → Laravel 13 / PHP 8.3** | Modern runtime; FrankenPHP production image |
| **Sepolia-first listing foundation** | Real USDT `approve` + `deposit` (reset-to-zero allowance), chain helpers, amount formatting |
| **MoMo profile binding** | Country + MNO + MSISDN on user profile before buy/pay |
| **Marketing / landing redesign** | Brand-forward shell: three pillars (list, request/buy, pay & redeem), markets directory with flags/MNO logos |
| **Dokploy Dockerfile** | Multi-stage Vite build-args for `VITE_*`; runtime env for DB/PawaPay/operator |
| **USDT display** | Human amounts rounded to reasonable decimals (avoid 18-place DB noise) |

---

## 4. What is new

### Product surfaces

| New | Description |
| --- | --- |
| **`/listings`** | Dedicated USDT marketplace (open offers) |
| **Dashboard v2** | Wallet USDT balance, open listed USDT, my listings, purchase history |
| **Pay & redeem (`/pay`)** | EmpiyaPayments.pay → PawaPay payout → operator settle |
| **Buy flow on listing cards** | Request buy → seller on-chain `reserve` → MoMo deposit → release → seller payout |

### Backend / MoMo / settlement

| New | Description |
| --- | --- |
| Bundled **laravel-pawapay** | Deposits, payouts, status checks on Laravel 13 |
| **`momo_transfers`** + settlement fields on transactions | Persistence for PawaPay ids and links |
| **Webhooks** | `POST /webhooks/pawapay/deposits` & `/payouts` (+ poll job fallback) |
| **`MomoSettlementService`** | Status envelope handling (`FOUND` → `data.status`), release/payout/settle orchestration |
| **`EmpiyaOperatorService` + `scripts/empiya-operator.mjs`** | Server-side signed operator txs |
| **Smoke scripts** | Config/RPC/PawaPay sandbox checks; Zambia COMPLETED test MSISDNs |

### DX / demo

| New | Description |
| --- | --- |
| Playwright walkthroughs | Captioned videos for list / buy / pay-redeem; combined MP4 with chapters |
| Dokploy docs for `VITE_*` build-args | Prevent empty contract addresses in production bundles |

---

## 5. How functional it was before vs now

### Before

| Journey | Status |
| --- | --- |
| MetaMask login | Worked (SIWE path) |
| Seller deposit / list | Partially — Sepolia foundation existed; UX incomplete |
| Browse/buy with MoMo | **Not end-to-end** — no reliable PawaPay deposit → release → seller payout |
| Pay & redeem | **Stub / unwired** |
| Marketplace IA | Home/dashboard fragments; no dedicated listings + purchase history |
| Production | Deployable, but Vite contract addresses easy to miss at **build** time |

### Now

| Journey | Status |
| --- | --- |
| List USDT | **Working** on Sepolia with mintable MockUSDT + MetaMask |
| Browse listings | **Working** (`/` preview + `/listings`) |
| Buy with MoMo (sandbox) | **Wired** — request → reserve → deposit → operator release → seller payout (sandbox MSISDNs; live PIN not required in sandbox) |
| Pay & redeem | **Wired** — pay → payout → settle (Payments operator aligned) |
| Dashboard | **Working** — balance, my listings, purchases |
| Production demo | **Live** at p2p.oneziko.com — requires rebuild with `VITE_*` build-args after contract redeploys |

**Summary:** Before, the webapp was a **wallet-authenticated Sepolia listing shell** with incomplete fiat rails. Now it is a **three-pillar MoMo ↔ USDT demo**: list, buy/request, and pay & redeem, with operator settlement and PawaPay sandbox integration.

---

## 6. Honest attribution

- **Pre-existing:** Laravel/Jetstream app, MetaMask auth, early deposit/dashboard reconciliation, MoMo profile seeds, Dokploy baseline, contracts ABIs/design from the sibling repo.
- **Built during / for this submission push:** landing + listings/dashboard IA, full PawaPay wiring, operator settlement path, pay & redeem, buy card flow, sandbox smoke/walkthrough tooling, production Vite build-arg fixes for current Sepolia addresses.
- **Judging note:** Please evaluate **new MoMo + settlement product loops and UX**, not a claim that Laravel/Jetstream or MetaMask login were invented during the hackathon.

---

## 7. Related disclosure

See the contracts repo [`HACKATHON_DISCLOSURE.md`](https://github.com/Chizzoz/p2p-momo-crypto-exchange/blob/main/HACKATHON_DISCLOSURE.md) for on-chain pre-existing vs new deploy/integration work.
