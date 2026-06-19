import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

const MasterPasswordContext = createContext(null);

const MP_HASH_KEY = 'xkey_master_password_hash';
const MP_SALT = 'xkey_mp_salt_v1';
const MP_VERSION = 2;
const MP_ITERATIONS = 210000;

/**
 * Hash password with PBKDF2 for storage comparison (never store plaintext)
 */
const randomSalt = () => CryptoJS.lib.WordArray.random(16).toString();

const bytesToHex = (bytes) => Array.from(new Uint8Array(bytes))
  .map(byte => byte.toString(16).padStart(2, '0'))
  .join('');

const pbkdf2Hex = async (password, salt, iterations) => {
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

const hashPassword = async (password, salt = randomSalt(), iterations = MP_ITERATIONS) => {
  const hash = await pbkdf2Hex(password, salt, iterations);
  return { version: MP_VERSION, salt, iterations, hash };
};

const hashLegacyPassword = (password) => pbkdf2Hex(password, MP_SALT, 10000);

const parseStoredHash = (value) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.version && parsed?.salt && parsed?.iterations && parsed?.hash) return parsed;
  } catch {
    // Legacy hashes are stored as raw hex strings.
  }
  return { version: 1, legacy: true, hash: value };
};

export function useMasterPassword() {
  return useContext(MasterPasswordContext);
}

export function MasterPasswordProvider({ children }) {
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
  const setMasterPassword = useCallback(async (password) => {
    const record = await hashPassword(password);
    await Preferences.set({ key: MP_HASH_KEY, value: JSON.stringify(record) });
    setHasMP(true);
    setVerified(true);
  }, []);

  /**
   * Verify the master password
   */
  const verifyMasterPassword = useCallback(async (password) => {
    const { value: storedHash } = await Preferences.get({ key: MP_HASH_KEY });
    if (!storedHash) return true; // No MP set
    const stored = parseStoredHash(storedHash);
    if (!stored) return false;

    const inputHash = stored.legacy
      ? await hashLegacyPassword(password)
      : (await hashPassword(password, stored.salt, stored.iterations)).hash;
    const ok = inputHash === stored.hash;
    if (ok) {
      setVerified(true);
      if (stored.legacy || stored.iterations < MP_ITERATIONS) {
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
