import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import CryptoJS from 'crypto-js';
import { runMigrations } from './migration';
import {
    deleteDeviceProtectedVaultKey,
    getDeviceProtectedVaultKey,
    getHardwareSecurityInfo,
    hasDeviceProtectedVaultKey,
    isDeviceCredentialAvailable,
    setDeviceProtectedVaultKey,
} from './deviceCredential';
import CryptoWorker from '../workers/crypto.worker.js?worker';
import { getVaultStorageStatusForKeys, loadVaultCipher, removeVaultFragmentDirectory, saveVaultCipher } from './storage/fragmentedVault';
import type { Wallet } from '../types';
import { inferVanityScoreMetadata } from './vanity/vanityScoreGrade';

export { loadVaultCipher, saveVaultCipher };

const cryptoWorker = new CryptoWorker();

type CryptoWorkerResponse<T> = {
    id: string;
    success: boolean;
    result: T;
    error?: string;
};

const runCryptoWorker = <T = unknown>(type: string, payload: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
        const id = Date.now().toString() + Math.random().toString();
        
        const handler = (e: MessageEvent<CryptoWorkerResponse<T>>) => {
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

export { runCryptoWorker as runCryptoAction };

const STORAGE_KEYS = {
    WALLETS: 'xkey_wallets',
    DECOY_WALLETS: 'xkey_decoy_wallets',
    AES_KEY_FALLBACK: 'xkey_aes_fallback',
    HARDWARE_BOUND_ONLY: 'xkey_hardware_bound_only'
};

const BIOMETRIC_SERVER = 'app.xkey.vault';
const BIOMETRIC_USER = 'xkey_vault';
type VaultKeyError = Error & {
    code: string;
};

const walletSaveQueues = new Map<string, Promise<boolean>>();

const backfillVanityScoreMetadata = (wallets: Wallet[]): { wallets: Wallet[]; migrated: boolean } => {
    let migrated = false;
    const next = wallets.map(wallet => {
        if (!wallet.address) return wallet;
        if (
            wallet.vanityMatchType &&
            typeof wallet.vanityScore === 'number' &&
            wallet.vanityPatternType &&
            (wallet.vanityHeadRun || wallet.vanityTailRun || wallet.vanityRepeatLength)
        ) {
            return wallet;
        }

        const metadata = inferVanityScoreMetadata(wallet);
        if (!metadata) return wallet;
        migrated = true;
        return { ...wallet, ...metadata };
    });

    return { wallets: next, migrated };
};

// Crypto functions migrated to crypto.worker.js

const getStoredFallbackKey = async () => {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
    return value || '';
};

export const isHardwareBoundOnlyEnabled = async () => {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.HARDWARE_BOUND_ONLY });
    return value === 'true';
};

export const setHardwareBoundOnlyMode = async (enabled: boolean, key: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
        throw new Error('Hardware-bound mode is only available on native devices.');
    }
    if (!await isDeviceCredentialAvailable()) {
        throw new Error('Set a device lock before enabling hardware-bound mode.');
    }
    if (!key) {
        throw new Error('Unlock the vault before changing hardware-bound mode.');
    }

    await setDeviceProtectedVaultKey(key);
    if (enabled) {
        await removeFallbackEncryptionKey();
        await Preferences.set({ key: STORAGE_KEYS.HARDWARE_BOUND_ONLY, value: 'true' });
    } else {
        await Preferences.set({ key: STORAGE_KEYS.HARDWARE_BOUND_ONLY, value: 'false' });
        await persistFallbackEncryptionKey(key);
    }
    return true;
};

const waitForPendingWalletSave = async (storageKey: string): Promise<void> => {
    const pending = walletSaveQueues.get(storageKey);
    if (pending) await pending.catch(() => {});
};

const getStoredVaultCipher = async (): Promise<string> => {
    await waitForPendingWalletSave(STORAGE_KEYS.WALLETS);
    const { value } = await loadVaultCipher(STORAGE_KEYS.WALLETS);
    return value || '';
};

export const getVaultStorageStatus = async () => {
    return getVaultStorageStatusForKeys(STORAGE_KEYS.WALLETS, STORAGE_KEYS.DECOY_WALLETS);
};

const recoverDeviceCredentialKey = async (): Promise<string> => {
    const fallbackKey = await getStoredFallbackKey();
    if (!fallbackKey) return '';
    await deleteDeviceProtectedVaultKey().catch(() => {});
    await setDeviceProtectedVaultKey(fallbackKey);
    return fallbackKey;
};

const vaultKeyError = (code: string, message: string): VaultKeyError => Object.assign(new Error(message), { code });

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

export const getVaultSecurityStatus = async () => {
    const native = Capacitor.isNativePlatform();
    const deviceCredentialAvailable = native ? await isDeviceCredentialAvailable().catch(() => false) : false;
    const deviceProtected = deviceCredentialAvailable ? await hasDeviceProtectedVaultKey().catch(() => false) : false;
    const fallback = await hasFallbackEncryptionKey().catch(() => false);
    const hardwareBoundOnly = await isHardwareBoundOnlyEnabled().catch(() => false);
    const hardwareInfo = native ? await getHardwareSecurityInfo().catch(() => null) : null;
    let vaultExists;
    let vaultStorageError = false;
    try {
        vaultExists = !!(await getStoredVaultCipher());
    } catch {
        vaultExists = true;
        vaultStorageError = true;
    }
    const storage = await getVaultStorageStatus().catch(() => ({
        ramOnlyDecrypted: true,
        plaintextDiskWrite: false,
        fragmentedStorage: false,
        fragmentedStorageHealthy: false,
        legacyStorage: false,
        legacyOverride: false,
        fragmentCount: 0,
    }));

    let mode = 'web-fallback';
    if (native && deviceCredentialAvailable && deviceProtected && hardwareBoundOnly && !fallback) mode = 'hardware-bound';
    else if (native && deviceCredentialAvailable && deviceProtected && !fallback) mode = 'android-secure';
    else if (native && deviceCredentialAvailable && deviceProtected && fallback) mode = 'compatibility';
    else if (native && deviceCredentialAvailable) mode = 'device-ready';
    else if (native) mode = 'native-fallback';

    return {
        mode,
        native,
        vaultExists,
        deviceCredentialAvailable,
        deviceProtected,
        fallback,
        hardwareBoundOnly,
        hardwareInfo,
        storage,
        vaultStorageError,
    };
};

export const persistFallbackEncryptionKey = async (key: string): Promise<boolean> => {
    if (!key) return false;
    if (await isHardwareBoundOnlyEnabled().catch(() => false)) return false;
    await Preferences.set({ key: STORAGE_KEYS.AES_KEY_FALLBACK, value: key });
    return true;
};

export const removeFallbackEncryptionKey = async () => {
    await Preferences.remove({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
};

export const persistBiometricEncryptionKey = async (key: string): Promise<boolean> => {
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
export const getEncryptionKeyBiometric = async (): Promise<string> => {
    if (!Capacitor.isNativePlatform()) {
        return getEncryptionKeyFallback();
    }

    if (await isDeviceCredentialAvailable()) {
        if (await hasDeviceProtectedVaultKey()) {
            try {
                const key = await getDeviceProtectedVaultKey();
                if (key) {
                    if (!await isHardwareBoundOnlyEnabled().catch(() => false)) {
                        await persistFallbackEncryptionKey(key);
                    }
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

        const hardwareBoundOnly = await isHardwareBoundOnlyEnabled().catch(() => false);
        const fallbackKey = hardwareBoundOnly ? '' : await getStoredFallbackKey();
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

        const newKey = await runCryptoWorker<string>('GENERATE_KEY', {});
        await setDeviceProtectedVaultKey(newKey);
        if (!hardwareBoundOnly) {
            await persistFallbackEncryptionKey(newKey);
        }
        return newKey;
    }

    return getLegacyBiometricKey();
};

const getLegacyBiometricKey = async (): Promise<string> => {
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
        const nativeError = err as { message?: string; code?: string };
        const msg = (nativeError.message || '').toLowerCase();
        const code = (nativeError.code || '').toLowerCase();
        if (msg.includes('itemnotfound') || msg.includes('not found') || msg.includes('no credentials') || code === 'itemnotfound') {
            const { value: fallbackKey } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
            const newKey = fallbackKey || await runCryptoWorker<string>('GENERATE_KEY', {});
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
export const getEncryptionKeyFallback = async ({ createIfMissing = true }: { createIfMissing?: boolean } = {}): Promise<string> => {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
    if (value) return value;

    if (Capacitor.isNativePlatform() && await isHardwareBoundOnlyEnabled()) {
        throw new Error('Hardware-bound mode requires this device lock to unlock the vault.');
    }

    if (!createIfMissing) {
        throw new Error('PIN unlock is not configured for this vault.');
    }
    const newKey = await runCryptoWorker<string>('GENERATE_KEY', {});
    await persistFallbackEncryptionKey(newKey);
    return newKey;
};

/**
 * Save encrypted wallets with double-layer field encryption.
 * Sensitive fields (privateKey, seedPhrase) are encrypted individually
 * before the entire array is encrypted.
 */
export const saveWallets = async (wallets: Wallet[], key: string | null, isDecoy = false): Promise<boolean> => {
    const storageKey = isDecoy ? STORAGE_KEYS.DECOY_WALLETS : STORAGE_KEYS.WALLETS;
    const previous = walletSaveQueues.get(storageKey) || Promise.resolve();

    const saveTask = previous.catch(() => {}).then(async () => {
        const encrypted = await runCryptoWorker<string>('ENCRYPT_WALLETS', { wallets, key });
        await saveVaultCipher(storageKey, encrypted);
        if (!isDecoy) await Preferences.set({ key: 'xkey_vault_last_changed_at', value: new Date().toISOString() });
        return true;
    }).catch((e) => {
        console.error('Failed to save wallets', e);
        return false;
    });

    const queuedTask = saveTask.finally(() => {
        if (walletSaveQueues.get(storageKey) === queuedTask) {
            walletSaveQueues.delete(storageKey);
        }
    });
    walletSaveQueues.set(storageKey, queuedTask);

    try {
        return await saveTask;
    } catch (e) {
        console.error('Failed to save wallets', e);
        return false;
    }
};

/**
 * Load encrypted wallets, run migrations, and decrypt field-level encryption.
 */
export const loadWallets = async (key: string | null, isDecoy = false): Promise<Wallet[]> => {
    const storageKey = isDecoy ? STORAGE_KEYS.DECOY_WALLETS : STORAGE_KEYS.WALLETS;
    await waitForPendingWalletSave(storageKey);
    const { value, source } = await loadVaultCipher(storageKey);
    if (!value) return [];
    
    let wallets = await runCryptoWorker<Wallet[]>('DECRYPT_WALLETS', { cipherText: value, key });
    const preMigrationWallets = wallets;
    
    // Run schema migrations
    const { wallets: migrated, migrated: didMigrate, dryRun } = await runMigrations(wallets);
    wallets = migrated;
    
    const { wallets: vanityBackfilled, migrated: didBackfillVanity } = backfillVanityScoreMetadata(wallets);
    wallets = vanityBackfilled;
    
    // If migration happened, create an encrypted rollback snapshot before re-saving.
    if (didMigrate || didBackfillVanity) {
        if (didMigrate) {
            const { createEncryptedVaultSnapshot } = await import('./vaultSnapshot');
            await createEncryptedVaultSnapshot(preMigrationWallets, key, {
                operation: 'migration',
                schemaVersion: dryRun.targetSchema,
                reason: `dry_run:${dryRun.changes.map(change => change.code).join(',')}`,
            });
        }
        await saveWallets(wallets, key, isDecoy);
    } else if (source === 'legacy' && Capacitor.isNativePlatform()) {
        await saveVaultCipher(storageKey, value);
    }
    
    return wallets;
};

/**
 * Encrypt a setting value before storing in Preferences.
 * Uses the vault AES key so settings are tied to the vault.
 */
export const encryptSetting = (value: string | null, key: string | null): string => {
    if (!value || !key) return value || '';
    return CryptoJS.AES.encrypt(value, key).toString();
};

/**
 * Decrypt a setting value read from Preferences.
 */
export const decryptSetting = (cipher: string | null, key: string | null): string => {
    if (!cipher || !key) return cipher || '';
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
    await removeVaultFragmentDirectory();
    await deleteDeviceProtectedVaultKey().catch(() => {});
    if (!Capacitor.isNativePlatform()) return;

    try {
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
    } catch {
        // Ignore if credential doesn't exist
    }
};
