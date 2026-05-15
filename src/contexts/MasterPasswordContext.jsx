import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

const MasterPasswordContext = createContext(null);

const MP_HASH_KEY = 'xkey_master_password_hash';
const MP_SALT = 'xkey_mp_salt_v1';

/**
 * Hash password with PBKDF2 for storage comparison (never store plaintext)
 */
const hashPassword = (password) => {
  return CryptoJS.PBKDF2(password, MP_SALT, { keySize: 256 / 32, iterations: 10000 }).toString();
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
    const hash = hashPassword(password);
    await Preferences.set({ key: MP_HASH_KEY, value: hash });
    setHasMP(true);
    setVerified(true);
  }, []);

  /**
   * Verify the master password
   */
  const verifyMasterPassword = useCallback(async (password) => {
    const { value: storedHash } = await Preferences.get({ key: MP_HASH_KEY });
    if (!storedHash) return true; // No MP set
    const inputHash = hashPassword(password);
    const ok = inputHash === storedHash;
    if (ok) setVerified(true);
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
