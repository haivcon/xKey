import { expect } from '@playwright/test';

export const TEST_PIN = '135790';
export const pinScreen = page => page.getByRole('heading', { name: 'Enter PIN', exact: true });
export async function enterPin(page, pin = TEST_PIN) {
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
}

// Only fresh, isolated browser contexts. Never use this seed on a device/user vault.
export async function setupSecurityApp(page, { theme = 'dark', blocked = false, preset = 'balanced' } = {}) {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.addInitScript(({ theme, blocked, preset }) => {
    if (!localStorage.getItem('e2e-security-seeded')) {
      for (const [key, value] of Object.entries({
        xkey_theme: theme, xkey_autolock_enabled: 'true', xkey_autolock_ms: '60000',
        xkey_autolock_preset: 'custom', xkey_disable_secret_copy: String(blocked),
        xkey_autolock_after_secret_copy: String(preset === 'strict'),
        // Browser focus is shared across parallel workers; test idle/copy separately.
        xkey_autolock_background_ms: '300000', xkey_autolock_blur_ms: '300000',
      })) localStorage.setItem(`CapacitorStorage.${key}`, value);
      localStorage.setItem('e2e-security-seeded', 'true');
    }
    window.securityEvents = { copies: [], locks: [], activity: 0, progress: 0 };
    window.addEventListener('xkey-secret-copied', e => window.securityEvents.copies.push(e.detail.kind));
    window.addEventListener('xkey-autolock-fired', e => window.securityEvents.locks.push(e.detail.reason));
    window.addEventListener('xkey-app-activity', () => window.securityEvents.activity++);
    // Observe real worker progress without storing candidate addresses or secrets.
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args);
        this.addEventListener('message', e => {
          if (e.data?.type === 'progress') window.securityEvents.progress++;
        });
      }
    };
  }, { theme, blocked, preset });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip', exact: true }).click({ timeout: 20000 });
  await enterPin(page);
  await expect(page.getByRole('heading', { name: 'Confirm PIN', exact: true })).toBeVisible();
  await enterPin(page);
  await expect(page.getByRole('button', { name: 'Add Wallet', exact: true })).toBeVisible({ timeout: 15000 });
}

export async function openGenerate(page, count = 1) {
  await page.getByRole('button', { name: 'Add Wallet', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Random', exact: true }).click();
  await page.locator('input[type="number"][max="10000"]').fill(String(count));
  await page.getByRole('button', { name: 'Generate Wallets', exact: true }).click();
}

export async function expectSeparatedRows(page) {
  await expect.poll(() => page.locator('[data-index]').count()).toBeGreaterThan(1);
  await expect.poll(() => page.locator('[data-index]').evaluateAll(rows => {
    const rects = rows.map(row => row.getBoundingClientRect()).sort((a, b) => a.top - b.top);
    return rects.every((rect, i) => rect.height > 0 && (!i || rect.top >= rects[i - 1].bottom - 1));
  })).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}
