import assert from 'node:assert/strict';
import {
  applySecurityConfigImport,
  validateSecurityConfigImportPayload,
} from '../src/features/security/securityConfigImport.ts';
import {
  AUTOLOCK_ENABLED_KEY,
  AUTOLOCK_KEY,
  DEFAULT_MS,
} from '../src/hooks/security/useAutoLock.ts';
import { SECRET_COPY_DISABLED_KEY } from '../src/utils/dataSensitivity.ts';
import { DEVICE_INTEGRITY_GUARD_KEY } from '../src/utils/deviceIntegrity.ts';

const validPayload = {
  app: 'xKey',
  reportType: 'security-report',
  enabled: [
    { key: 'auto-lock' },
    { key: 'secret-copy' },
    { key: 'device-integrity' },
    { key: 'hardware-bound' },
  ],
};

const createAdapter = (initial = {}, failOnSetKey = '') => {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values,
    writes,
    adapter: {
      async get({ key }) {
        return { value: values.get(key) ?? null };
      },
      async set({ key, value }) {
        writes.push({ type: 'set', key, value });
        if (key === failOnSetKey) throw new Error(`Injected failure: ${key}`);
        values.set(key, value);
      },
      async remove({ key }) {
        writes.push({ type: 'remove', key });
        values.delete(key);
      },
    },
  };
};

assert.equal(
  validateSecurityConfigImportPayload(validPayload).reportType,
  'security-report',
);
assert.throws(
  () => validateSecurityConfigImportPayload(null),
  /Invalid security configuration/,
);
assert.throws(
  () => validateSecurityConfigImportPayload({
    app: 'other',
    reportType: 'security-report',
    enabled: [],
  }),
  /Invalid security configuration/,
);
assert.throws(
  () => validateSecurityConfigImportPayload({
    app: 'xKey',
    reportType: 'security-report',
    enabled: Array.from({ length: 65 }, () => ({ key: 'auto-lock' })),
  }),
  /Invalid security configuration/,
);

// Preserve a valid user-selected one-minute timeout.
{
  const memory = createAdapter({
    [AUTOLOCK_ENABLED_KEY]: 'false',
    [AUTOLOCK_KEY]: '60000',
    [SECRET_COPY_DISABLED_KEY]: 'false',
    [DEVICE_INTEGRITY_GUARD_KEY]: 'false',
  });
  const applied = await applySecurityConfigImport(validPayload, memory.adapter);

  assert.equal(applied.autoLockMs, 60000);
  assert.equal(memory.values.get(AUTOLOCK_ENABLED_KEY), 'true');
  assert.equal(memory.values.get(AUTOLOCK_KEY), '60000');
  assert.equal(memory.values.get(SECRET_COPY_DISABLED_KEY), 'true');
  assert.equal(memory.values.get(DEVICE_INTEGRITY_GUARD_KEY), 'true');
  assert.equal(
    memory.writes.some(write => write.key === AUTOLOCK_KEY),
    false,
    'valid auto-lock duration must not be overwritten',
  );
}

// Only initialize the duration when it is missing or invalid.
{
  const memory = createAdapter();
  const applied = await applySecurityConfigImport({
    app: 'xKey',
    reportType: 'security-report',
    enabled: [{ key: 'auto-lock' }],
  }, memory.adapter);

  assert.equal(applied.autoLockMs, DEFAULT_MS);
  assert.equal(memory.values.get(AUTOLOCK_ENABLED_KEY), 'true');
  assert.equal(memory.values.get(AUTOLOCK_KEY), String(DEFAULT_MS));
}

// A write failure must restore all settings already committed by this import.
{
  const initial = {
    [AUTOLOCK_ENABLED_KEY]: 'false',
    [AUTOLOCK_KEY]: '60000',
    [SECRET_COPY_DISABLED_KEY]: 'false',
    [DEVICE_INTEGRITY_GUARD_KEY]: 'false',
  };
  const memory = createAdapter(initial, DEVICE_INTEGRITY_GUARD_KEY);

  await assert.rejects(
    applySecurityConfigImport(validPayload, memory.adapter),
    /Injected failure/,
  );

  assert.deepEqual(Object.fromEntries(memory.values), initial);
}

// Manual/unknown settings are reported but never automatically mutated.
{
  const memory = createAdapter();
  const applied = await applySecurityConfigImport({
    app: 'xKey',
    reportType: 'security-report',
    enabled: [
      { key: 'hardware-bound' },
      { key: 'master-password' },
      { key: 'unknown-setting' },
    ],
  }, memory.adapter);

  assert.equal(applied.enabledKeys.has('hardware-bound'), true);
  assert.equal(memory.writes.length, 0);
  assert.equal(memory.values.size, 0);
}

console.log('Security config import transaction tests passed');