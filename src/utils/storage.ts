import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
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
import { appendAuditLog } from './auditLog';
import { decodeReedSolomon, encodeReedSolomon, reedSolomonDefaults } from './reedSolomon';
import CryptoWorker from '../workers/crypto.worker.js?worker';
import type { Wallet } from '../types';

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

const STORAGE_KEYS = {
    WALLETS: 'xkey_wallets',
    DECOY_WALLETS: 'xkey_decoy_wallets',
    AES_KEY_FALLBACK: 'xkey_aes_fallback',
    HARDWARE_BOUND_ONLY: 'xkey_hardware_bound_only'
};

const BIOMETRIC_SERVER = 'app.xkey.vault';
const BIOMETRIC_USER = 'xkey_vault';
const FRAGMENT_VERSION = 1;
const FRAGMENT_DIR = 'xkey-vault-fragments';
let commitSequence = 0;
type FragmentRecord = {
    index: number;
    type: 'preferences' | 'file';
    key?: string;
    path?: string;
    length: number;
    hash: string;
};

type RecoveryParityShard = {
    index: number;
    data: string;
    hash: string;
};

type FragmentRecovery = {
    algorithm?: string;
    dataShards: number;
    parityShards: number;
    overheadPercent?: number;
    shardSize: number;
    originalLength: number;
    parity?: RecoveryParityShard[] | string;
};

type FragmentManifest = {
    version: number;
    createdAt: string;
    commitStamp: string;
    storageKey: string;
    totalLength: number;
    hash: string;
    encoding?: string;
    fragments: FragmentRecord[];
    recovery?: FragmentRecovery;
};

type CommitMetadata = {
    createdAt: string;
    commitStamp: string;
};

type LegacyOverride = {
    hash: string;
    createdAt: string;
    commitStamp: string;
};

type VaultCipherSource = 'legacy' | 'fragmented' | 'none';

type VaultCipherResult = {
    value: string;
    source: VaultCipherSource;
};

type VaultKeyError = Error & {
    code: string;
};

const walletSaveQueues = new Map<string, Promise<boolean>>();

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

const fragmentManifestKey = (storageKey: string): string => `${storageKey}_fragment_manifest_v${FRAGMENT_VERSION}`;
const legacyOverrideKey = (storageKey: string): string => `${storageKey}_legacy_override_v${FRAGMENT_VERSION}`;
const fragmentPrefKey = (storageKey: string, writeId: string, index: number): string => `${storageKey}_fragment_${writeId}_${index}_v${FRAGMENT_VERSION}`;
const fragmentFilePath = (storageKey: string, writeId: string, index: number): string => {
    const safeStorageKey = storageKey.replace(/[^a-z0-9_-]/gi, '_');
    return `${FRAGMENT_DIR}/${safeStorageKey}_${writeId}_${index}.xkf`;
};

const getCipherHash = (value: string): string => CryptoJS.SHA256(value).toString();
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

const base64ToBytes = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const createCommitMetadata = (): CommitMetadata => {
    const createdAt = new Date().toISOString();
    commitSequence += 1;
    return {
        createdAt,
        commitStamp: `${Date.now().toString().padStart(13, '0')}_${commitSequence.toString().padStart(6, '0')}`,
    };
};

const createVaultShards = (value: string): { chunks: string[]; recovery: FragmentRecovery } => {
    const encoded = encodeReedSolomon(textEncoder.encode(value), reedSolomonDefaults);
    const chunks = encoded.data.map(bytesToBase64);
    return {
        chunks,
        recovery: {
            algorithm: encoded.algorithm,
            dataShards: encoded.dataShards,
            parityShards: encoded.parityShards,
            overheadPercent: encoded.overheadPercent,
            shardSize: encoded.shardSize,
            originalLength: encoded.originalLength,
            parity: encoded.parity.map((shard, index) => ({
                index: encoded.dataShards + index,
                data: bytesToBase64(shard),
                hash: getCipherHash(bytesToBase64(shard)),
            })),
        },
    };
};

const recoverFragmentFromParity = (manifest: FragmentManifest, validParts: string[], missingIndex: number): string => {
    if (manifest?.recovery?.algorithm !== 'xor-parity-v1' || typeof manifest.recovery.parity !== 'string') return '';
    const recovered = base64ToBytes(manifest.recovery.parity);
    for (const [index, value] of validParts.entries()) {
        if (index === missingIndex || typeof value !== 'string') continue;
        const bytes = textEncoder.encode(value);
        for (let i = 0; i < recovered.length; i += 1) recovered[i] ^= bytes[i] || 0;
    }
    const expectedLength = manifest.fragments.find((fragment: FragmentRecord) => fragment.index === missingIndex)?.length || recovered.length;
    return textDecoder.decode(recovered.slice(0, expectedLength));
};

const readManifest = async (storageKey: string): Promise<FragmentManifest | null> => {
    const { value } = await Preferences.get({ key: fragmentManifestKey(storageKey) });
    if (!value) return null;
    try {
        const manifest = JSON.parse(value) as Partial<FragmentManifest>;
        if (manifest?.version !== FRAGMENT_VERSION || manifest.storageKey !== storageKey || !Array.isArray(manifest.fragments)) return null;
        if (manifest.fragments.length < 3) return null;
        if (!Number.isFinite(manifest.totalLength) || typeof manifest.hash !== 'string') return null;
        const indexes = manifest.fragments.map((fragment: FragmentRecord) => fragment.index).sort((a: number, b: number) => a - b);
        if (indexes.some((index: number, expected: number) => index !== expected)) return null;
        if (manifest.fragments.some((fragment: FragmentRecord) => (
            !['preferences', 'file'].includes(fragment.type)
            || !Number.isFinite(fragment.length)
            || typeof fragment.hash !== 'string'
            || (fragment.type === 'preferences' && !fragment.key)
            || (fragment.type === 'file' && !fragment.path)
        ))) return null;
        return manifest as FragmentManifest;
    } catch {
        return null;
    }
};

const hasFragmentManifest = async (storageKey: string): Promise<boolean> => {
    const { value } = await Preferences.get({ key: fragmentManifestKey(storageKey) });
    return !!value;
};

const readLegacyOverride = async (storageKey: string): Promise<LegacyOverride | null> => {
    const { value } = await Preferences.get({ key: legacyOverrideKey(storageKey) });
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        if (parsed?.version === FRAGMENT_VERSION && typeof parsed.hash === 'string') {
            return {
                hash: parsed.hash,
                createdAt: parsed.createdAt || '',
                commitStamp: parsed.commitStamp || '',
            };
        }
    } catch {
        // Backward compatible with the first legacy override format, which stored only the hash.
    }
    return { hash: value, createdAt: '', commitStamp: '' };
};

const isNewerCommit = (left: Partial<CommitMetadata> | null, right: Partial<CommitMetadata> | null): boolean => {
    if (left?.commitStamp && right?.commitStamp) return left.commitStamp > right.commitStamp;
    if (left?.commitStamp && !right?.commitStamp) return true;
    if (!left?.commitStamp && right?.commitStamp) return false;
    if (!left?.createdAt) return false;
    if (!right?.createdAt) return true;
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (!Number.isFinite(leftTime)) return false;
    if (!Number.isFinite(rightTime)) return true;
    return leftTime > rightTime;
};

const readFileFragment = async (path: string): Promise<string> => {
    const result = await Filesystem.readFile({
        directory: Directory.Data,
        path,
        encoding: Encoding.UTF8,
    });
    return typeof result.data === 'string' ? result.data : '';
};

const readFragmentedVaultCipher = async (storageKey: string): Promise<string> => {
    const manifest = await readManifest(storageKey);
    if (!manifest) return '';
    const orderedFragments = [...manifest.fragments].sort((a, b) => a.index - b.index);

    if (manifest.recovery?.algorithm === 'reed-solomon-gf256-v1') {
        const recovery = manifest.recovery;
        const parts: Uint8Array[] = [];
        const present = Array(recovery.dataShards + recovery.parityShards).fill(false);
        const invalidIndexes: number[] = [];

        await Promise.all(orderedFragments.map(async (fragment) => {
            try {
                let data = '';
                if (fragment.type === 'preferences') {
                    if (!fragment.key) throw new Error('Vault fragment key is missing.');
                    data = (await Preferences.get({ key: fragment.key })).value || '';
                } else {
                    if (!fragment.path) throw new Error('Vault fragment path is missing.');
                    data = await readFileFragment(fragment.path);
                }
                if (data.length !== fragment.length || getCipherHash(data) !== fragment.hash) {
                    throw new Error('Vault fragment integrity check failed.');
                }
                parts[fragment.index] = base64ToBytes(data);
                present[fragment.index] = true;
            } catch {
                invalidIndexes.push(fragment.index);
                parts[fragment.index] = new Uint8Array(recovery.shardSize);
            }
        }));

        const parityShards = Array.isArray(recovery.parity) ? recovery.parity : [];
        for (const parity of parityShards) {
            if (getCipherHash(parity.data) === parity.hash) {
                parts[parity.index] = base64ToBytes(parity.data);
                present[parity.index] = true;
            }
        }

        const recoveredBytes = decodeReedSolomon({
            shards: parts,
            present,
            dataShards: recovery.dataShards,
            parityShards: recovery.parityShards,
            originalLength: recovery.originalLength,
        });
        const value = textDecoder.decode(recoveredBytes);
        if (value.length !== manifest.totalLength || getCipherHash(value) !== manifest.hash) {
            throw new Error('Vault manifest integrity check failed.');
        }

        if (invalidIndexes.length > 0) {
            const encoded = encodeReedSolomon(textEncoder.encode(value), {
                dataShards: recovery.dataShards,
                parityShards: recovery.parityShards,
            });
            await Promise.all(invalidIndexes.map(async (index) => {
                const fragment = orderedFragments.find(item => item.index === index);
                if (!fragment) return;
                const repaired = bytesToBase64(encoded.data[index]);
                if (fragment.type === 'preferences') {
                    if (!fragment.key) return;
                    await Preferences.set({ key: fragment.key, value: repaired }).catch(() => {});
                } else {
                    if (!fragment.path) return;
                    await Filesystem.writeFile({
                        directory: Directory.Data,
                        path: fragment.path,
                        data: repaired,
                        encoding: Encoding.UTF8,
                    }).catch(() => {});
                }
            }));
            await appendAuditLog('vault.self_healed', {
                fragments: invalidIndexes,
                recoveredBytes: invalidIndexes.length * recovery.shardSize,
                storageKey,
                algorithm: recovery.algorithm,
            });
        }

        return value;
    }

    const parts: string[] = [];
    const invalidIndexes: number[] = [];
    await Promise.all(orderedFragments.map(async (fragment) => {
        try {
            let data = '';
            if (fragment.type === 'preferences') {
                if (!fragment.key) throw new Error('Vault fragment key is missing.');
                data = (await Preferences.get({ key: fragment.key })).value || '';
            } else {
                if (!fragment.path) throw new Error('Vault fragment path is missing.');
                data = await readFileFragment(fragment.path);
            }

            if (data.length !== fragment.length || getCipherHash(data) !== fragment.hash) {
                throw new Error('Vault fragment integrity check failed.');
            }
            parts[fragment.index] = data;
        } catch {
            invalidIndexes.push(fragment.index);
        }
    }));

    if (invalidIndexes.length === 1) {
        const recovered = recoverFragmentFromParity(manifest, parts, invalidIndexes[0]);
        const fragment = orderedFragments.find(item => item.index === invalidIndexes[0]);
        if (fragment && recovered.length === fragment.length && getCipherHash(recovered) === fragment.hash) {
            parts[invalidIndexes[0]] = recovered;
            await appendAuditLog('vault.self_healed', {
                fragment: invalidIndexes[0],
                recoveredBytes: textEncoder.encode(recovered).length,
                storageKey,
            });
            if (fragment.type === 'preferences') {
                if (fragment.key) await Preferences.set({ key: fragment.key, value: recovered }).catch(() => {});
            } else if (fragment.path) {
                await Filesystem.writeFile({
                    directory: Directory.Data,
                    path: fragment.path,
                    data: recovered,
                    encoding: Encoding.UTF8,
                }).catch(() => {});
            }
        }
    }

    if (orderedFragments.some(fragment => typeof parts[fragment.index] !== 'string')) {
        throw new Error('Vault fragment integrity check failed.');
    }

    const value = parts.join('');
    if (value.length !== manifest.totalLength || getCipherHash(value) !== manifest.hash) {
        throw new Error('Vault manifest integrity check failed.');
    }
    return value;
};

const removeStoredFragments = async (manifest: FragmentManifest | null): Promise<void> => {
    if (!manifest?.fragments) return;
    await Promise.all(manifest.fragments.map((fragment) => {
        if (fragment.type === 'preferences' && fragment.key) {
            return Preferences.remove({ key: fragment.key }).catch(() => {});
        }
        if (fragment.type === 'file' && fragment.path) {
            return Filesystem.deleteFile({
                directory: Directory.Data,
                path: fragment.path,
            }).catch(() => {});
        }
        return Promise.resolve();
    }));
};

const saveFragmentedVaultCipher = async (storageKey: string, value: string): Promise<void> => {
    const previousManifest = await readManifest(storageKey);
    const writeId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const { chunks, recovery } = createVaultShards(value);
    const commit = createCommitMetadata();
    const manifest: FragmentManifest = {
        version: FRAGMENT_VERSION,
        createdAt: commit.createdAt,
        commitStamp: commit.commitStamp,
        storageKey,
        totalLength: value.length,
        hash: getCipherHash(value),
        encoding: 'base64-reed-solomon-shards-v1',
        fragments: chunks.map((chunk, index): FragmentRecord => ({
            index,
            type: index === 0 ? 'preferences' : 'file',
            key: index === 0 ? fragmentPrefKey(storageKey, writeId, index) : undefined,
            path: index === 0 ? undefined : fragmentFilePath(storageKey, writeId, index),
            length: chunk.length,
            hash: getCipherHash(chunk),
        })),
        recovery,
    };

    await Filesystem.mkdir({
        directory: Directory.Data,
        path: FRAGMENT_DIR,
        recursive: true,
    }).catch(() => {});

    await Promise.all(manifest.fragments.map((fragment) => {
        const chunk = chunks[fragment.index];
        if (fragment.type === 'preferences') {
            if (!fragment.key) return Promise.resolve();
            return Preferences.set({ key: fragment.key, value: chunk });
        }
        if (!fragment.path) return Promise.resolve();
        return Filesystem.writeFile({
            directory: Directory.Data,
            path: fragment.path,
            data: chunk,
            encoding: Encoding.UTF8,
        });
    }));

    await Preferences.set({ key: fragmentManifestKey(storageKey), value: JSON.stringify(manifest) });
    await Preferences.remove({ key: storageKey });
    await Preferences.remove({ key: legacyOverrideKey(storageKey) });
    await removeStoredFragments(previousManifest);
};

const saveVaultCipher = async (storageKey: string, value: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) {
        await Preferences.set({ key: storageKey, value });
        return;
    }

    try {
        await saveFragmentedVaultCipher(storageKey, value);
    } catch (err) {
        console.warn('Fragmented vault storage failed; using legacy encrypted blob storage.', err);
        const commit = createCommitMetadata();
        const override = {
            version: FRAGMENT_VERSION,
            createdAt: commit.createdAt,
            commitStamp: commit.commitStamp,
            hash: getCipherHash(value),
        };
        await Preferences.set({ key: storageKey, value });
        await Preferences.set({ key: legacyOverrideKey(storageKey), value: JSON.stringify(override) });
        await Preferences.remove({ key: fragmentManifestKey(storageKey) });
    }
};

const loadVaultCipher = async (storageKey: string): Promise<VaultCipherResult> => {
    if (Capacitor.isNativePlatform()) {
        const [{ value: legacyValue }, legacyOverride, manifest] = await Promise.all([
            Preferences.get({ key: storageKey }),
            readLegacyOverride(storageKey),
            readManifest(storageKey),
        ]);
        if (
            legacyValue
            && legacyOverride?.hash === getCipherHash(legacyValue)
            && (!manifest || !legacyOverride.createdAt || isNewerCommit(legacyOverride, manifest))
        ) {
            return { value: legacyValue, source: 'legacy' };
        }

        const hasManifest = await hasFragmentManifest(storageKey);
        try {
            const fragmented = await readFragmentedVaultCipher(storageKey);
            if (fragmented) return { value: fragmented, source: 'fragmented' };
        } catch (err) {
            console.warn('Unable to read fragmented vault storage.', err);
            if (legacyValue) return { value: legacyValue, source: 'legacy' };
            throw err;
        }

        if (hasManifest) {
            if (legacyValue) return { value: legacyValue, source: 'legacy' };
            throw new Error('Vault fragment manifest is present but invalid.');
        }
    }

    const { value } = await Preferences.get({ key: storageKey });
    return { value: value || '', source: value ? 'legacy' : 'none' };
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
    const native = Capacitor.isNativePlatform();
    const [
        mainManifest,
        decoyManifest,
        hasMainManifest,
        hasDecoyManifest,
        mainLegacyResult,
        decoyLegacyResult,
        mainLegacyOverride,
        decoyLegacyOverride,
    ] = await Promise.all([
        readManifest(STORAGE_KEYS.WALLETS).catch(() => null),
        readManifest(STORAGE_KEYS.DECOY_WALLETS).catch(() => null),
        hasFragmentManifest(STORAGE_KEYS.WALLETS).catch(() => false),
        hasFragmentManifest(STORAGE_KEYS.DECOY_WALLETS).catch(() => false),
        Preferences.get({ key: STORAGE_KEYS.WALLETS }).catch(() => ({ value: '' })),
        Preferences.get({ key: STORAGE_KEYS.DECOY_WALLETS }).catch(() => ({ value: '' })),
        readLegacyOverride(STORAGE_KEYS.WALLETS).catch(() => null),
        readLegacyOverride(STORAGE_KEYS.DECOY_WALLETS).catch(() => null),
    ]);
    const mainLegacy = mainLegacyResult.value || '';
    const decoyLegacy = decoyLegacyResult.value || '';
    const mainLegacyOverrideActive = !!mainLegacy
        && mainLegacyOverride?.hash === getCipherHash(mainLegacy)
        && (!mainManifest || !mainLegacyOverride.createdAt || isNewerCommit(mainLegacyOverride, mainManifest));
    const decoyLegacyOverrideActive = !!decoyLegacy
        && decoyLegacyOverride?.hash === getCipherHash(decoyLegacy)
        && (!decoyManifest || !decoyLegacyOverride.createdAt || isNewerCommit(decoyLegacyOverride, decoyManifest));
    const hasLegacyOverride = mainLegacyOverrideActive || decoyLegacyOverrideActive;

    return {
        native,
        ramOnlyDecrypted: true,
        plaintextDiskWrite: false,
        fragmentedStorage: !hasLegacyOverride && !!(mainManifest || decoyManifest || hasMainManifest || hasDecoyManifest),
        fragmentedStorageHealthy: !(hasMainManifest && !mainManifest) && !(hasDecoyManifest && !decoyManifest),
        legacyStorage: hasLegacyOverride || !!(mainLegacy || decoyLegacy),
        legacyOverride: hasLegacyOverride,
        fragmentCount: mainManifest?.fragments?.length || decoyManifest?.fragments?.length || 0,
    };
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
    if (Capacitor.isNativePlatform() && await isDeviceCredentialAvailable()) {
        return getEncryptionKeyBiometric();
    }

    if (Capacitor.isNativePlatform() && await isHardwareBoundOnlyEnabled()) {
        throw new Error('Hardware-bound mode requires this device lock to unlock the vault.');
    }

    const { value } = await Preferences.get({ key: STORAGE_KEYS.AES_KEY_FALLBACK });
    if (value) return value;
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
    
    // Run schema migrations
    const { wallets: migrated, migrated: didMigrate } = await runMigrations(wallets);
    wallets = migrated;
    
    // If migration happened, re-save with new schema + field encryption
    if (didMigrate) {
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
    await Filesystem.rmdir({
        directory: Directory.Data,
        path: FRAGMENT_DIR,
        recursive: true,
    }).catch(() => {});
    await deleteDeviceProtectedVaultKey().catch(() => {});
    if (!Capacitor.isNativePlatform()) return;

    try {
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
    } catch {
        // Ignore if credential doesn't exist
    }
};
