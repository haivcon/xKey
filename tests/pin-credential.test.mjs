import assert from 'node:assert/strict';
import CryptoJS from 'crypto-js';
import {
  createPinCredential,
  isVersionedPinCredential,
  verifyPinCredential,
} from '../src/features/security/pinCredential.ts';

const pin = '482951';
const wrongPin = '482952';

const mainRecord = await createPinCredential(pin, 'main');
const secondMainRecord = await createPinCredential(pin, 'main');
const parsedMain = JSON.parse(mainRecord);

assert.equal(parsedMain.version, 2);
assert.equal(parsedMain.kdf, 'PBKDF2-SHA256');
assert.equal(parsedMain.iterations, 310000);
assert.equal(parsedMain.domain, 'main');
assert.equal(Buffer.from(parsedMain.salt, 'base64').length, 16);
assert.equal(Buffer.from(parsedMain.hash, 'base64').length, 32);
assert.notEqual(mainRecord, secondMainRecord, 'each credential must use a fresh random salt');
assert.equal(isVersionedPinCredential(mainRecord), true);

assert.equal((await verifyPinCredential(pin, mainRecord, 'main')).valid, true);
assert.equal((await verifyPinCredential(wrongPin, mainRecord, 'main')).valid, false);
assert.equal((await verifyPinCredential(pin, mainRecord, 'decoy')).valid, false);
assert.equal((await verifyPinCredential(pin, mainRecord, 'sensitive')).valid, false);

const legacyMain = CryptoJS.SHA256(`${pin}xkey_pin_salt_v1`).toString();
const migratedMain = await verifyPinCredential(pin, legacyMain, 'main');
assert.equal(migratedMain.valid, true);
assert.ok(migratedMain.upgradedRecord);
assert.equal(isVersionedPinCredential(migratedMain.upgradedRecord), true);
assert.equal((await verifyPinCredential(pin, migratedMain.upgradedRecord, 'main')).valid, true);

const legacyDecoy = CryptoJS.SHA256(`${pin}xkey_pin_salt_v1`).toString();
const migratedDecoy = await verifyPinCredential(pin, legacyDecoy, 'decoy');
assert.equal(migratedDecoy.valid, true);
assert.ok(migratedDecoy.upgradedRecord);
assert.equal((await verifyPinCredential(pin, migratedDecoy.upgradedRecord, 'decoy')).valid, true);
assert.equal((await verifyPinCredential(pin, migratedDecoy.upgradedRecord, 'main')).valid, false);

const legacySensitive = CryptoJS.SHA256(`${pin}:xkey_sensitive_pin_salt_v1`).toString();
const migratedSensitive = await verifyPinCredential(pin, legacySensitive, 'sensitive');
assert.equal(migratedSensitive.valid, true);
assert.ok(migratedSensitive.upgradedRecord);
assert.equal((await verifyPinCredential(pin, migratedSensitive.upgradedRecord, 'sensitive')).valid, true);

assert.equal((await verifyPinCredential(pin, null, 'main')).valid, false);
assert.equal((await verifyPinCredential(pin, 'not-a-credential', 'main')).valid, false);
assert.equal((await verifyPinCredential(pin, JSON.stringify({
  ...parsedMain,
  iterations: 1,
}), 'main')).valid, false);
assert.equal((await verifyPinCredential(pin, JSON.stringify({
  ...parsedMain,
  domain: 'unknown',
}), 'main')).valid, false);
assert.equal((await verifyPinCredential(pin, JSON.stringify({
  ...parsedMain,
  hash: '***',
}), 'main')).valid, false);

console.log('PIN credential tests passed');