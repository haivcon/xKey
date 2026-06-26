import assert from 'node:assert/strict';

const {
  createPortableBackupText,
  encryptBackup,
  inspectBackupFile,
  parseEncryptedBackupText,
  parseVaultBackupFile,
} = await import('../src/utils/backup/backupUtils.ts');

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const backupMarkers = {
  headerStart: '-----BEGIN XKEY HEADER-----',
  payloadStart: '-----BEGIN XKEY PAYLOAD-----',
  payloadEnd: '-----END XKEY PAYLOAD-----',
  footerStart: '-----BEGIN XKEY RECOVERY FOOTER-----',
  backupEnd: '-----END XKEY BACKUP V4-----',
};

const flipPayloadChar = (value, index) => {
  const current = value[index] || 'A';
  const replacement = current === 'A' ? 'B' : 'A';
  return `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`;
};

const getBlockRange = (backupText, startMarker, endMarker) => {
  const markerStart = backupText.indexOf(startMarker);
  const contentStart = backupText.indexOf('\n', markerStart + startMarker.length) + 1;
  const contentEnd = backupText.indexOf(endMarker, contentStart);
  return {
    contentStart,
    contentEnd,
    content: backupText.slice(contentStart, contentEnd).trim(),
  };
};

const encodeJsonBlock = (value) => {
  const bytes = textEncoder.encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const decodeJsonBlock = (value) => {
  const binary = atob(value.trim());
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return JSON.parse(textDecoder.decode(bytes));
};

const mutateDescriptor = (backupText, mutate) => {
  const header = getBlockRange(backupText, backupMarkers.headerStart, backupMarkers.payloadStart);
  const footer = getBlockRange(backupText, backupMarkers.footerStart, backupMarkers.backupEnd);
  const descriptor = mutate(decodeJsonBlock(footer.content));
  const encoded = encodeJsonBlock(descriptor);
  return [
    backupText.slice(0, header.contentStart),
    encoded,
    '\n',
    backupText.slice(header.contentEnd, footer.contentStart),
    encoded,
    '\n',
    backupText.slice(footer.contentEnd),
  ].join('');
};

const mutatePayload = (backupText, mutate) => {
  const payload = getBlockRange(backupText, backupMarkers.payloadStart, backupMarkers.payloadEnd);
  return `${backupText.slice(0, payload.contentStart)}${mutate(payload.content)}\n${backupText.slice(payload.contentEnd)}`;
};

const corruptPayloadByte = (backupText) => mutatePayload(backupText, payload => flipPayloadChar(payload, 0));

const corruptPayloadBeyondRecovery = (backupText) => {
  const footer = getBlockRange(backupText, backupMarkers.footerStart, backupMarkers.backupEnd);
  const descriptor = decodeJsonBlock(footer.content);
  const shardSize = descriptor.recovery.shardSize;
  const shardsToCorrupt = descriptor.recovery.parityShards + 1;
  return mutatePayload(backupText, (payload) => {
    let corrupted = payload;
    for (let shardIndex = 0; shardIndex < shardsToCorrupt; shardIndex += 1) {
      corrupted = flipPayloadChar(corrupted, shardIndex * shardSize);
    }
    return corrupted;
  });
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

const missingMetadataBackupText = mutateDescriptor(backupText, (descriptor) => {
  delete descriptor.summary;
  delete descriptor.configSummary;
  delete descriptor.createdBy;
  return descriptor;
});
const missingMetadataInspection = await inspectBackupFile(missingMetadataBackupText);
assert.equal(missingMetadataInspection.status, 'ok');
assert.equal(missingMetadataInspection.metadata?.walletCount, 0);
assert.equal(missingMetadataInspection.metadata?.scope, 'vault');
assert.equal(missingMetadataInspection.metadata?.platform, 'unknown');
const parsedMissingMetadata = await parseEncryptedBackupText(missingMetadataBackupText, 'device-key-does-not-match', password);
assert.equal(parsedMissingMetadata.wallets?.[0]?.address, wallet.address);

const unsupportedVersionBackupText = mutateDescriptor(backupText, (descriptor) => ({
  ...descriptor,
  version: 999,
}));
await assert.rejects(
  () => parseEncryptedBackupText(unsupportedVersionBackupText, 'device-key-does-not-match', password),
  /Unsupported backup version: 999/,
);

const legacyBackupText = await encryptBackup({ wallets: [wallet], config: { scope: 'legacy-suite' } }, password);
const legacyInspection = await inspectBackupFile(legacyBackupText);
assert.equal(legacyInspection.legacy, true);
assert.equal(legacyInspection.status, 'legacy');
const parsedLegacyBackup = await parseEncryptedBackupText(legacyBackupText, 'device-key-does-not-match', password);
assert.equal(parsedLegacyBackup.wallets?.[0]?.address, wallet.address);

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

const unrecoverablePayloadBackupText = corruptPayloadBeyondRecovery(backupText);
const unrecoverableInspection = await inspectBackupFile(unrecoverablePayloadBackupText);
assert.equal(unrecoverableInspection.status, 'tampered');
assert.equal(unrecoverableInspection.integrity, 'modified');
assert.equal(unrecoverableInspection.recovered, false);
assert.ok((unrecoverableInspection.recoveredShards?.length || 0) > 5);
await assert.rejects(
  () => parseEncryptedBackupText(unrecoverablePayloadBackupText, 'device-key-does-not-match', password),
  /integrity check failed|modified or corrupted/i,
);

console.log('Backup utils crypto/import edge-case tests passed');
