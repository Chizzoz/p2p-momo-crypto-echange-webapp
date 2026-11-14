import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { caption, installCaptions, installWalletMock } from './helpers/captions';

const MOMO_SELLER = '0xF27503d9781a6243224B822ADf9be9f6765B3B6a';

test.describe('Service 2 — Sell MoMo', () => {
  test('user opens List MoMo and prepares an offer', async ({ page }) => {
    await installCaptions(page);
    await installWalletMock(page, MOMO_SELLER);

    await page.goto('/');
    await caption(
      page,
      'Service 2: Sell MoMo',
      'Deposit mobile money first at your rate, then wait for a USDT filler.',
    );

    await login(page, 'buyer@empiya.test');
    await caption(
      page,
      'MoMo seller signed in',
      'Profile MoMo is bound — required before creating a Sell MoMo offer.',
    );

    await page.goto('/momo-offers');
    await caption(
      page,
      'MoMo offers marketplace',
      'Open Sell MoMo listings. Fillers depositAndReserve USDT to take an offer.',
    );

    await page.getByRole('button', { name: 'List MoMo' }).first().click();
    await expect(page.getByText(/List MoMo \(get USDT\)/i)).toBeVisible();
    await caption(
      page,
      'Create MoMo offer modal',
      'Currency comes from the seller’s MoMo country. Fiat is collected via PawaPay first.',
    );

    await page.locator('#momo_fiat_amount').fill('275');
    await caption(
      page,
      'Fiat to deposit',
      'Sandbox collect uses the bound MSISDN (COMPLETED test numbers need no real PIN).',
    );

    await page.locator('#momo_usdt_amount').fill('10');
    await caption(
      page,
      'USDT wanted',
      'Implied rate is shown. After MoMo confirms, the offer opens for USDT fillers.',
    );

    await page.waitForTimeout(1000);
    await caption(
      page,
      'Next: MoMo collect → fill',
      'Live: LIST MOMO starts PawaPay deposit; filler calls depositAndReserve; operator releaseToBuyer.',
    );

    await expect(
      page.getByRole('button', { name: /LIST MOMO/i }).first(),
    ).toBeVisible();
    await page.waitForTimeout(2000);
  });
});
