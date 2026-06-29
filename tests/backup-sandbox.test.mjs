import assert from 'node:assert/strict';
import { analyzeBackupVaultDiff } from '../src/features/backup/backupVaultDiff.ts';
import { calculateBackupHealthScore } from '../src/features/backup/backupHealthScore.ts';
import { buildBackupRestoreReport } from '../src/features/backup/backupRestoreReport.ts';
import { runRestoreSandbox } from '../src/features/backup/restoreSandbox.ts';

const currentWallets = [
  {
    _id: '1',
    name: 'Main',
    address: '0xAAA',
    network: 'ETH',
    groupId: 'cold',
    tags: ['long-term'],
    privateKey: '0x111',
  },
  {
    _id: '2',
    name: 'Removed locally if replace',
    address: '0xBBB',
    network: 'ETH',
    seedPhrase: 'alpha beta gamma',
  },
];

const backupWallets = [
  {
    _id: '1b',
    name: 'Main updated',
    address: '0xaaa',
    network: 'ETH',
    groupId: 'hot',
    tags: ['long-term', 'restored'],
    privateKey: '0x111',
  },
  {
    _id: '3',
    name: 'New backup wallet',
    address: '0xCCC',
    network: 'BTC',
    privateKey: '0x333',
  },
  {
    _id: '4',
    name: 'Duplicate secret copy',
    address: '0xDDD',
    network: 'ETH',
    privateKey: '0x333',
  },
];

const inspection = {
  legacy: false,
  status: 'verified',
  integrity: 'verified',
  format: 'xkey-backup-v4',
  metadata: {
    createdAt: '2026-06-20T00:00:00.000Z',
    backupId: 'backup-1',
    containerHash: 'hash-1',
    appVersion: '6.0.11',
    platform: 'web',
    source: 'github.com/haivcon/xKey',
    scope: 'vault',
    walletCount: backupWallets.length,
    portable: true,
  },
};

const diff = analyzeBackupVaultDiff(currentWallets, backupWallets);
assert.equal(diff.summary.currentWallets, 2);
assert.equal(diff.summary.backupWallets, 3);
assert.equal(diff.summary.newInBackup, 2);
assert.equal(diff.summary.missingFromBackup, 1);
assert.equal(diff.summary.changed, 1);
assert.equal(diff.summary.tagChanged, 1);
assert.equal(diff.summary.folderChanged, 1);
assert.equal(diff.summary.duplicateSecrets, 2);

const health = calculateBackupHealthScore({
  inspection,
  backupWalletCount: backupWallets.length,
  decryptSucceeded: true,
  diff,
  now: new Date('2026-06-29T00:00:00.000Z'),
});
assert.equal(health.grade, 'A');
assert.equal(health.recommendation, 'review_before_restore');

const sandbox = runRestoreSandbox({
  currentWallets,
  backupWallets,
  inspection,
  now: new Date('2026-06-29T00:00:00.000Z'),
});
assert.equal(sandbox.backupWalletCount, 3);
assert.equal(sandbox.recommendedMode, 'cancel');
assert.equal(sandbox.canRestore, false);
assert.ok(sandbox.warnings.some(warning => warning.code === 'replace_would_delete_wallets'));
assert.ok(sandbox.warnings.some(warning => warning.code === 'duplicate_secrets'));

const tamperedSandbox = runRestoreSandbox({
  currentWallets,
  backupWallets,
  inspection: { ...inspection, status: 'tampered', integrity: 'modified' },
  now: new Date('2026-06-29T00:00:00.000Z'),
});
assert.equal(tamperedSandbox.recommendedMode, 'cancel');
assert.equal(tamperedSandbox.canRestore, false);

const restoreReport = buildBackupRestoreReport({
  mode: 'merge',
  backupId: inspection.metadata.backupId,
  fileHash: inspection.metadata.containerHash,
  integrity: inspection.integrity,
  importedWallets: 1,
  skippedDuplicates: 1,
  sensitiveFieldsFilled: 0,
  sandbox,
  createdAt: new Date('2026-06-29T00:00:00.000Z'),
});
assert.match(restoreReport, /xKey backup restore report/);
assert.match(restoreReport, /Score: \d+/);
assert.match(restoreReport, /New in backup: 2/);
assert.match(restoreReport, /Duplicate secrets: 2/);
assert.match(restoreReport, /CRITICAL critical_conflicts/);
assert.match(restoreReport, /WARNING duplicate_secrets/);
assert.match(restoreReport, /\[Offline diff details\]/);
assert.match(restoreReport, /CHANGED Main updated/);
assert.match(restoreReport, /groupId:cold->hot\(warning\)/);
assert.match(restoreReport, /\[Secret conflicts\]/);
assert.match(restoreReport, /CRITICAL privateKey/);

console.log('backup sandbox tests passed');
