import { expect, test } from '@playwright/test';

test('real worker extras respect numeric filters and revalidate on resume', async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/');
  await expect(page.getByText('xKey').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button').first()).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  for (const digit of '135790') await page.getByRole('button', { name: digit, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirm PIN', exact: true })).toBeVisible();
  for (const digit of '135790') await page.getByRole('button', { name: digit, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirm PIN', exact: true })).not.toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Add Wallet', exact: true }).click();
  await expect(page.getByText('Vanity', { exact: true })).toBeVisible();
  await page.getByText('Vanity', { exact: true }).click();
  await page.getByRole('button', { name: /5 Auto-keep extra vanity/ }).click();
  const switches = page.locator('.vanity-extra-filter-grid').getByRole('switch');
  for (let i = 0; i < await switches.count(); i++) {
    if (await switches.nth(i).getAttribute('aria-checked') === 'true') await switches.nth(i).click();
  }
  const numeric = page.locator('.vanity-extra-filter-grid > div').filter({ has: page.getByText('Numeric tail', { exact: true }) });
  await numeric.getByRole('switch').click();
  await numeric.locator('input').fill('4');
  await numeric.locator('input').blur();
  await page.getByPlaceholder('e.g. c0de', { exact: true }).fill('abcdefabcdef');
  await page.getByRole('button', { name: 'Start Generator', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start Generator', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(page.getByText(/^Numeric tail [0-9]+$/).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  const cards = page.locator('button[aria-pressed]').filter({ has: page.locator('code') });
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    const address = (await card.locator('code').innerText()).replace(/\s/g, '');
    const tail = address.match(/[0-9]+$/)?.[0] ?? '';
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(tail.length).toBeGreaterThanOrEqual(4);
    await expect(card).toContainText(`Numeric tail ${tail}`);
    await expect(card).toContainText(`Score ${Math.round(tail.length * Math.log2(16 / 10) * 2.5)}`);
  }
  // Filters remain accessible without ending the paused session.
  await expect(numeric.getByRole('switch')).toBeVisible();
  await numeric.getByRole('switch').click();
  const lucky = page.locator('.vanity-extra-filter-grid > div').filter({ has: page.getByText('Lucky/custom patterns', { exact: true }) });
  await lucky.getByRole('switch').click();
  await lucky.getByPlaceholder('888, 666, 168').fill('');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(cards).toHaveCount(0);
  // Allow real workers to produce several batches under the new filters.
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(cards).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Save selected/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});