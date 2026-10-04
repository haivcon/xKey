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
import { persistAndVerify } from './storage/verifiedPersistence';
import type { Wallet } from '../types';
import { inferVanityScoreMetadata } from './vanity/vanityScoreGrade';
import { VANITY_SCORE_VERSION } from './vanity/vanityMatch';
import {
    decryptVaultEnvelope,
    encryptVaultEnvelope,
    isVaultEnvelope,
} from './crypto/vaultEnvelope';

export { loadVaultCipher, saveVaultCipher };

type CryptoWorkerResponse = {
    id: string;
    success: boolean;
    result?: unknown;
    error?: string;
};

type PendingCryptoRequest = {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
};

const CRYPTO_WORKER_TIMEOUT_MS = 30_000;
const pendingCryptoRequests = new Map<string, PendingCryptoRequest>();
let cryptoWorker: Worker;

const rejectPendingCryptoRequests = (error: Error) => {
    for (const pending of pendingCryptoRequests.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
    }
    pendingCryptoRequests.clear();
};

const attachCryptoWorker = () => {
    const worker = new CryptoWorker();
    worker.addEventListener('message', (event: MessageEvent<CryptoWorkerResponse>) => {
        const pending = pendingCryptoRequests.get(event.data.id);
        if (!pending) return;
        clearTimeout(pending.timeout);
        pendingCryptoRequests.delete(event.data.id);
        if (event.data.success) {
            pending.resolve(event.data.result);
        } else {
            pending.reject(new Error(event.data.error || 'Crypto worker request failed.'));
        }
    });
    worker.addEventListener('error', () => {
        rejectPendingCryptoRequests(new Error('Crypto worker failed.'));
        worker.terminate();
        if (cryptoWorker === worker) cryptoWorker = attachCryptoWorker();
    });
    worker.addEventListener('messageerror', () => {
        rejectPendingCryptoRequests(new Error('Crypto worker returned an invalid response.'));
        worker.terminate();
        if (cryptoWorker === worker) cryptoWorker = attachCryptoWorker();
    });
    return worker;
};

cryptoWorker = attachCryptoWorker();

const runCryptoWorker = <T = unknown>(type: string, payload: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
        const id = globalThis.crypto.randomUUID();
        const timeout = setTimeout(() => {
            const pending = pendingCryptoRequests.get(id);
            if (!pending) return;
            pendingCryptoRequests.delete(id);
            pending.reject(new Error('Crypto worker request timed out.'));
        }, CRYPTO_WORKER_TIMEOUT_MS);

        pendingCryptoRequests.set(id, {
            resolve: value => resolve(value as T),
            reject,
            timeout,
        });

        try {
            cryptoWorker.postMessage({ type, payload, id });
        } catch {
            clearTimeout(timeout);
            pendingCryptoRequests.delete(id);
            reject(new Error('Unable to start crypto worker request.'));
        }
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

const walletSaveQueues = new Map<string, Promise<void>>();

const backfillVanityScoreMetadata = (wallets: Wallet[]): { wallets: Wallet[]; migrated: boolean } => {
    let migrated = false;
    const next = wallets.map(wallet => {
        if (!wallet.address) return wallet;
        if (
            wallet.vanityScoreVersion === VANITY_SCORE_VERSION
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
export type BiometricPromptText = {
    reason: string;
    title: string;
    subtitle: string;
};

export const getEncryptionKeyBiometric = async (
    prompt?: BiometricPromptText,
): Promise<string> => {
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

        const storedVaultCipher = await getStoredVaultCipher();
        if (storedVaultCipher) {
            try {
                const legacyKey = await getLegacyBiometricKey(prompt);
                if (legacyKey) {
                    await setDeviceProtectedVaultKey(legacyKey);
                    return legacyKey;
                }
            } catch {
                // Existing vault data without a recoverable key cannot be safely opened.
            }

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

    return getLegacyBiometricKey(prompt);
};

const getLegacyBiometricKey = async (prompt?: BiometricPromptText): Promise<string> => {
    await NativeBiometric.verifyIdentity({
        reason: prompt?.reason || 'Unlock xKey',
        title: prompt?.title || 'xKey Authentication',
        subtitle: prompt?.subtitle || 'Verify your identity to access the vault',
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
export const saveWallets = async (wallets: Wallet[], key: string | null, isDecoy = false): Promise<void> => {
    const storageKey = isDecoy ? STORAGE_KEYS.DECOY_WALLETS : STORAGE_KEYS.WALLETS;
    const previous = walletSaveQueues.get(storageKey) || Promise.resolve();

    const saveTask = previous.catch(() => {}).then(async () => {
        const encrypted = await runCryptoWorker<string>('ENCRYPT_WALLETS', { wallets, key, isDecoy });
        await persistAndVerify(encrypted, {
            write: value => saveVaultCipher(storageKey, value),
            read: async () => (await loadVaultCipher(storageKey)).value,
        });
        if (!isDecoy) {
            await Preferences.set({ key: 'xkey_vault_last_changed_at', value: new Date().toISOString() });
        }
    });

    const queuedTask = saveTask.finally(() => {
        if (walletSaveQueues.get(storageKey) === queuedTask) {
            walletSaveQueues.delete(storageKey);
        }
    });
    walletSaveQueues.set(storageKey, queuedTask);

    await saveTask;
};

/**
 * Load encrypted wallets, run migrations, and decrypt field-level encryption.
 */
export const loadWallets = async (key: string | null, isDecoy = false): Promise<Wallet[]> => {
    const storageKey = isDecoy ? STORAGE_KEYS.DECOY_WALLETS : STORAGE_KEYS.WALLETS;
    await waitForPendingWalletSave(storageKey);
    const { value, source } = await loadVaultCipher(storageKey);
    if (!value) return [];
    
    const needsCryptoMigration = !isVaultEnvelope(value);
    let wallets = await runCryptoWorker<Wallet[]>('DECRYPT_WALLETS', { cipherText: value, key, isDecoy });
    const preMigrationWallets = wallets;
    
    // Run schema migrations
    const { wallets: migrated, migrated: didMigrate, dryRun } = await runMigrations(wallets);
    wallets = migrated;
    
    const { wallets: vanityBackfilled, migrated: didBackfillVanity } = backfillVanityScoreMetadata(wallets);
    wallets = vanityBackfilled;
    
    // Create a rollback point before rewriting main-vault legacy crypto or schema.
    if (didMigrate || didBackfillVanity || needsCryptoMigration) {
        if (!isDecoy && (didMigrate || needsCryptoMigration)) {
            const { createEncryptedVaultSnapshot } = await import('./vaultSnapshot');
            await createEncryptedVaultSnapshot(preMigrationWallets, key, {
                operation: 'migration',
                schemaVersion: dryRun.targetSchema,
                reason: needsCryptoMigration
                    ? 'crypto_format:aes-gcm-v2'
                    : `dry_run:${dryRun.changes.map(change => change.code).join(',')}`,
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
export const encryptSetting = async (
    value: string | null,
    key: string | null,
    storageKey: string,
): Promise<string> => {
    if (!value) return '';
    if (!key) throw new Error('Vault key required to encrypt setting.');
    return encryptVaultEnvelope(value, key, `setting:${storageKey}`);
};

/**
 * Decrypt a setting value read from Preferences.
 * Versioned data is fail-closed. Legacy CBC and intentional plaintext values
 * remain readable until the caller persists them again in V2 format.
 */
export const decryptSetting = async (
    cipher: string | null,
    key: string | null,
    storageKey: string,
): Promise<string> => {
    if (!cipher) return '';
    if (!key) throw new Error('Vault key required to decrypt setting.');
    if (isVaultEnvelope(cipher)) {
        return decryptVaultEnvelope(cipher, key, `setting:${storageKey}`);
    }

    try {
        const bytes = CryptoJS.AES.decrypt(cipher, key);
        const result = bytes.toString(CryptoJS.enc.Utf8);
        return result || cipher;
    } catch {
        return cipher;
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
