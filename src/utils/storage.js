import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import CryptoJS from 'crypto-js';
import { runMigrations } from './migration';

const STORAGE_KEYS = {
    WALLETS: 'xkey_wallets',
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
 * Retrieve the AES Encryption Key
 * Triggers native Biometric/Lock Screen if available.
 * If no lock screen is set on the device, it falls back to standard Preferences.
 */
export const getEncryptionKey = async () => {
    try {
        const available = await NativeBiometric.isAvailable();
        
        if (available.isAvailable) {
            try {
                // Force the native authentication prompt
                await NativeBiometric.verifyIdentity({
                    reason: "Unlock xKey",
                    title: "xKey Authentication",
                    subtitle: "Log in using your biometric credential",
                    useFallback: true // Allows device PIN if biometrics fail
                });

                // Try to get existing key
                const creds = await NativeBiometric.getCredentials({
                    server: BIOMETRIC_SERVER
                });
                return creds.password;
            } catch (err) {
                // If ItemNotFound or similar, create a new one
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
                // If user canceled the prompt or auth failed
                throw new Error("Biometric authentication failed or canceled.");
            }
        } else {
            // Device has no lock screen / biometrics. Use standard Preferences.
            const { value } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
            if (value) return value;
            
            const newKey = generateRandomKey();
            await Preferences.set({ key: STORAGE_KEYS.AES_KEY_FALLBACK, value: newKey });
            return newKey;
        }
    } catch (e) {
        console.error("Encryption key retrieval error:", e);
        throw e;
    }
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
export const saveWallets = async (wallets, key) => {
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
        await Preferences.set({ key: STORAGE_KEYS.WALLETS, value: encrypted });
        return true;
    } catch (e) {
        console.error('Failed to save wallets', e);
        return false;
    }
};

/**
 * Load encrypted wallets, run migrations, and decrypt field-level encryption.
 */
export const loadWallets = async (key) => {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.WALLETS });
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
        await saveWallets(wallets, key);
    }
    
    return wallets;
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
