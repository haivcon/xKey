import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import { appendAuditLog } from '../auditLog';
import { decodeReedSolomon, encodeReedSolomon, reedSolomonDefaults } from '../crypto/reedSolomon';

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

export type VaultCipherSource = 'legacy' | 'fragmented' | 'none';

export type VaultCipherResult = {
    value: string;
    source: VaultCipherSource;
};

const fragmentManifestKey = (storageKey: string): string => `${storageKey}_fragment_manifest_v${FRAGMENT_VERSION}`;
const legacyOverrideKey = (storageKey: string): string => `${storageKey}_legacy_override_v${FRAGMENT_VERSION}`;
const fragmentPrefKey = (storageKey: string, writeId: string, index: number): string => `${storageKey}_fragment_${writeId}_${index}_v${FRAGMENT_VERSION}`;
const fragmentFilePath = (storageKey: string, writeId: string, index: number): string => {
    const safeStorageKey = storageKey.replace(/[^a-z0-9_-]/gi, '_');
    return `${FRAGMENT_DIR}/${safeStorageKey}_${writeId}_${index}.xkf`;
};

export const getCipherHash = (value: string): string => CryptoJS.SHA256(value).toString();

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

export const saveVaultCipher = async (storageKey: string, value: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) {
        await Preferences.set({ key: storageKey, value });
        return;
    }

    try {
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

export const loadVaultCipher = async (storageKey: string): Promise<VaultCipherResult> => {
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

export const getVaultStorageStatusForKeys = async (mainStorageKey: string, decoyStorageKey: string) => {
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
        readManifest(mainStorageKey).catch(() => null),
        readManifest(decoyStorageKey).catch(() => null),
        hasFragmentManifest(mainStorageKey).catch(() => false),
        hasFragmentManifest(decoyStorageKey).catch(() => false),
        Preferences.get({ key: mainStorageKey }).catch(() => ({ value: '' })),
        Preferences.get({ key: decoyStorageKey }).catch(() => ({ value: '' })),
        readLegacyOverride(mainStorageKey).catch(() => null),
        readLegacyOverride(decoyStorageKey).catch(() => null),
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

export const removeVaultFragmentDirectory = async (): Promise<void> => {
    await Filesystem.rmdir({
        directory: Directory.Data,
        path: FRAGMENT_DIR,
        recursive: true,
    }).catch(() => {});
};