import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const readSource = (relativePath) => readFile(path.join(repoRoot, relativePath), 'utf8');

test('settings danger zone belongs to data tab', async () => {
  const securityTab = await readSource('src/components/settings/SecurityTab.jsx');
  const dataTab = await readSource('src/components/settings/DataTab.jsx');
  const settingsScreen = await readSource('src/components/SettingsScreen.jsx');

  expect(securityTab).not.toContain("t('settings.wipeAll')");
  expect(securityTab).not.toContain('handleWipe');
  expect(dataTab).toContain('DangerZone');
  expect(dataTab).toContain("t('settings.wipeAll')");
  expect(settingsScreen).toContain('<DataTab aesKey={aesKey} onImport={onImport} onWipe={onWipe} />');
});

test('security status is collapsible and hardware warning uses Notice', async () => {
  const securityTab = await readSource('src/components/settings/SecurityTab.jsx');

  expect(securityTab).toContain('showSecurityStatus');
  expect(securityTab).toContain('setShowSecurityStatus(!showSecurityStatus)');
  expect(securityTab).toContain("t('settings.hardwareBoundBackupDeviceNote')");
  expect(securityTab).toContain('<Notice variant="warning" strong>');
  expect(securityTab).toContain("title: t('settings.hardwareBoundConfirmTitle')");
});

test('folder actions menu uses fixed portal rendering', async () => {
  const folderTabs = await readSource('src/components/FolderTabs.jsx');

  expect(folderTabs).toContain('createPortal');
  expect(folderTabs).toContain('document.body');
  expect(folderTabs).toContain('getBoundingClientRect');
  expect(folderTabs).toContain('fixed inset-0 z-[9000]');
  expect(folderTabs).toContain('calculateMenuPosition');
  expect(folderTabs).toContain('onPointerDown={(e) => e.stopPropagation()}');
  expect(folderTabs).toContain('onClick={(e) => e.stopPropagation()}');
});

test('folder actions menu opens with one click and is not clipped by the folder scroller', async ({ page }) => {
  await page.goto('/tests/smoke/fixtures/folder-tabs.html');

  await page.getByRole('button', { name: 'Folder actions' }).click();
  const menuAction = page.getByRole('button', { name: 'Export folder' });
  await expect(menuAction).toBeVisible();

  const geometry = await page.evaluate(() => {
    const clipper = document.getElementById('clipper').getBoundingClientRect();
    const menu = [...document.querySelectorAll('button')]
      .find(button => button.textContent.includes('Export folder'))
      .closest('.absolute')
      .getBoundingClientRect();
    return {
      menuEscapesClipper: menu.right > clipper.right || menu.bottom > clipper.bottom,
      menuInsideViewport: menu.left >= 0 && menu.top >= 0 && menu.right <= window.innerWidth && menu.bottom <= window.innerHeight,
    };
  });
  expect(geometry.menuEscapesClipper).toBe(true);
  expect(geometry.menuInsideViewport).toBe(true);

  await menuAction.click();
  await expect.poll(() => page.evaluate(() => window.folderActions)).toContain('export:Created');
});

test('all locale files include hardware-bound backup guidance keys', async () => {
  const localeDir = path.join(repoRoot, 'src/locales');
  const localeFiles = (await readdir(localeDir)).filter(file => file.endsWith('.js') && file !== 'index.js');
  const requiredKeys = [
    'hardwareBoundConfirmTitle',
    'hardwareBoundBackupDeviceNote',
    'hardwareBoundPortableBackupNote',
    'hardwareBoundRestoreNote',
    'hardwareBoundVerifyNote',
    'hardwareBoundBackupConfirm',
  ];

  for (const file of localeFiles) {
    const source = await readFile(path.join(localeDir, file), 'utf8');
    for (const key of requiredKeys) {
      expect(source, `${file} should include ${key}`).toContain(`"${key}"`);
    }
  }
});
