import CryptoJS from 'crypto-js';

/**
 * Generate a random 32-char string for AES
 */
const generateRandomKey = () => {
    return CryptoJS.lib.WordArray.random(32).toString();
};

/**
 * Derive a secondary key from the primary key for per-field encryption.
 */
const deriveFieldKey = (primaryKey) => {
    return CryptoJS.HmacSHA256(primaryKey, 'xkey_field_salt_v1').toString();
};

/**
 * Encrypt a single sensitive field
 */
const encryptField = (value, fieldKey) => {
    if (!value) return value;
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
        const raw = cipher.slice(4);
        const bytes = CryptoJS.AES.decrypt(raw, fieldKey);
        const result = bytes.toString(CryptoJS.enc.Utf8);
        return result || cipher;
    } catch {
        return cipher;
    }
};

/**
 * Encrypt whole array
 */
const encryptData = (data, key) => {
    if (!key) throw new Error("Key required for encryption");
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

/**
 * Decrypt whole array
 */
const decryptData = (cipherText, key) => {
    if (!key) throw new Error("Key required for decryption");
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, key);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) throw new Error("Invalid Key");
        return JSON.parse(decryptedStr);
    } catch {
        throw new Error("Invalid Key or corrupted data");
    }
};

self.onmessage = (e) => {
    const { type, payload, id } = e.data;

    try {
        switch (type) {
            case 'ENCRYPT_WALLETS': {
                const { wallets, key } = payload;
                const fieldKey = deriveFieldKey(key);
                
                // Double-encrypt sensitive fields
                const protected_ = wallets.map(w => ({
                    ...w,
                    privateKey: encryptField(w.privateKey, fieldKey),
                    seedPhrase: encryptField(w.seedPhrase, fieldKey),
                    _fieldEncrypted: true,
                }));
                
                const encrypted = encryptData(protected_, key);
                self.postMessage({ id, success: true, result: encrypted });
                break;
            }

            case 'DECRYPT_WALLETS': {
                const { cipherText, key } = payload;
                let wallets = decryptData(cipherText, key);
                
                const fieldKey = deriveFieldKey(key);
                wallets = wallets.map(w => ({
                    ...w,
                    privateKey: decryptField(w.privateKey, fieldKey),
                    seedPhrase: decryptField(w.seedPhrase, fieldKey),
                }));
                
                self.postMessage({ id, success: true, result: wallets });
                break;
            }
            
            case 'GENERATE_KEY': {
                const newKey = generateRandomKey();
                self.postMessage({ id, success: true, result: newKey });
                break;
            }

            default:
                throw new Error(`Unknown worker action: ${type}`);
        }
    } catch (err) {
        self.postMessage({ id, success: false, error: err.message });
    }
};
