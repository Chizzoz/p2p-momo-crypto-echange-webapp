import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { caption, installCaptions, installWalletMock } from './helpers/captions';

const SELLER = '0x6102118dda3E57d5D1c29A84ee7410A0E160DaBc';

test.describe('Service 1 — Sell USDT', () => {
  test('seller opens List USDT and prepares a listing', async ({ page }) => {
    await installCaptions(page);
    await installWalletMock(page, SELLER);

    await page.goto('/');
    await caption(
      page,
      'Service 1: Sell USDT',
      'Seller locks USDT in EmpiyaP2P escrow and posts a MoMo-priced offer.',
    );

    await login(page, 'seller@empiya.test');
    await caption(
      page,
      'Seller signed in',
      'MoMo profile is bound to a Zambia sandbox MTN test MSISDN.',
    );

    await page.goto('/');
    await caption(
      page,
      'Home → List USDT',
      'From the header or Welcome CTAs, open the Sell USDT listing modal.',
    );

    await page.getByRole('button', { name: 'List USDT' }).first().click();
    await expect(page.getByText(/List USDT \(get MoMo\)/i)).toBeVisible();
    await caption(
      page,
      'Sell USDT modal',
      'Choose amount, token, and unit price. Buyer later pays MoMo; seller gets a fiat wallet credit.',
    );

    const amount = page.locator('#amount');
    await amount.fill('10');
    await caption(page, 'USDT amount', 'Example: 10 USDT locked in escrow for buyers.');

    const token = page.locator('#token');
    if (await token.count()) {
      const options = token.locator('option');
      const n = await options.count();
      if (n > 1) {
        await token.selectOption({ index: 1 });
      }
    }

    const price = page.locator('#price');
    await price.fill('27.5');
    await caption(
      page,
      'Fiat price',
      'Buyer pays amount × price in MoMo. After releaseToBuyer, seller withdraws from their fiat wallet.',
    );

    await page.waitForTimeout(1200);
    await caption(
      page,
      'Next: MetaMask deposit',
      'Live step: approve USDT + EmpiyaP2P.deposit. Walkthrough stops before chain submit.',
    );

    await expect(
      page.getByRole('button', { name: /Deposit|Create|List|Confirm/i }).first(),
    ).toBeVisible();
    await page.waitForTimeout(2000);
  });
});
