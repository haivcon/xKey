import { expect, test } from '@playwright/test';
import { enterPin, openGenerate, pinScreen, setupSecurityApp } from './fixtures/security-app.js';

// Generated wallets are disposable. Do not retain traces/screenshots containing secrets.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
for (const outcome of ['blocked', 'failed', 'success']) {
  test(`generated secret copy ${outcome} respects lock policy`, async ({ page, context }) => {
    test.setTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setupSecurityApp(page, { blocked: outcome === 'blocked', preset: 'strict' });
    await openGenerate(page);
    const copyMnemonic = page.getByRole('button', { name: 'Copy mnemonic', exact: true });
    await expect(copyMnemonic).toBeVisible({ timeout: 15000 });
    // Public address copy is allowed even when secret copy is blocked.
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    expect(await page.evaluate(async () => /^0x[0-9a-fA-F]{40}$/.test(await navigator.clipboard.readText()))).toBe(true);
    expect(await page.evaluate(() => window.securityEvents.copies)).toEqual([]);
    expect(await page.evaluate(() => window.securityEvents.locks)).toEqual([]);
    await expect(pinScreen(page)).not.toBeVisible();
    if (outcome === 'failed') {
      // Capacitor web and its fallback both delegate to this method.
      await page.evaluate(() => {
        window.clipboardWriteAttempts = 0;
        navigator.clipboard.writeText = async () => {
          window.clipboardWriteAttempts++;
          throw new DOMException('Clipboard denied by test', 'NotAllowedError');
        };
      });
    }
    await copyMnemonic.click();
    if (outcome === 'success') {
      await expect(pinScreen(page)).toBeVisible();
      expect(await page.evaluate(() => window.securityEvents.copies)).toEqual(['mnemonic']);
      expect(await page.evaluate(() => window.securityEvents.locks)).toEqual(['afterSecretCopy']);
      await enterPin(page);
      await expect(copyMnemonic).toBeVisible();
    } else {
      await expect(page.getByText(outcome === 'blocked'
        ? 'Secret copy is disabled. Use hold-to-reveal instead.'
        : 'Copy failed. Please try again.', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.securityEvents.copies)).toEqual([]);
      expect(await page.evaluate(() => window.securityEvents.locks)).toEqual([]);
      await expect(pinScreen(page)).not.toBeVisible();
      await expect(copyMnemonic).toBeVisible();
      if (outcome === 'failed') expect(await page.evaluate(() => window.clipboardWriteAttempts)).toBe(2);
    }
    expect(errors).toEqual([]);
  });
}
