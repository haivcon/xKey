import assert from 'node:assert/strict';

const {
  createPortableBackupText,
  inspectBackupFile,
  parseEncryptedBackupText,
  parseVaultBackupFile,
} = await import('../src/utils/backupUtils.ts');

const wallet = {
  id: 'wallet-1',
  name: 'Backup test',
  address: '0xabc123',
  privateKey: 'private-key',
  seedPhrase: '',
  network: 'ETH',
  tags: ['backup', 'crypto'],
};

const password = 'correct horse battery staple';
const wrongPassword = 'wrong password';

const backupText = await createPortableBackupText([wallet], { scope: 'test-suite' }, password);

assert.match(backupText, /-----BEGIN XKEY BACKUP V4-----/);
assert.match(backupText, /-----BEGIN XKEY PAYLOAD-----/);
assert.match(backupText, /-----BEGIN XKEY RECOVERY FOOTER-----/);

const inspection = await inspectBackupFile(backupText);
assert.equal(inspection.legacy, false);
assert.equal(inspection.canPreview, true);
assert.equal(inspection.status, 'ok');
assert.equal(inspection.integrity, 'verified');
assert.equal(inspection.metadata?.walletCount, 1);
assert.equal(inspection.metadata?.scope, 'test-suite');

const parsedWithUserPassword = await parseEncryptedBackupText(backupText, 'device-key-does-not-match', password);
assert.equal(parsedWithUserPassword.wallets?.length, 1);
assert.equal(parsedWithUserPassword.wallets?.[0]?.address, wallet.address);

await assert.rejects(
  () => parseEncryptedBackupText(backupText, 'device-key-does-not-match', wrongPassword),
  /Wrong password|Backup password seal failed/,
);

const parsedFromBase64 = await parseVaultBackupFile(Buffer.from(backupText, 'utf8').toString('base64'), 'device-key-does-not-match', password);
assert.equal(parsedFromBase64.wallets?.[0]?.name, wallet.name);

const tamperedBackupText = backupText.replace('-----END XKEY PAYLOAD-----', 'x-----END XKEY PAYLOAD-----');
const tamperedInspection = await inspectBackupFile(tamperedBackupText);
assert.equal(tamperedInspection.status, 'tampered');
assert.equal(tamperedInspection.integrity, 'modified');

await assert.rejects(
  () => parseEncryptedBackupText(tamperedBackupText, 'device-key-does-not-match', password),
  /integrity check failed|modified or corrupted/i,
);

console.log('Backup utils crypto/import tests passed');