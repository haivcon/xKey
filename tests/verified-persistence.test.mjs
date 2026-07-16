import assert from 'node:assert/strict';
import { persistAndVerify } from '../src/utils/storage/verifiedPersistence.ts';

const events = [];
await persistAndVerify('cipher-v2', {
  write: async value => {
    events.push(`write:${value}`);
  },
  read: async () => {
    events.push('read');
    return 'cipher-v2';
  },
});
assert.deepEqual(events, ['write:cipher-v2', 'read']);

let readAfterWriteFailure = false;
await assert.rejects(
  persistAndVerify('cipher-v2', {
    write: async () => {
      throw new Error('filesystem unavailable');
    },
    read: async () => {
      readAfterWriteFailure = true;
      return 'cipher-v2';
    },
  }),
  /filesystem unavailable/,
);
assert.equal(readAfterWriteFailure, false);

await assert.rejects(
  persistAndVerify('cipher-v2', {
    write: async () => {},
    read: async () => {
      throw new Error('read-back unavailable');
    },
  }),
  /read-back unavailable/,
);

await assert.rejects(
  persistAndVerify('cipher-v2', {
    write: async () => {},
    read: async () => 'stale-cipher',
  }),
  /Vault persistence verification failed/,
);

await assert.rejects(
  persistAndVerify('cipher-v2', {
    write: async () => {},
    read: async () => null,
  }),
  /Vault persistence verification failed/,
);

console.log('Verified persistence fault-injection tests passed');