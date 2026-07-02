import assert from 'node:assert/strict';

if (!globalThis.crypto) {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto;
}

const {
  ENTROPY_HEALTH_MIN_BYTES,
  assertEntropyQuality,
} = await import('../src/utils/crypto/entropyUtils.ts');

const healthy = assertEntropyQuality(globalThis.crypto);
assert.equal(healthy.ok, true);
assert.equal(healthy.source, 'crypto.getRandomValues');
assert.equal(healthy.sampleBytes >= ENTROPY_HEALTH_MIN_BYTES, true);
assert.equal(healthy.details.length, 0);
assert.equal(healthy.uniqueBytes > 1, true);

const missing = assertEntropyQuality({});
assert.equal(missing.ok, false);
assert.equal(missing.source, 'unavailable');
assert.deepEqual(missing.details, ['missing-getRandomValues']);

const allZero = assertEntropyQuality({
  getRandomValues(bytes) {
    bytes.fill(0);
    return bytes;
  },
});
assert.equal(allZero.ok, false);
assert.ok(allZero.details.includes('all-zero-sample'));
assert.ok(allZero.details.includes('too-few-unique-bytes'));
assert.ok(allZero.details.includes('repeated-byte-pattern'));

const repeated = assertEntropyQuality({
  getRandomValues(bytes) {
    bytes.fill(7);
    bytes[bytes.length - 1] = 8;
    return bytes;
  },
});
assert.equal(repeated.ok, false);
assert.ok(repeated.details.includes('repeated-byte-pattern'));

const monotonic = assertEntropyQuality({
  getRandomValues(bytes) {
    bytes.forEach((_, index) => {
      bytes[index] = index & 0xff;
    });
    return bytes;
  },
});
assert.equal(monotonic.ok, false);
assert.ok(monotonic.details.includes('monotonic-byte-pattern'));

const unexpectedReturn = assertEntropyQuality({
  getRandomValues(bytes) {
    bytes.forEach((_, index) => {
      bytes[index] = (index * 37 + 11) & 0xff;
    });
    return new Uint8Array(bytes.length);
  },
});
assert.equal(unexpectedReturn.ok, false);
assert.ok(unexpectedReturn.details.includes('unexpected-return-buffer'));

const tooSmallSample = assertEntropyQuality(globalThis.crypto, 1);
assert.equal(tooSmallSample.sampleBytes, ENTROPY_HEALTH_MIN_BYTES);

console.log('entropy-quality tests passed');