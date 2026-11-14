import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { caption, installCaptions, installWalletMock } from './helpers/captions';

const PAYER = '0x6102118dda3E57d5D1c29A84ee7410A0E160DaBc';

test.describe('Service 3 — Pay with USDT', () => {
  test('payer fills Pay with USDT and reaches review', async ({ page }) => {
    await installCaptions(page);
    await installWalletMock(page, PAYER);

    await page.goto('/pay');
    await caption(
      page,
      'Service 3: Pay with USDT',
      'Lock USDT in EmpiyaPayments; recipient redeems as MoMo. Settle on success, refund on failure.',
    );

    await login(page, 'seller@empiya.test');
    await page.goto('/pay');
    await expect(page.getByRole('heading', { name: /Pay with USDT/i })).toBeVisible();

    await caption(
      page,
      'Recipient country first',
      'Country sets payout currency and available mobile networks.',
    );

    await page.locator('#country').selectOption({ label: /Zambia/i }).catch(async () => {
      await page.locator('#country').selectOption({ index: 0 });
    });

    const networkButton = page.locator('button').filter({ has: page.locator('img') }).first();
    if (await networkButton.count()) {
      await networkButton.click().catch(() => undefined);
    }
    const mtnChip = page.getByRole('button').filter({ hasText: /MTN/i }).first();
    if (await mtnChip.count()) {
      await mtnChip.click().catch(() => undefined);
    }
    // MNO logos are image buttons — click first network card in the wrap
    const networkCards = page.locator('form button[type="button"]');
    if (await networkCards.count()) {
      await networkCards.first().click().catch(() => undefined);
    }

    await page.locator('#mobile').fill('260763456789');
    await caption(
      page,
      'Sandbox recipient',
      'Zambia MTN COMPLETED test MSISDN 260763456789 (no real PIN).',
    );

    await page.locator('#amount').fill('5');
    await caption(page, 'USDT to lock', 'On-chain EmpiyaPayments.pay after USDT approve.');

    await page.locator('#fiat_amount').fill('137.50');
    await caption(
      page,
      'MoMo fiat amount',
      'Up to 2 decimal places. Backend still formats to the provider’s PawaPay precision.',
    );

    await caption(page, 'Review', 'Confirm details before wallet approve + MoMo payout.');
    await page.getByRole('button', { name: /Review payment/i }).click();
    await page.waitForTimeout(1500);

    const confirm = page.getByRole('button', { name: /Pay USDT/i }).first();
    await expect(confirm).toBeVisible();
    await caption(
      page,
      'Confirm pay',
      'Live: MetaMask pay → PawaPay payout → operator settle (or refund if payout REJECTED/FAILED).',
    );
    await page.waitForTimeout(2000);

    await caption(
      page,
      'Pay with USDT path',
      'pay → MoMo payout COMPLETED → settle · or REJECTED → on-chain refund.',
    );
    await page.waitForTimeout(1800);
  });
});
