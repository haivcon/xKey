import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

type StoredPasswordRecordV2 = {
  version: number;
  salt: string;
  iterations: number;
  hash: string;
  legacy?: false;
};

type StoredPasswordRecordLegacy = {
  version: 1;
  legacy: true;
  hash: string;
};

type StoredPasswordRecord = StoredPasswordRecordV2 | StoredPasswordRecordLegacy;

type MasterPasswordContextValue = {
  hasMasterPassword: boolean;
  isVerified: boolean;
  loaded: boolean;
  setMasterPassword: (password: string) => Promise<void>;
  verifyMasterPassword: (password: string) => Promise<boolean>;
  removeMasterPassword: () => Promise<void>;
  resetVerification: () => void;
};

const MasterPasswordContext = createContext<MasterPasswordContextValue | null>(null);

const MP_HASH_KEY = 'xkey_master_password_hash';
const MP_SALT = 'xkey_mp_salt_v1';
const MP_VERSION = 2;
const MP_ITERATIONS = 210000;

/**
 * Hash password with PBKDF2 for storage comparison (never store plaintext)
 */
const randomSalt = (): string => CryptoJS.lib.WordArray.random(16).toString();

const bytesToHex = (bytes: ArrayBuffer): string => Array.from(new Uint8Array(bytes))
  .map(byte => byte.toString(16).padStart(2, '0'))
  .join('');

const pbkdf2Hex = async (password: string, salt: string, iterations: number): Promise<string> => {
  if (globalThis.crypto?.subtle) {
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: new TextEncoder().encode(salt),
        iterations,
      },
      key,
      256
    );
    return bytesToHex(bits);
  }
  return CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations }).toString();
};

const hashPassword = async (password: string, salt = randomSalt(), iterations = MP_ITERATIONS): Promise<StoredPasswordRecordV2> => {
  const hash = await pbkdf2Hex(password, salt, iterations);
  return { version: MP_VERSION, salt, iterations, hash };
};

const hashLegacyPassword = (password: string): Promise<string> => pbkdf2Hex(password, MP_SALT, 10000);

const isStoredPasswordRecordV2 = (value: unknown): value is StoredPasswordRecordV2 => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<StoredPasswordRecordV2>;
  return !!record.version
    && typeof record.salt === 'string'
    && Number.isFinite(record.iterations)
    && typeof record.hash === 'string';
};

const isLegacyRecord = (record: StoredPasswordRecord): record is StoredPasswordRecordLegacy => (
  record.legacy === true
);

const parseStoredHash = (value: string | null): StoredPasswordRecord | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (isStoredPasswordRecordV2(parsed)) return parsed;
  } catch {
    // Legacy hashes are stored as raw hex strings.
  }
  return { version: 1, legacy: true, hash: value };
};

export function useMasterPassword(): MasterPasswordContextValue {
  const ctx = useContext(MasterPasswordContext);
  if (!ctx) throw new Error('useMasterPassword must be used within MasterPasswordProvider');
  return ctx;
}

export function MasterPasswordProvider({ children }: { children: ReactNode }) {
  const [hasMP, setHasMP] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load on mount — check if master password exists
  useEffect(() => {
    Preferences.get({ key: MP_HASH_KEY }).then(({ value }) => {
      setHasMP(!!value);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  /**
   * Set a new master password
   */
  const setMasterPassword = useCallback(async (password: string) => {
    const record = await hashPassword(password);
    await Preferences.set({ key: MP_HASH_KEY, value: JSON.stringify(record) });
    setHasMP(true);
    setVerified(true);
  }, []);

  /**
   * Verify the master password
   */
  const verifyMasterPassword = useCallback(async (password: string) => {
    const { value: storedHash } = await Preferences.get({ key: MP_HASH_KEY });
    if (!storedHash) return true; // No MP set
    const stored = parseStoredHash(storedHash);
    if (!stored) return false;

    const inputHash = isLegacyRecord(stored)
      ? await hashLegacyPassword(password)
      : (await hashPassword(password, stored.salt, stored.iterations)).hash;
    const ok = inputHash === stored.hash;
    if (ok) {
      setVerified(true);
      if (isLegacyRecord(stored) || stored.iterations < MP_ITERATIONS) {
        const upgraded = await hashPassword(password);
        await Preferences.set({ key: MP_HASH_KEY, value: JSON.stringify(upgraded) });
      }
    }
    return ok;
  }, []);

  /**
   * Remove master password
   */
  const removeMasterPassword = useCallback(async () => {
    await Preferences.remove({ key: MP_HASH_KEY });
    setHasMP(false);
    setVerified(false);
  }, []);

  /**
   * Reset verification (e.g. on auto-lock)
   */
  const resetVerification = useCallback(() => {
    setVerified(false);
  }, []);

  return (
    <MasterPasswordContext.Provider value={{
      hasMasterPassword: hasMP,
      isVerified: verified || !hasMP,
      loaded,
      setMasterPassword,
      verifyMasterPassword,
      removeMasterPassword,
      resetVerification,
    }}>
      {children}
    </MasterPasswordContext.Provider>
  );
}
