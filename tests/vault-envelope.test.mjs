import assert from 'node:assert/strict';
import {
  decryptVaultEnvelope,
  encryptVaultEnvelope,
  isVaultEnvelope,
} from '../src/utils/crypto/vaultEnvelope.ts';

const key = '11'.repeat(32);
const wrongKey = '22'.repeat(32);
const plaintext = JSON.stringify([{ id: 'wallet-1', address: '0x1234' }]);

const first = await encryptVaultEnvelope(plaintext, key, 'wallets:main');
const second = await encryptVaultEnvelope(plaintext, key, 'wallets:main');

assert.equal(isVaultEnvelope(first), true);
assert.equal(isVaultEnvelope('legacy-ciphertext'), false);
assert.notEqual(first, second, 'AES-GCM encryption must use a fresh IV');
assert.equal(await decryptVaultEnvelope(first, key, 'wallets:main'), plaintext);

await assert.rejects(
  decryptVaultEnvelope(first, wrongKey, 'wallets:main'),
  /Invalid key or corrupted vault data/,
);
await assert.rejects(
  decryptVaultEnvelope(first, key, 'wallets:decoy'),
  /context mismatch/,
);

const tamperEnvelope = (source, mutate) => {
  const parsed = JSON.parse(source);
  mutate(parsed);
  return JSON.stringify(parsed);
};

const tamperedPayload = tamperEnvelope(first, envelope => {
  const payload = Buffer.from(envelope.payload, 'base64');
  payload[0] ^= 1;
  envelope.payload = payload.toString('base64');
});
await assert.rejects(
  decryptVaultEnvelope(tamperedPayload, key, 'wallets:main'),
  /Invalid key or corrupted vault data/,
);

const tamperedIv = tamperEnvelope(first, envelope => {
  const iv = Buffer.from(envelope.iv, 'base64');
  iv[0] ^= 1;
  envelope.iv = iv.toString('base64');
});
await assert.rejects(
  decryptVaultEnvelope(tamperedIv, key, 'wallets:main'),
  /Invalid key or corrupted vault data/,
);

const wrongVersion = tamperEnvelope(first, envelope => {
  envelope.version = 99;
});
await assert.rejects(
  decryptVaultEnvelope(wrongVersion, key, 'wallets:main'),
  /Unsupported vault envelope version/,
);

const truncatedPayload = tamperEnvelope(first, envelope => {
  envelope.payload = Buffer.from('short').toString('base64');
});
await assert.rejects(
  decryptVaultEnvelope(truncatedPayload, key, 'wallets:main'),
  /Invalid vault envelope payload/,
);

const invalidEncoding = tamperEnvelope(first, envelope => {
  envelope.iv = '***';
});
await assert.rejects(
  decryptVaultEnvelope(invalidEncoding, key, 'wallets:main'),
  /Invalid vault envelope encoding/,
);

await assert.rejects(
  encryptVaultEnvelope(plaintext, 'not-a-key', 'wallets:main'),
  /Invalid vault encryption key/,
);
await assert.rejects(
  decryptVaultEnvelope('legacy-ciphertext', key, 'wallets:main'),
  /Invalid vault envelope/,
);

const settingCipher = await encryptVaultEnvelope('secret-setting', key, 'setting:auto-backup-password');
assert.equal(
  await decryptVaultEnvelope(settingCipher, key, 'setting:auto-backup-password'),
  'secret-setting',
);
await assert.rejects(
  decryptVaultEnvelope(settingCipher, key, 'setting:custom-folders'),
  /context mismatch/,
);

console.log('Vault AES-GCM envelope tests passed');