import assert from 'node:assert/strict';
import { ethers } from 'ethers';

if (!globalThis.crypto) {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto;
}
const memoryStorage = new Map();
globalThis.window = {
  localStorage: {
    getItem: key => memoryStorage.get(key) ?? null,
    setItem: (key, value) => { memoryStorage.set(key, String(value)); },
    removeItem: key => { memoryStorage.delete(key); },
    clear: () => { memoryStorage.clear(); },
  },
};

const {
  DEFAULT_ROTATION_MONTHS,
  createPostQuantumEnvelope,
  getWalletHealth,
  runWalletProofCheck,
  selectProofWallets,
} = await import('../src/utils/keyHealth.ts');

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 0, 1);
const month = 30 * day;

assert.equal(getWalletHealth({ createdAt: now - 3 * month }, now).level, 'ok');
assert.equal(getWalletHealth({ createdAt: now - (DEFAULT_ROTATION_MONTHS * month - 10 * day) }, now).level, 'soon');
assert.equal(getWalletHealth({ createdAt: now - (DEFAULT_ROTATION_MONTHS * month + day) }, now).level, 'due');
assert.equal(getWalletHealth({ createdAt: now - 100 * month, rotationSnoozedUntil: now + 10 * day }, now).level, 'snoozed');
assert.equal(getWalletHealth({}, now).level, 'missing');
assert.equal(getWalletHealth({ keyHealthReviewedAt: now }, now).level, 'ok');

const pq = await createPostQuantumEnvelope('unit-test-key', 4);
assert.equal(pq.pqPrepared, true);
assert.equal(pq.pqOneTimeSlots, 4);
assert.equal(pq.pqUsedSlots, 0);
assert.match(pq.pqReserveId, /^0x[0-9a-f]{32}$/i);
assert.match(pq.pqPublicCommitment, /^0x[0-9a-f]{64}$/i);
assert.equal('pqSecretMaterial' in pq, false);

const signer = ethers.Wallet.createRandom();
const passed = await runWalletProofCheck({ name: 'Signer', address: signer.address, privateKey: signer.privateKey }, 'nonce', now);
assert.equal(passed.lastProofOfKeysStatus, 'passed');

const failed = await runWalletProofCheck({ name: 'Mismatch', address: ethers.Wallet.createRandom().address, privateKey: signer.privateKey }, 'nonce', now);
assert.equal(failed.lastProofOfKeysStatus, 'failed');

const skipped = await runWalletProofCheck({ name: 'Address only', address: signer.address }, 'nonce', now);
assert.equal(skipped.lastProofOfKeysStatus, 'skipped');

const wallets = [
  { name: 'due', createdAt: now - (DEFAULT_ROTATION_MONTHS * month + day), privateKey: signer.privateKey },
  { name: 'ok', createdAt: now - month },
  { name: 'failed', createdAt: now - month, lastProofOfKeysStatus: 'failed' },
];
assert.deepEqual(selectProofWallets(wallets, 'attention', wallets, now).map(wallet => wallet.name), ['due', 'failed']);
assert.deepEqual(selectProofWallets(wallets, 'signable', wallets, now).map(wallet => wallet.name), ['due']);

console.log('Key health tests passed');
