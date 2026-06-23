import { expect, test } from '@playwright/test';

test('loads xKey shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('xKey').first()).toBeVisible({ timeout: 15000 });
});

for (const [name, width, height] of [
  ['compact phone', 320, 720],
  ['standard phone', 360, 800],
  ['large phone', 480, 900],
]) {
  test(`keeps the app shell within the ${name} viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByText('xKey').first()).toBeVisible({ timeout: 15000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
