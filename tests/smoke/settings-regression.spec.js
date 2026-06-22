import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const readSource = (relativePath) => readFile(path.join(repoRoot, relativePath), 'utf8');

test('settings danger zone belongs to data tab', async () => {
  const securityTab = await readSource('src/components/settings/SecurityTab.tsx');
  const dataTab = await readSource('src/components/settings/DataTab.tsx');
  const settingsScreen = await readSource('src/components/SettingsScreen.tsx');

  expect(securityTab).not.toContain("t('settings.wipeAll')");
  expect(securityTab).not.toContain('handleWipe');
  expect(dataTab).toContain('DangerZone');
  expect(dataTab).toContain("t('settings.wipeAll')");
  expect(settingsScreen).toContain('<DataTab aesKey={aesKey} onImport={onImport} onWipe={onWipe} />');
});

test('runtime integrity checks include crypto KATs and build manifest verification', async () => {
  const runtimeIntegrity = await readSource('src/utils/runtimeIntegrity.ts');
  const viteConfig = await readSource('vite.config.ts');
  const app = await readSource('src/App.tsx');

  expect(runtimeIntegrity).toContain('runCryptoKnownAnswerTests');
  expect(runtimeIntegrity).toContain('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(runtimeIntegrity).toContain('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
  expect(runtimeIntegrity).toContain('58e2fccefa7e3061367f1d57a4e7455a');
  expect(runtimeIntegrity).toContain('xkey-integrity-manifest.json');
  expect(runtimeIntegrity).toContain('github.com/haivcon/xKey');
  expect(runtimeIntegrity).toContain('INTEGRITY_REQUEST_TIMEOUT_MS');
  expect(runtimeIntegrity).toContain('INTEGRITY_TOTAL_TIMEOUT_MS');
  expect(runtimeIntegrity).toContain('withIntegrityTimeout');
  expect(runtimeIntegrity).toContain('ASSET_VERIFICATION_CONCURRENCY');
  expect(runtimeIntegrity).toContain('Promise.all(workers)');
  expect(runtimeIntegrity).toContain('verifyManifestSignature');
  expect(runtimeIntegrity).toContain('APP_SIGNATURE_INVALID');
  expect(runtimeIntegrity).toContain('ASSET_HASH_MISMATCH');
  expect(viteConfig).toContain('RSA-PSS-SHA256');
  expect(viteConfig).toContain('shouldIncludeIntegrityAsset');
  expect(viteConfig).toContain('xkey-integrity-manifest');
  expect(app).toContain('runRuntimeIntegrityChecks');
  expect(app).toContain('integrityCheckRef');
});

test('root and data tamper guard is wired to Android risk checks and settings', async () => {
  const deviceIntegrity = await readSource('src/utils/deviceIntegrity.ts');
  const deviceIntegrityPlugin = await readSource('android/app/src/main/java/com/haivcon/xkey/DeviceIntegrityPlugin.java');
  const mainActivity = await readSource('android/app/src/main/java/com/haivcon/xkey/MainActivity.java');
  const securityTab = await readSource('src/components/settings/SecurityTab.tsx');
  const app = await readSource('src/App.tsx');

  expect(deviceIntegrity).toContain("registerPlugin<DeviceIntegrityPlugin>('DeviceIntegrity')");
  expect(deviceIntegrity).toContain('DEVICE_INTEGRITY_GUARD_KEY');
  expect(deviceIntegrity).toContain('getDeviceIntegrityRisk');
  expect(deviceIntegrity).toContain('isDeviceIntegrityGuardEnabled');
  expect(deviceIntegrityPlugin).toContain('@CapacitorPlugin(name = "DeviceIntegrity")');
  expect(deviceIntegrityPlugin).toContain('ROOT_PATHS');
  expect(deviceIntegrityPlugin).toContain('Settings.Global.ADB_ENABLED');
  expect(deviceIntegrityPlugin).toContain('test_keys');
  expect(deviceIntegrityPlugin).toContain('root_files');
  expect(deviceIntegrityPlugin).toContain('su_command');
  expect(deviceIntegrityPlugin).toContain('debuggable_app');
  expect(mainActivity).toContain('registerPlugin(DeviceIntegrityPlugin.class)');
  expect(securityTab).toContain('handleToggleDeviceIntegrityGuard');
  expect(securityTab).toContain("t('settings.deviceIntegrityTitle')");
  expect(securityTab).toContain("t('settings.deviceIntegrityLimit')");
  expect(app).toContain('isDeviceIntegrityGuardEnabled');
  expect(app).toContain("appendAuditLog('device_integrity.blocked'");
  expect(app).toContain("t('integrity.deviceRiskBlocked')");
});

test('security status is collapsible and hardware warning uses Notice', async () => {
  const securityTab = await readSource('src/components/settings/SecurityTab.tsx');

  expect(securityTab).toContain('showSecurityStatus');
  expect(securityTab).toContain('setShowSecurityStatus(!showSecurityStatus)');
  expect(securityTab).toContain("t('settings.hardwareBoundBackupDeviceNote')");
  expect(securityTab).toContain('<Notice variant="warning" strong>');
  expect(securityTab).toContain("title: t('settings.hardwareBoundConfirmTitle')");
});

test('folder actions menu uses fixed portal rendering', async () => {
  const folderTabs = await readSource('src/components/FolderTabs.tsx');

  expect(folderTabs).toContain('createPortal');
  expect(folderTabs).toContain('document.body');
  expect(folderTabs).toContain('getBoundingClientRect');
  expect(folderTabs).toContain('fixed inset-0 z-[9000]');
  expect(folderTabs).toContain('calculateMenuPosition');
  expect(folderTabs).toContain('onPointerDown={(e: PointerEvent<HTMLDivElement>) => e.stopPropagation()}');
  expect(folderTabs).toContain('onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}');
});

test('audit log tab and tamper-evident backup preview are wired into settings and import flow', async () => {
  const settingsScreen = await readSource('src/components/SettingsScreen.tsx');
  const auditTab = await readSource('src/components/settings/AuditLogTab.tsx');
  const fileImport = await readSource('src/hooks/useFileImport.ts');
  const app = await readSource('src/App.tsx');
  const auditLog = await readSource('src/utils/auditLog.ts');

  expect(settingsScreen).toContain("key: 'audit'");
  expect(settingsScreen).toContain('<AuditLogTab />');
  expect(auditTab).toContain('authenticateDeviceCredential');
  expect(auditTab).toContain('readAuditLog');
  expect(auditLog).toContain('previousHash');
  expect(auditLog).toContain('entryHash');
  expect(fileImport).toContain('inspectBackupFile');
  expect(fileImport).toContain('backupPreview');
  expect(app).toContain("backupPreview?.status === 'tampered'");
  expect(app).toContain("appendAuditLog('app.opened'");
});

test('vault and backup self-healing Reed-Solomon checks are present', async () => {
  const reedSolomon = await readSource('src/utils/reedSolomon.ts');
  const storage = await readSource('src/utils/storage.ts');
  const backupUtils = await readSource('src/utils/backupUtils.ts');

  expect(reedSolomon).toContain('encodeReedSolomon');
  expect(reedSolomon).toContain('decodeReedSolomon');
  expect(reedSolomon).toContain('PARITY_SHARDS = 5');
  expect(reedSolomon).toContain('reed-solomon-gf256-v1');
  expect(storage).toContain('encodeReedSolomon');
  expect(storage).toContain('decodeReedSolomon');
  expect(storage).toContain('base64-reed-solomon-shards-v1');
  expect(storage).toContain('recoverFragmentFromParity');
  expect(storage).toContain("appendAuditLog('vault.self_healed'");
  expect(backupUtils).toContain('xkey-backup-v4');
  expect(backupUtils).toContain('BEGIN XKEY RECOVERY FOOTER');
  expect(backupUtils).toContain('containerHash');
  expect(backupUtils).toContain('createBackupRecovery');
  expect(backupUtils).toContain('recoverBackupPayload');
  expect(backupUtils).toContain('dataHashes');
  expect(backupUtils).toContain("appendAuditLog('backup.self_healed'");
  expect(backupUtils).toContain('passwordSeal');
  expect(backupUtils).toContain("appendAuditLog('backup.tamper_detected'");
});

test('android xkey file open intent is wired to backup preview flow', async () => {
  const manifest = await readSource('android/app/src/main/AndroidManifest.xml');
  const mainActivity = await readSource('android/app/src/main/java/com/haivcon/xkey/MainActivity.java');
  const fileOpenPlugin = await readSource('android/app/src/main/java/com/haivcon/xkey/XKeyFileOpenPlugin.java');
  const nativeFileOpen = await readSource('src/utils/nativeFileOpen.ts');
  const app = await readSource('src/App.tsx');
  const fileImport = await readSource('src/hooks/useFileImport.ts');

  expect(manifest).toContain('android.intent.action.VIEW');
  expect(manifest).toContain('.*\\\\.xkey');
  expect(manifest).toContain('application/x-xkey');
  expect(manifest).toContain('application/octet-stream');
  expect(mainActivity).toContain('registerPlugin(XKeyFileOpenPlugin.class)');
  expect(fileOpenPlugin).toContain('@CapacitorPlugin(name = "XKeyFileOpen")');
  expect(fileOpenPlugin).toContain('getPendingFile');
  expect(fileOpenPlugin).toContain('ContentResolver');
  expect(fileOpenPlugin).toContain('MAX_IMPORT_BYTES');
  expect(nativeFileOpen).toContain("registerPlugin<XKeyFileOpenPlugin>('XKeyFileOpen')");
  expect(app).toContain('getPendingXKeyFile');
  expect(app).toContain('addXKeyFileOpenListener');
  expect(app).toContain("t('restore.openedExternal')");
  expect(app).toContain("t('restore.externalWaiting')");
  expect(app).toContain('handleCopyVerificationReport');
  expect(app).toContain('containerHash');
  expect(app).toContain('handleVerifyBackupOnly');
  expect(fileImport).toContain('handleExternalBackupFile');
  expect(fileImport).toContain('openedFromExternal: true');
  expect(fileImport).toContain('backup.opened_from_android');
  const packageJson = await readSource('package.json');
  const adbTest = await readSource('tests/adb-open-xkey.mjs');
  expect(packageJson).toContain('test:adb-open');
  expect(adbTest).toContain('android.intent.action.VIEW');
  expect(adbTest).toContain('/sdcard/Download/xkey_adb_intent_test.xkey');
  expect(adbTest).toContain('file://${remotePath}');
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
