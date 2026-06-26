import assert from 'node:assert/strict';

const {
  createPortableBackupText,
  inspectBackupFile,
  parseEncryptedBackupText,
  parseVaultBackupFile,
} = await import('../src/utils/backupUtils.ts');

const corruptPayloadByte = (backupText) => {
  const payloadStartMarker = '-----BEGIN XKEY PAYLOAD-----';
  const payloadEndMarker = '-----END XKEY PAYLOAD-----';
  const payloadStart = backupText.indexOf(payloadStartMarker) + payloadStartMarker.length;
  const contentStart = backupText.indexOf('\n', payloadStart) + 1;
  const payloadEnd = backupText.indexOf(payloadEndMarker, contentStart);
  const payload = backupText.slice(contentStart, payloadEnd).trim();
  const replacement = payload[0] === 'A' ? 'B' : 'A';
  return `${backupText.slice(0, contentStart)}${replacement}${payload.slice(1)}\n${backupText.slice(payloadEnd)}`;
};

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

const corruptedPayloadBackupText = corruptPayloadByte(backupText);
const recoveredInspection = await inspectBackupFile(corruptedPayloadBackupText);
assert.equal(recoveredInspection.status, 'ok');
assert.equal(recoveredInspection.integrity, 'repaired');
assert.equal(recoveredInspection.recovered, true);
assert.ok((recoveredInspection.recoveredShards?.length || 0) > 0);

const recoveredBackup = await parseEncryptedBackupText(corruptedPayloadBackupText, 'device-key-does-not-match', password);
assert.equal(recoveredBackup.wallets?.[0]?.address, wallet.address);

console.log('Backup utils crypto/import tests passed');
