import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import CryptoJS from 'crypto-js';
import { runMigrations } from './migration';

const STORAGE_KEYS = {
    WALLETS: 'xkey_wallets',
    DECOY_WALLETS: 'xkey_decoy_wallets',
    AES_KEY_FALLBACK: 'xkey_aes_fallback'
};

const BIOMETRIC_SERVER = 'app.xkey.vault';
const BIOMETRIC_USER = 'xkey_vault';

/**
 * Generate a random 32-char string for AES
 */
const generateRandomKey = () => {
    return CryptoJS.lib.WordArray.random(32).toString();
};

/**
 * Derive a secondary key from the primary key for per-field encryption.
 * This means even if the outer encryption is broken, PK/Seed are still protected.
 */
const deriveFieldKey = (primaryKey) => {
    return CryptoJS.HmacSHA256(primaryKey, 'xkey_field_salt_v1').toString();
};

/**
 * Encrypt a single sensitive field (privateKey, seedPhrase)
 */
const encryptField = (value, fieldKey) => {
    if (!value) return value;
    // Prefix with 'xkf:' to identify already-encrypted fields
    if (typeof value === 'string' && value.startsWith('xkf:')) return value;
    return 'xkf:' + CryptoJS.AES.encrypt(value, fieldKey).toString();
};

/**
 * Decrypt a single sensitive field
 */
const decryptField = (cipher, fieldKey) => {
    if (!cipher) return cipher;
    if (typeof cipher !== 'string' || !cipher.startsWith('xkf:')) return cipher;
    try {
        const raw = cipher.slice(4); // Remove 'xkf:' prefix
        const bytes = CryptoJS.AES.decrypt(raw, fieldKey);
        const result = bytes.toString(CryptoJS.enc.Utf8);
        return result || cipher; // Return original if decrypt fails
    } catch {
        return cipher;
    }
};

/**
 * Check if native biometric/face authentication hardware is available.
 */
export const isBiometricAvailable = async () => {
    try {
        const result = await NativeBiometric.isAvailable();
        return result.isAvailable;
    } catch {
        return false;
    }
};

/**
 * Retrieve the AES Encryption Key using biometric authentication.
 * Only call this when isBiometricAvailable() returns true.
 */
export const getEncryptionKeyBiometric = async () => {
    await NativeBiometric.verifyIdentity({
        reason: "Unlock xKey",
        title: "xKey Authentication",
        subtitle: "Verify your identity to access the vault",
        useFallback: true
    });

    try {
        const creds = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER });
        return creds.password;
    } catch (err) {
        const msg = (err.message || '').toLowerCase();
        const code = (err.code || '').toLowerCase();
        if (msg.includes('itemnotfound') || msg.includes('not found') || msg.includes('no credentials') || code === 'itemnotfound') {
            const newKey = generateRandomKey();
            await NativeBiometric.setCredentials({
                username: BIOMETRIC_USER,
                password: newKey,
                server: BIOMETRIC_SERVER
            });
            return newKey;
        }
        throw err;
    }
};

/**
 * Retrieve the AES Encryption Key from Preferences (no biometric).
 * Used after the user authenticates via the in-app PIN screen.
 */
export const getEncryptionKeyFallback = async () => {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
    if (value) return value;
    const newKey = generateRandomKey();
    await Preferences.set({ key: STORAGE_KEYS.AES_KEY_FALLBACK, value: newKey });
    return newKey;
};

/**
 * Encrypt data before saving to preferences
 */
const encryptData = (data, key) => {
    if (!key) throw new Error("Key required for encryption");
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

/**
 * Decrypt data retrieved from preferences
 */
const decryptData = (cipherText, key) => {
    if (!key) throw new Error("Key required for decryption");
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, key);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) throw new Error("Invalid Key");
        return JSON.parse(decryptedStr);
    } catch (e) {
        throw new Error("Invalid Key or corrupted data");
    }
};

/**
 * Save encrypted wallets with double-layer field encryption.
 * Sensitive fields (privateKey, seedPhrase) are encrypted individually
 * before the entire array is encrypted.
 */
export const saveWallets = async (wallets, key, isDecoy = false) => {
    try {
        const fieldKey = deriveFieldKey(key);
        // Double-encrypt sensitive fields
        const protected_ = wallets.map(w => ({
            ...w,
            privateKey: encryptField(w.privateKey, fieldKey),
            seedPhrase: encryptField(w.seedPhrase, fieldKey),
            _fieldEncrypted: true,
        }));
        const encrypted = encryptData(protected_, key);
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
    
    let wallets = decryptData(value, key);
    
    // Run schema migrations
    const { wallets: migrated, migrated: didMigrate } = await runMigrations(wallets);
    wallets = migrated;
    
    // Decrypt field-level encryption
    const fieldKey = deriveFieldKey(key);
    wallets = wallets.map(w => ({
        ...w,
        privateKey: decryptField(w.privateKey, fieldKey),
        seedPhrase: decryptField(w.seedPhrase, fieldKey),
    }));
    
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
    try {
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
    } catch(e) {
        // Ignore if credential doesn't exist
    }
};
