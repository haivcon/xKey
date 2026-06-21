import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
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

test('runtime integrity checks include crypto KATs and build manifest verification', async () => {
  const runtimeIntegrity = await readSource('src/utils/runtimeIntegrity.js');
  const viteConfig = await readSource('vite.config.js');
  const app = await readSource('src/App.jsx');

  expect(runtimeIntegrity).toContain('runCryptoKnownAnswerTests');
  expect(runtimeIntegrity).toContain('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(runtimeIntegrity).toContain('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
  expect(runtimeIntegrity).toContain('58e2fccefa7e3061367f1d57a4e7455a');
  expect(runtimeIntegrity).toContain('xkey-integrity-manifest.json');
  expect(runtimeIntegrity).toContain('github.com/haivcon/xKey');
  expect(runtimeIntegrity).toContain('INTEGRITY_TIMEOUT_MS');
  expect(runtimeIntegrity).toContain('verifyManifestSignature');
  expect(runtimeIntegrity).toContain('APP_SIGNATURE_INVALID');
  expect(runtimeIntegrity).toContain('ASSET_HASH_MISMATCH');
  expect(viteConfig).toContain('RSA-PSS-SHA256');
  expect(viteConfig).toContain('shouldIncludeIntegrityAsset');
  expect(viteConfig).toContain('xkey-integrity-manifest');
  expect(app).toContain('runRuntimeIntegrityChecks');
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

test('all locale files include security and integrity guidance keys', async () => {
  const localeDir = path.join(repoRoot, 'src/locales');
  const localeFiles = (await readdir(localeDir)).filter(file => file.endsWith('.js') && file !== 'index.js');
  const requiredKeys = [
    'hardwareBoundConfirmTitle',
    'hardwareBoundBackupDeviceNote',
    'hardwareBoundPortableBackupNote',
    'hardwareBoundRestoreNote',
    'hardwareBoundVerifyNote',
    'hardwareBoundBackupConfirm',
    'cryptoChecking',
    'appChecking',
    'failureTitle',
    'failureBody',
  ];

  for (const file of localeFiles) {
    const source = await readFile(path.join(localeDir, file), 'utf8');
    for (const key of requiredKeys) {
      expect(source, `${file} should include ${key}`).toContain(`"${key}"`);
    }
  }
});

test('production build writes an asset integrity manifest with valid hashes', async () => {
  let manifestText;
  try {
    manifestText = await readFile(path.join(repoRoot, 'dist/xkey-integrity-manifest.json'), 'utf8');
  } catch {
    test.skip(true, 'dist integrity manifest is only available after npm run build');
  }
  const manifest = JSON.parse(manifestText);
  expect(manifest.app).toBe('xKey');
  expect(manifest.source).toBe('github.com/haivcon/xKey');
  expect(manifest.algorithm).toBe('sha256');
  expect(manifest.signature?.algorithm).toBe('RSA-PSS-SHA256');
  expect(manifest.signature?.value).toMatch(/^[A-Za-z0-9+/]+=*$/);
  expect(manifest.assets.length).toBeGreaterThan(0);
  expect(manifest.assets.length).toBeLessThan(16);
  expect(manifest.assets.every(asset => asset.path === 'index.html' || /\.(js|css)$/i.test(asset.path))).toBe(true);

  const indexEntry = manifest.assets.find(asset => asset.path === 'index.html');
  expect(indexEntry).toBeTruthy();
  const criticalAsset = manifest.assets.find(asset => asset.path.includes('/App-') || asset.path.includes('/crypto.worker-'));
  expect(criticalAsset).toBeTruthy();

  for (const asset of manifest.assets.slice(0, 8)) {
    const bytes = await readFile(path.join(repoRoot, 'dist', asset.path));
    const actual = createHash('sha256').update(bytes).digest('hex');
    expect(actual, asset.path).toBe(asset.sha256);
    expect(bytes.length, asset.path).toBe(asset.bytes);
  }

  const tampered = { ...manifest.assets[0], sha256: '0'.repeat(64) };
  const tamperedBytes = await readFile(path.join(repoRoot, 'dist', tampered.path));
  const tamperedActual = createHash('sha256').update(tamperedBytes).digest('hex');
  expect(tamperedActual).not.toBe(tampered.sha256);
});
