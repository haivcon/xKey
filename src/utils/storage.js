import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import CryptoJS from 'crypto-js';
import { runMigrations } from './migration';
import {
    deleteDeviceProtectedVaultKey,
    getDeviceProtectedVaultKey,
    hasDeviceProtectedVaultKey,
    isDeviceCredentialAvailable,
    setDeviceProtectedVaultKey,
} from './deviceCredential';
import CryptoWorker from '../workers/crypto.worker.js?worker';

const cryptoWorker = new CryptoWorker();

const runCryptoWorker = (type, payload) => {
    return new Promise((resolve, reject) => {
        const id = Date.now().toString() + Math.random().toString();
        
        const handler = (e) => {
            if (e.data.id === id) {
                cryptoWorker.removeEventListener('message', handler);
                if (e.data.success) {
                    resolve(e.data.result);
                } else {
                    reject(new Error(e.data.error));
                }
            }
        };
        
        cryptoWorker.addEventListener('message', handler);
        cryptoWorker.postMessage({ type, payload, id });
    });
};

const STORAGE_KEYS = {
    WALLETS: 'xkey_wallets',
    DECOY_WALLETS: 'xkey_decoy_wallets',
    AES_KEY_FALLBACK: 'xkey_aes_fallback'
};

const BIOMETRIC_SERVER = 'app.xkey.vault';
const BIOMETRIC_USER = 'xkey_vault';

// Crypto functions migrated to crypto.worker.js

const getStoredFallbackKey = async () => {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
    return value || '';
};

const getStoredVaultCipher = async () => {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.WALLETS });
    return value || '';
};

const recoverDeviceCredentialKey = async () => {
    const fallbackKey = await getStoredFallbackKey();
    if (!fallbackKey) return '';
    await deleteDeviceProtectedVaultKey().catch(() => {});
    await setDeviceProtectedVaultKey(fallbackKey);
    return fallbackKey;
};

const vaultKeyError = (code, message) => Object.assign(new Error(message), { code });

/**
 * Check if native biometric/face authentication hardware is available.
 */
export const isBiometricAvailable = async () => {
    if (!Capacitor.isNativePlatform()) return false;
    const hasDeviceCredential = await isDeviceCredentialAvailable();
    if (Capacitor.getPlatform() === 'android') return hasDeviceCredential;
    if (hasDeviceCredential) return true;

    try {
        const result = await NativeBiometric.isAvailable({ useFallback: true });
        return result.isAvailable;
    } catch {
        return false;
    }
};

export const hasFallbackEncryptionKey = async () => {
    return !!(await getStoredFallbackKey());
};

export const persistFallbackEncryptionKey = async (key) => {
    if (!key) return false;
    await Preferences.set({ key: STORAGE_KEYS.AES_KEY_FALLBACK, value: key });
    return true;
};

export const removeFallbackEncryptionKey = async () => {
    await Preferences.remove({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
};

export const persistBiometricEncryptionKey = async (key) => {
    if (!key || !Capacitor.isNativePlatform()) return false;
    try {
        await NativeBiometric.setCredentials({
            username: BIOMETRIC_USER,
            password: key,
            server: BIOMETRIC_SERVER
        });
        return true;
    } catch {
        return false;
    }
};

/**
 * Retrieve the AES Encryption Key using biometric authentication.
 * Only call this when isBiometricAvailable() returns true.
 */
export const getEncryptionKeyBiometric = async () => {
    if (!Capacitor.isNativePlatform()) {
        return getEncryptionKeyFallback();
    }

    if (await isDeviceCredentialAvailable()) {
        if (await hasDeviceProtectedVaultKey()) {
            try {
                const key = await getDeviceProtectedVaultKey();
                if (key) {
                    await persistFallbackEncryptionKey(key);
                    return key;
                }
            } catch (err) {
                const recoveredKey = await recoverDeviceCredentialKey();
                if (recoveredKey) return recoveredKey;
                if (await getStoredVaultCipher()) {
                    throw err;
                }
            }
        }

        const fallbackKey = await getStoredFallbackKey();
        if (fallbackKey) {
            await setDeviceProtectedVaultKey(fallbackKey);
            return fallbackKey;
        }

        try {
            const legacyKey = await getLegacyBiometricKey();
            if (legacyKey) {
                await setDeviceProtectedVaultKey(legacyKey);
                return legacyKey;
            }
        } catch {
            // Continue to new-key creation for a fresh vault.
        }

        if (await getStoredVaultCipher()) {
            throw vaultKeyError(
                'VAULT_KEY_UNRECOVERABLE',
                'Unable to unlock the existing vault with the current device credential.'
            );
        }

        const newKey = await runCryptoWorker('GENERATE_KEY', {});
        await setDeviceProtectedVaultKey(newKey);
        await persistFallbackEncryptionKey(newKey);
        return newKey;
    }

    return getLegacyBiometricKey();
};

const getLegacyBiometricKey = async () => {
    await NativeBiometric.verifyIdentity({
        reason: "Unlock xKey",
        title: "xKey Authentication",
        subtitle: "Verify your identity to access the vault",
        useFallback: true
    });

    try {
        const creds = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER });
        await persistFallbackEncryptionKey(creds.password);
        return creds.password;
    } catch (err) {
        const msg = (err.message || '').toLowerCase();
        const code = (err.code || '').toLowerCase();
        if (msg.includes('itemnotfound') || msg.includes('not found') || msg.includes('no credentials') || code === 'itemnotfound') {
            const { value: fallbackKey } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
            const newKey = fallbackKey || await runCryptoWorker('GENERATE_KEY', {});
            await persistBiometricEncryptionKey(newKey);
            await persistFallbackEncryptionKey(newKey);
            return newKey;
        }
        throw err;
    }
};

/**
 * Retrieve the AES Encryption Key from Preferences (no biometric).
 * Used after the user authenticates via the in-app PIN screen.
 */
export const getEncryptionKeyFallback = async ({ createIfMissing = true } = {}) => {
    if (Capacitor.isNativePlatform() && await isDeviceCredentialAvailable()) {
        return getEncryptionKeyBiometric();
    }

    const { value } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
    if (value) return value;
    if (!createIfMissing) {
        throw new Error('PIN unlock is not configured for this vault.');
    }
    const newKey = await runCryptoWorker('GENERATE_KEY', {});
    await persistFallbackEncryptionKey(newKey);
    return newKey;
};

/**
 * Save encrypted wallets with double-layer field encryption.
 * Sensitive fields (privateKey, seedPhrase) are encrypted individually
 * before the entire array is encrypted.
 */
export const saveWallets = async (wallets, key, isDecoy = false) => {
    try {
        const encrypted = await runCryptoWorker('ENCRYPT_WALLETS', { wallets, key });
        const storageKey = isDecoy ? STORAGE_KEYS.DECOY_WALLETS : STORAGE_KEYS.WALLETS;
        await Preferences.set({ key: storageKey, value: encrypted });
        return true;
    } catch (e) {
        console.error('Failed to save wallets', e);
        return false;
    }
};

/**
 * Load encrypted wallets, run migrations, and decrypt field-level encryption.
 */
export const loadWallets = async (key, isDecoy = false) => {
    const storageKey = isDecoy ? STORAGE_KEYS.DECOY_WALLETS : STORAGE_KEYS.WALLETS;
    const { value } = await Preferences.get({ key: storageKey });
    if (!value) return [];
    
    let wallets = await runCryptoWorker('DECRYPT_WALLETS', { cipherText: value, key });
    
    // Run schema migrations
    const { wallets: migrated, migrated: didMigrate } = await runMigrations(wallets);
    wallets = migrated;
    
    // If migration happened, re-save with new schema + field encryption
    if (didMigrate) {
        await saveWallets(wallets, key, isDecoy);
    }
    
    return wallets;
};

/**
 * Encrypt a setting value before storing in Preferences.
 * Uses the vault AES key so settings are tied to the vault.
 */
export const encryptSetting = (value, key) => {
    if (!value || !key) return value;
    return CryptoJS.AES.encrypt(value, key).toString();
};

/**
 * Decrypt a setting value read from Preferences.
 */
export const decryptSetting = (cipher, key) => {
    if (!cipher || !key) return cipher;
    try {
        const bytes = CryptoJS.AES.decrypt(cipher, key);
        const result = bytes.toString(CryptoJS.enc.Utf8);
        return result || cipher; // Return original if decrypt fails (legacy plaintext)
    } catch {
        return cipher; // Return as-is for backward compatibility
    }
};

/**
 * Wipe all data
 */
export const wipeAllData = async () => {
    await Preferences.clear();
    await deleteDeviceProtectedVaultKey().catch(() => {});
    if (!Capacitor.isNativePlatform()) return;

    try {
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
    } catch {
        // Ignore if credential doesn't exist
    }
};
