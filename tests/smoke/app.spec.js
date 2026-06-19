import { expect, test } from '@playwright/test';

test('loads xKey shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('xKey').first()).toBeVisible({ timeout: 15000 });
});
