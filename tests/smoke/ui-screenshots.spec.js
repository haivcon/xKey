import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const screenshotDir = path.join(process.cwd(), 'test-results', 'ui-screenshots');

for (const themeClass of ['', 'theme-light']) {
  for (const [name, width, height] of [
    ['compact', 320, 720],
    ['standard', 360, 800],
    ['large', 480, 900],
  ]) {
    test(`captures ${themeClass || 'dark'} shell at ${name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      if (themeClass) {
        await page.evaluate((className) => document.documentElement.classList.add(className), themeClass);
      }
      await expect(page.getByText('xKey').first()).toBeVisible({ timeout: 15000 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await fs.mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        path: path.join(screenshotDir, `${themeClass || 'dark'}-${name}.png`),
        fullPage: true,
      });
    });
  }
}
