import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { caption, installCaptions, installWalletMock } from './helpers/captions';

const BUYER = '0xF27503d9781a6243224B822ADf9be9f6765B3B6a';

test.describe('Process 2 — Request / Buy USDT', () => {
  test('buyer browses listings and requests a buy', async ({ page }) => {
    await installCaptions(page);
    await installWalletMock(page, BUYER);

    await page.goto('/listings');
    await caption(
      page,
      'Process 2: Request USDT for fiat',
      'Buyer browses open USDT listings and pays with mobile money.',
    );

    await login(page, 'buyer@empiya.test');
    await page.goto('/listings');
    await caption(
      page,
      'USDT listings',
      'Dedicated marketplace of open seller offers (same book as home preview).',
    );

    const buyButton = page.getByRole('button', { name: 'Buy' }).first();
    await expect(buyButton).toBeVisible({ timeout: 30_000 });
    await caption(
      page,
      'Open offer',
      'Card shows USDT size, ZMW price/unit, and MoMo requirement.',
    );

    await buyButton.click();
    await page.waitForTimeout(1500);
    await caption(
      page,
      'Buy requested',
      'Backend stores reserved_buyer. Seller must confirm on-chain reserve(buyer).',
    );

    const continueBtn = page.getByRole('button', { name: /Continue payment/i }).first();
    if (await continueBtn.isVisible()) {
      await caption(
        page,
        'Continue payment',
        'After seller reserve: PawaPay deposit (sandbox MSISDN) → operator release → seller payout.',
      );
      // May fail without on-chain reserve — still valuable for the video path.
      await continueBtn.click().catch(() => undefined);
      await page.waitForTimeout(2000);
    }

    await caption(
      page,
      'End-to-end buy path',
      'reserve → MoMo deposit COMPLETED → releaseToBuyer → seller MoMo payout.',
    );
    await page.waitForTimeout(1800);
  });
});
