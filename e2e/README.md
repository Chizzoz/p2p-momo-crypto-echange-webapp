# Playwright video walkthroughs

Records the three product services against the local DDEV app:

1. **Sell USDT** — List USDT modal (escrow deposit path)  
2. **Sell MoMo** — List MoMo modal on `/momo-offers`  
3. **Pay with USDT** — `/pay` form → review  

Videos land in `e2e-results/**/*.webm`. After a successful run they are also copied to:

- `e2e-videos/01-sell-usdt.webm`
- `e2e-videos/02-sell-momo.webm`
- `e2e-videos/03-pay-with-usdt.webm`
- `e2e-videos/empiya-walkthrough.mp4` — all three with chapter markers

HTML report: `e2e-report/` (`npm run e2e:report`).

Combine only (after videos exist): `npm run e2e:combine`.

## Setup

```bash
cd p2p-momo-crypto-echange-webapp
npm install -D @playwright/test
npx playwright install chromium
ddev exec php scripts/setup-walkthrough-users.php
```

Demo logins (password `password`):

- `seller@empiya.test` — Sell USDT / Pay with USDT
- `buyer@empiya.test` — Sell MoMo (MoMo-bound profile)

## Record

```bash
# Ensure DDEV is up and Vite assets are available (npm run build or npm run dev)
npm run e2e:walkthrough
```

Optional:

```bash
PLAYWRIGHT_SLOWMO=500 PLAYWRIGHT_BASE_URL=http://empiya-p2p-webapp.ddev.site npm run e2e:walkthrough
npx playwright show-report e2e-report
```

## Notes

- A wallet mock supplies `eth_requestAccounts` / Sepolia `chainId` so UI can proceed without MetaMask.
- On-chain `deposit` / `pay` / `depositAndReserve` are **not** fully executed in these videos; captions call out the live MetaMask steps.
- MoMo MSISDNs use PawaPay Zambia sandbox COMPLETED numbers.
