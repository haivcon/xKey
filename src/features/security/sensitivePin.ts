import CryptoJS from 'crypto-js';
import { Preferences } from '@capacitor/preferences';
import { appendAuditLog } from '../../utils/auditLog';
import { requestSensitivePinPrompt } from './sensitivePinPrompt';

export const SENSITIVE_PIN_HASH_KEY = 'xkey_sensitive_pin_hash';
export const SENSITIVE_PIN_ATTEMPTS_KEY = 'xkey_sensitive_pin_attempts';
export const SENSITIVE_PIN_LOCK_UNTIL_KEY = 'xkey_sensitive_pin_lock_until';

const PIN_LENGTH = 6;
const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;

export function hashSensitivePin(pin: string): string {
  return CryptoJS.SHA256(`${pin}:xkey_sensitive_pin_salt_v1`).toString();
}

export function isValidSensitivePin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function isSensitivePinEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: SENSITIVE_PIN_HASH_KEY });
  return !!value;
}

export async function setSensitivePin(pin: string): Promise<void> {
  if (!isValidSensitivePin(pin)) {
    throw new Error('Sensitive PIN must be 6 digits.');
  }

  await Promise.all([
    Preferences.set({ key: SENSITIVE_PIN_HASH_KEY, value: hashSensitivePin(pin) }),
    Preferences.set({ key: SENSITIVE_PIN_ATTEMPTS_KEY, value: '0' }),
    Preferences.remove({ key: SENSITIVE_PIN_LOCK_UNTIL_KEY }),
  ]);

  await appendAuditLog('security.sensitive_pin_enabled').catch(() => {});
}

export async function removeSensitivePin(): Promise<void> {
  await Promise.all([
    Preferences.remove({ key: SENSITIVE_PIN_HASH_KEY }),
    Preferences.remove({ key: SENSITIVE_PIN_ATTEMPTS_KEY }),
    Preferences.remove({ key: SENSITIVE_PIN_LOCK_UNTIL_KEY }),
  ]);

  await appendAuditLog('security.sensitive_pin_disabled').catch(() => {});
}

export function getSensitivePinRemainingAttempts(attempts: number): number {
  return Math.max(0, MAX_ATTEMPTS_BEFORE_LOCK - attempts);
}

export async function getSensitivePinAttempts(): Promise<number> {
  const { value } = await Preferences.get({ key: SENSITIVE_PIN_ATTEMPTS_KEY });
  const attempts = Number.parseInt(value || '0', 10);
  return Number.isFinite(attempts) ? attempts : 0;
}

export async function getSensitivePinLockUntil(): Promise<number> {
  const { value } = await Preferences.get({ key: SENSITIVE_PIN_LOCK_UNTIL_KEY });
  const lockUntil = Number.parseInt(value || '0', 10);
  return Number.isFinite(lockUntil) ? lockUntil : 0;
}

export async function verifySensitivePin(pin: string): Promise<boolean> {
  const lockUntil = await getSensitivePinLockUntil();
  if (lockUntil > Date.now()) {
    await appendAuditLog('security.sensitive_pin_locked').catch(() => {});
    return false;
  }

  const { value: storedHash } = await Preferences.get({ key: SENSITIVE_PIN_HASH_KEY });
  if (!storedHash) return true;

  const ok = isValidSensitivePin(pin) && hashSensitivePin(pin) === storedHash;
  if (ok) {
    await Promise.all([
      Preferences.set({ key: SENSITIVE_PIN_ATTEMPTS_KEY, value: '0' }),
      Preferences.remove({ key: SENSITIVE_PIN_LOCK_UNTIL_KEY }),
    ]);
    await appendAuditLog('security.sensitive_pin_success').catch(() => {});
    return true;
  }

  const attempts = await getSensitivePinAttempts() + 1;
  const writes = [
    Preferences.set({ key: SENSITIVE_PIN_ATTEMPTS_KEY, value: String(attempts) }),
  ];

  if (attempts >= MAX_ATTEMPTS_BEFORE_LOCK) {
    writes.push(Preferences.set({
      key: SENSITIVE_PIN_LOCK_UNTIL_KEY,
      value: String(Date.now() + LOCK_DURATION_MS),
    }));
  }

  await Promise.all(writes);
  await appendAuditLog('security.sensitive_pin_failed', { attempts }).catch(() => {});
  return false;
}

export async function requireSensitivePin(reason = 'Confirm sensitive action'): Promise<boolean> {
  if (!await isSensitivePinEnabled()) return true;

  const modalResult = requestSensitivePinPrompt({ reason });
  if (modalResult) return modalResult;

  await appendAuditLog('security.sensitive_pin_unavailable').catch(() => {});
  return false;
}
