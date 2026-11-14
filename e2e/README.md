# Playwright video walkthroughs

Records three product flows against the local DDEV app:

1. **List USDT** — seller listing modal  
2. **Buy / Request USDT** — marketplace buy request  
3. **Pay & redeem** — pay form → review  

Videos land in `e2e-results/**/*.webm`. After a successful run they are also copied to:

- `e2e-videos/01-list-usdt.webm`
- `e2e-videos/02-buy-usdt.webm`
- `e2e-videos/03-pay-redeem.webm`
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

- `seller@empiya.test`
- `buyer@empiya.test`

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
- On-chain `deposit` / `pay` / `reserve` are **not** fully executed in these videos; captions call out the live MetaMask steps.
- MoMo MSISDNs use PawaPay Zambia sandbox COMPLETED numbers.
