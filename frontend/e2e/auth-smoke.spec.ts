import { expect, test } from '@playwright/test';

test('login opens the application and logout returns to login', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@example.com';
  const password = process.env.E2E_ADMIN_PASSWORD ?? 'E2e_Admin_12345!';
  await page.goto('./');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('button', { name: 'Аналітика' })).toBeVisible();
  await page.getByRole('button', { name: 'Відкрити профіль' }).click();
  await page.getByRole('button', { name: 'Вийти' }).click();
  await expect(page.getByRole('button', { name: 'Увійти' })).toBeVisible();
});
