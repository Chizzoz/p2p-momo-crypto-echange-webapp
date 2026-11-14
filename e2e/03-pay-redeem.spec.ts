import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { caption, installCaptions, installWalletMock } from './helpers/captions';

const PAYER = '0x6102118dda3E57d5D1c29A84ee7410A0E160DaBc';

test.describe('Process 3 — Pay USDT & redeem MoMo', () => {
  test('payer fills pay & redeem and reaches review', async ({ page }) => {
    await installCaptions(page);
    await installWalletMock(page, PAYER);

    await page.goto('/pay');
    await caption(
      page,
      'Process 3: Pay & redeem',
      'Payer locks USDT in EmpiyaPayments; recipient redeems as MoMo.',
    );

    await login(page, 'seller@empiya.test');
    await page.goto('/pay');
    await expect(page.getByRole('heading', { name: /Pay with USDT/i })).toBeVisible();

    await caption(page, 'Pay form', 'Enter USDT amount, fiat payout, and recipient MoMo.');

    await page.locator('#amount').fill('5');
    await caption(page, 'USDT to lock', 'On-chain EmpiyaPayments.pay after USDT approve.');

    await page.locator('#fiat_amount').fill('137.5');
    await page.locator('#country').selectOption({ label: 'Zambia' }).catch(async () => {
      await page.locator('#country').selectOption({ index: 0 });
    });

    await page.locator('#mobile').fill('260763456789');
    await caption(
      page,
      'Sandbox recipient',
      'Zambia MTN COMPLETED test MSISDN 260763456789 (no real PIN).',
    );

    // Pick first network chip / radio if present
    const network = page.locator('input[name="network"], input[type="radio"]').first();
    if (await network.count()) {
      await network.check({ force: true }).catch(() => undefined);
    }
    const networkButton = page.getByRole('button', { name: /MTN|Airtel|Zamtel/i }).first();
    if (await networkButton.count()) {
      await networkButton.click().catch(() => undefined);
    }
    // Click labeled network cards
    const mtnLabel = page.getByText(/MTN/i).first();
    if (await mtnLabel.count()) {
      await mtnLabel.click().catch(() => undefined);
    }

    await caption(page, 'Review', 'Confirm details before wallet approve + MoMo payout.');
    await page.getByRole('button', { name: /Review|Continue|Next/i }).first().click();
    await page.waitForTimeout(1500);

    const confirm = page.getByRole('button', { name: /Pay USDT|Confirm|Submit/i }).first();
    if (await confirm.isVisible()) {
      await caption(
        page,
        'Confirm pay',
        'Live: MetaMask pay → PawaPay payout → operator settle(paymentId).',
      );
      await page.waitForTimeout(2000);
    }

    await caption(
      page,
      'Pay & redeem complete path',
      'pay → MoMo payout COMPLETED → settle (or refund on payout FAILED).',
    );
    await page.waitForTimeout(1800);
  });
});
