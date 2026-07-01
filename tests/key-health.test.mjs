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
  getDuplicateGroups,
  getWalletHealth,
  getWalletHealthDetails,
  markWalletsBackupOutdated,
  markWalletsBackedUp,
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
  { name: 'due', createdAt: now - (DEFAULT_ROTATION_MONTHS * month + day), privateKey: signer.privateKey, lastBackupAt: now, lastModifiedAt: now - day },
  { name: 'ok', createdAt: now - month, lastBackupAt: now, lastModifiedAt: now - day },
  { name: 'failed', createdAt: now - month, lastProofOfKeysStatus: 'failed', lastBackupAt: now, lastModifiedAt: now - day },
];
assert.deepEqual(selectProofWallets(wallets, 'attention', wallets, now).map(wallet => wallet.name), ['due', 'failed']);
assert.deepEqual(selectProofWallets(wallets, 'signable', wallets, now).map(wallet => wallet.name), ['due']);

const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
const duplicatePrivateKey = ethers.Wallet.createRandom();
const duplicateWallets = [
  { _id: 'a', name: 'addr-a', address: duplicatePrivateKey.address, privateKey: duplicatePrivateKey.privateKey, seedPhrase: mnemonic, derivationPath: "m/44'/60'/0'/0/0", lastBackupAt: now, lastModifiedAt: now - day },
  { _id: 'b', name: 'addr-b', address: duplicatePrivateKey.address.toLowerCase(), privateKey: duplicatePrivateKey.privateKey.toUpperCase(), seedPhrase: mnemonic.toUpperCase(), derivationPath: "m/44'/60'/0'/0/0", lastBackupAt: now, lastModifiedAt: now - day },
];
assert.deepEqual(getDuplicateGroups(duplicateWallets).map(group => group.kind).sort(), ['address', 'derivationPath', 'mnemonic', 'privateKey']);

const duplicateHealth = getWalletHealthDetails(duplicateWallets[0], duplicateWallets, now);
assert.equal(duplicateHealth.risk, 'danger');
assert.ok(duplicateHealth.score < 100);
assert.ok(duplicateHealth.issues.some(issue => issue.code === 'duplicatePrivateKey'));
assert.ok(duplicateHealth.issues.some(issue => issue.code === 'duplicateMnemonic'));
assert.ok(duplicateHealth.issues.some(issue => issue.code === 'duplicateDerivationPath'));

const missingBackupHealth = getWalletHealthDetails({ name: 'new', createdAt: now, privateKey: signer.privateKey }, [], now);
assert.equal(missingBackupHealth.backupFresh, false);
assert.ok(missingBackupHealth.issues.some(issue => issue.code === 'missingBackup'));

const backedUp = await markWalletsBackedUp([{ name: 'fresh', updatedAt: now - day }], now);
assert.equal(backedUp[0].lastBackupAt, now);
assert.equal(backedUp[0].backupStatus, 'current');
assert.equal(getWalletHealthDetails(backedUp[0], backedUp, now).backupFresh, true);

const dirty = markWalletsBackupOutdated(backedUp, wallet => wallet.name === 'fresh', now + day);
assert.equal(dirty[0].backupStatus, 'outdated');
assert.equal(dirty[0].updatedAt, now + day);
assert.equal(getWalletHealthDetails(dirty[0], dirty, now + day).backupFresh, false);

console.log('Key health tests passed');
