import { Preferences } from '@capacitor/preferences';
import {
  AUTOLOCK_ENABLED_KEY,
  AUTOLOCK_KEY,
  DEFAULT_MS,
} from '../../hooks/security/useAutoLock';
import { SECRET_COPY_DISABLED_KEY } from '../../utils/dataSensitivity';
import { DEVICE_INTEGRITY_GUARD_KEY } from '../../utils/deviceIntegrity';

export const AUTOMATIC_SECURITY_CONFIG_KEYS = [
  'auto-lock',
  'secret-copy',
  'device-integrity',
] as const;

export type AutomaticSecurityConfigKey = typeof AUTOMATIC_SECURITY_CONFIG_KEYS[number];

export type SecurityConfigImportPayload = {
  app?: string;
  reportType?: string;
  enabled?: Array<{ key?: string }>;
};

export type SecurityConfigPreferenceAdapter = {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<unknown>;
  remove: (options: { key: string }) => Promise<unknown>;
};

export type AppliedSecurityConfig = {
  enabledKeys: Set<string>;
  autoLockEnabled: boolean;
  autoLockMs: number | null;
  secretCopyDisabled: boolean;
  deviceIntegrityGuard: boolean;
};

type PreferenceMutation = {
  key: string;
  value: string;
};

const isValidAutoLockDuration = (value: string | null): value is string => {
  if (!value) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

export const validateSecurityConfigImportPayload = (
  payload: unknown,
): SecurityConfigImportPayload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid security configuration.');
  }

  const record = payload as SecurityConfigImportPayload;
  if (
    record.app !== 'xKey'
    || record.reportType !== 'security-report'
    || !Array.isArray(record.enabled)
    || record.enabled.length > 64
  ) {
    throw new Error('Invalid security configuration.');
  }

  for (const item of record.enabled) {
    if (
      !item
      || typeof item !== 'object'
      || (item.key != null && (typeof item.key !== 'string' || item.key.length > 128))
    ) {
      throw new Error('Invalid security configuration.');
    }
  }

  return record;
};

export const applySecurityConfigImport = async (
  payload: SecurityConfigImportPayload,
  adapter: SecurityConfigPreferenceAdapter = Preferences,
): Promise<AppliedSecurityConfig> => {
  const validated = validateSecurityConfigImportPayload(payload);
  const enabledKeys = new Set(
    validated.enabled
      ?.map(item => item.key)
      .filter((key): key is string => typeof key === 'string') || [],
  );

  const mutations: PreferenceMutation[] = [];
  let autoLockMs: number | null = null;

  if (enabledKeys.has('auto-lock')) {
    const { value: storedDuration } = await adapter.get({ key: AUTOLOCK_KEY });
    const duration = isValidAutoLockDuration(storedDuration)
      ? storedDuration
      : String(DEFAULT_MS);
    autoLockMs = Number(duration);
    mutations.push({ key: AUTOLOCK_ENABLED_KEY, value: 'true' });
    if (!isValidAutoLockDuration(storedDuration)) {
      mutations.push({ key: AUTOLOCK_KEY, value: duration });
    }
  }

  if (enabledKeys.has('secret-copy')) {
    mutations.push({ key: SECRET_COPY_DISABLED_KEY, value: 'true' });
  }

  if (enabledKeys.has('device-integrity')) {
    mutations.push({ key: DEVICE_INTEGRITY_GUARD_KEY, value: 'true' });
  }

  const previousValues = new Map<string, string | null>();
  for (const mutation of mutations) {
    if (!previousValues.has(mutation.key)) {
      const { value } = await adapter.get({ key: mutation.key });
      previousValues.set(mutation.key, value);
    }
  }

  const appliedKeys: string[] = [];
  try {
    for (const mutation of mutations) {
      await adapter.set(mutation);
      appliedKeys.push(mutation.key);
    }
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const key of [...appliedKeys].reverse()) {
      const previous = previousValues.get(key);
      try {
        if (previous == null) await adapter.remove({ key });
        else await adapter.set({ key, value: previous });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }

    if (rollbackErrors.length > 0) {
      throw Object.assign(
        new Error('Security configuration import failed and rollback was incomplete.'),
        { cause: error, rollbackErrors },
      );
    }
    throw error;
  }

  return {
    enabledKeys,
    autoLockEnabled: enabledKeys.has('auto-lock'),
    autoLockMs,
    secretCopyDisabled: enabledKeys.has('secret-copy'),
    deviceIntegrityGuard: enabledKeys.has('device-integrity'),
  };
};