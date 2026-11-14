import { Page, expect } from '@playwright/test';

export async function login(
  page: Page,
  email: string,
  password = 'password',
) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
