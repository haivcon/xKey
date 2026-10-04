import { expect, test } from '@playwright/test';
import { enterPin, pinScreen, setupSecurityApp } from './fixtures/security-app.js';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
for (const interact of [false, true]) {
  test(`real scanning does not reset idle lock (user interaction=${interact})`, async ({ page }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await setupSecurityApp(page);
    await page.getByRole('button', { name: 'Add Wallet', exact: true }).click();
    await page.getByText('Vanity', { exact: true }).click();
    await page.getByPlaceholder('e.g. c0de', { exact: true }).fill('abcdefabcdef');
    await page.getByRole('button', { name: 'Start Generator', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start Generator', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.securityEvents.progress)).toBeGreaterThan(0);
    // Pause virtual time, not the real workers. Step through intervals rather than
    // fastForward: the old periodic synthetic activity must be able to fire.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.clock.runFor(30000);
    if (interact) await page.keyboard.press('Shift');
    const before = await page.evaluate(() => window.securityEvents.progress);
    await expect.poll(() => page.evaluate(() => window.securityEvents.progress)).toBeGreaterThan(before);
    await page.clock.runFor(35000);
    if (interact) {
      await expect(pinScreen(page)).not.toBeVisible();
      await page.clock.runFor(30000);
    }
    await expect(pinScreen(page)).toBeVisible();
    expect(await page.evaluate(() => window.securityEvents.locks)).toEqual(['idle']);
    expect(await page.evaluate(() => window.securityEvents.activity)).toBe(0);
    await page.clock.resume();
    await enterPin(page);
    await expect(pinScreen(page)).not.toBeVisible({ timeout: 20000 });
    expect(errors).toEqual([]);
  });
}
