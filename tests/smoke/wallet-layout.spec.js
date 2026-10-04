import { expect, test } from '@playwright/test';
import { enterPin, expectSeparatedRows, openGenerate, pinScreen, setupSecurityApp } from './fixtures/security-app.js';

for (const theme of ['dark', 'light']) {
  test(`saved wallet layout survives real idle PIN unlock and reload (${theme})`, async ({ page }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await setupSecurityApp(page, { theme });
    await openGenerate(page, 10);
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expectSeparatedRows(page);
    const firstName = await page.locator('[data-index]').first().innerText();
    await page.clock.runFor(65000);
    await expect(pinScreen(page)).toBeVisible();
    await enterPin(page);
    await expect(pinScreen(page)).not.toBeVisible();
    await expectSeparatedRows(page);
    expect(await page.locator('[data-index]').first().innerText()).toBe(firstName);
    await page.reload();
    await expect(pinScreen(page)).toBeVisible({ timeout: 15000 });
    await enterPin(page);
    await expect(pinScreen(page)).not.toBeVisible();
    await expectSeparatedRows(page);
    expect(await page.locator('[data-index]').first().innerText()).toBe(firstName);
    expect(errors).toEqual([]);
  });
}

for (const theme of ['dark', 'light']) {
  test(`real wallet rows remain separated without scrolling (${theme})`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    // Capture harness errors, excluding the existing CSP meta warning on navigation.
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.evaluate(async theme => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { createRoot } = ReactDOM;
      const { default: WalletList } = await import('/src/components/wallet/WalletList.tsx');
      const { ThemeProvider, useTheme } = await import('/src/contexts/ThemeContext.tsx');
      const ThemeControls = () => {
        const { setWalletDensity, setDisplayScale } = useTheme();
        return React.createElement('div', null,
          React.createElement('button', { onClick: () => setWalletDensity('ultra') }, 'Test ultra'),
          React.createElement('button', { onClick: () => setDisplayScale(120) }, 'Test scale'));
      };
      const { LanguageProvider } = await import('/src/contexts/LanguageContext.tsx');
      const { ToastProvider } = await import('/src/contexts/ToastContext.tsx');
      const { MasterPasswordProvider } = await import('/src/contexts/MasterPasswordContext.tsx');
      const { SecureDisplayProvider } = await import('/src/contexts/SecureDisplayContext.tsx');
      localStorage.setItem('CapacitorStorage.xkey_theme', theme);
      const host = document.createElement('div');
      document.body.replaceChildren(host);
      const root = createRoot(host);
      const wallets = Array.from({ length: 18 }, (_, i) => ({
        _id: i < 4 ? undefined : i < 6 ? 'duplicate-id' : `layout-${i}`,
        name: `Layout Wallet ${i}`, address: i < 2 ? '0x' + 'a'.repeat(40) : i < 4 ? undefined : `0x${i.toString(16).padStart(40, '0')}`,
        balance: '123.45', network: 'XLAYER', notes: 'Layout regression',
      }));
      let current = wallets;
      let loading = false;
      const noop = () => {};
      const render = () => root.render(React.createElement(MasterPasswordProvider, null,
        React.createElement(SecureDisplayProvider, null, React.createElement(LanguageProvider, null,
        React.createElement(ThemeProvider, null, React.createElement(ToastProvider, null,
          React.createElement('div', { id: 'layout-app' },
            React.createElement('div', { id: 'layout-header', style: { height: 130 } }),
            React.createElement(ThemeControls),
            React.createElement(WalletList, {
              vaultLoading: loading, filteredWallets: current, t: key => key,
              setQrModalData: noop, handleDeleteWallet: noop, handleRenameWallet: noop,
              handleEditWallet: noop, handleTogglePin: noop, setMovingWallet: noop,
              selectionMode: false, isSelected: () => false, toggleSelect: noop, sortOrder: 'custom', onReorder: noop,
            }))))))));
      window.layoutAction = action => {
        if (action === 'filter') current = wallets.slice(0, 6);
        if (action === 'clear') current = wallets;
        if (action === 'reverse') current = [...wallets].reverse();
        if (action === 'loading') loading = true;
        if (action === 'loaded') loading = false;
        render();
      };
      render();
    }, theme);
    const separated = async () => {
      await expect.poll(() => page.locator('[data-index]').count()).toBeGreaterThan(1);
      await expect.poll(() => page.locator('[data-index]').evaluateAll(rows => {
        const rects = rows.map(row => row.getBoundingClientRect()).sort((a, b) => a.top - b.top);
        return rects.every((rect, i) => rect.height > 0 && (!i || rect.top >= rects[i - 1].bottom - 1));
      })).toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    };
    await separated();
    for (let index = 0; index < 6; index++) {
      await expect(page.getByText(`Layout Wallet ${index}`, { exact: true })).toHaveCount(1);
    }
    await page.getByRole('button', { name: 'Test ultra', exact: true }).click();
    await separated();
    await page.getByRole('button', { name: 'Test scale', exact: true }).click();
    await separated();
    for (const action of ['filter', 'clear', 'reverse']) {
      await page.evaluate(action => window.layoutAction(action), action);
      await separated();
    }
    await page.evaluate(() => window.layoutAction('loading'));
    await expect(page.locator('[data-index]')).toHaveCount(0);
    await page.evaluate(() => window.layoutAction('loaded'));
    await separated();
    await page.evaluate(() => { document.querySelector('#layout-app').style.display = 'none'; });
    await page.waitForTimeout(100);
    await page.evaluate(() => { document.querySelector('#layout-app').style.display = ''; });
    await separated();
    await page.locator('[data-index]').first().getByText('Layout Wallet 17', { exact: true }).click();
    await separated();
    await page.setViewportSize({ width: 820, height: 1000 });
    await separated();
    await page.evaluate(() => { document.querySelector('#layout-header').style.height = '200px'; });
    await separated();
    expect(errors).toEqual([]);
  });
}
