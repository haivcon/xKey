import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import CryptoJS from 'crypto-js';
import { decryptEnvelope, encryptEnvelope, isCryptoEnvelope } from './cryptoEnvelope';
import { appendAuditLog } from './auditLog';
import { decodeReedSolomon, encodeReedSolomon, reedSolomonDefaults } from './reedSolomon';
import type { Wallet } from '../types';

const BACKUP_FORMAT_V3 = 'xkey-backup-v3';
const BACKUP_FORMAT_V4 = 'xkey-backup-v4';
const BACKUP_SOURCE = 'github.com/haivcon/xKey';
const V4_BEGIN = '-----BEGIN XKEY BACKUP V4-----';
const V4_HEADER = '-----BEGIN XKEY HEADER-----';
const V4_PAYLOAD = '-----BEGIN XKEY PAYLOAD-----';
const V4_PAYLOAD_END = '-----END XKEY PAYLOAD-----';
const V4_FOOTER = '-----BEGIN XKEY RECOVERY FOOTER-----';
const V4_END = '-----END XKEY BACKUP V4-----';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type BackupConfig = {
    scope?: string;
    [key: string]: unknown;
} | null | undefined;

type BackupPayload = {
    wallets?: Wallet[];
    config?: BackupConfig;
    [key: string]: unknown;
};

type BackupSummary = {
    walletCount: number;
    folderCount: number;
    networkCount: number;
    tagCount: number;
};

type RecoveryParityShard = {
    index: number;
    data: string;
    hash: string;
};

type BackupRecovery = {
    algorithm?: string;
    dataShards: number;
    parityShards?: number;
    overheadPercent?: number;
    shardSize: number;
    originalLength: number;
    dataHashes?: string[];
    shardHashes?: string[];
    parity?: RecoveryParityShard[] | string;
};

type BackupDescriptor = {
    format?: string;
    app?: string;
    source?: string;
    backupId?: string;
    createdAt?: string;
    createdBy?: {
        platform?: string;
        native?: boolean;
        userAgent?: string;
    };
    portable?: boolean;
    version?: number;
    summary?: Partial<BackupSummary>;
    configSummary?: {
        hasConfig?: boolean;
        scope?: string;
    };
    integrity?: {
        algorithm?: string;
        payloadHash?: string;
        backupId?: string;
        descriptorHash?: string;
        passwordSeal?: string;
    };
    recovery?: BackupRecovery;
    payload?: string;
    containerHash?: string;
    footerRecovered?: boolean;
};

type BackupRecoveryResult = {
    payloadText: string;
    recovered: boolean;
    recoveredBytes: number;
    recoveredShards?: number[];
};

type BackupInspection = {
    legacy: boolean;
    canPreview: boolean;
    integrity: string;
    status: string;
    title?: string;
    message?: string;
    format?: string;
    backupId?: string;
    containerHash?: string;
    recovered?: boolean;
    recoveredBytes?: number;
    recoveredShards?: number[];
    footerRecovered?: boolean;
    metadata?: {
        app?: string;
        source?: string;
        backupId: string;
        containerHash: string;
        createdAt?: string;
        platform: string;
        native: boolean;
        walletCount: number;
        folderCount: number;
        networkCount: number;
        tagCount: number;
        portable: boolean;
        scope: string;
    };
};

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error || '');

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

const sha256 = (value: string): string => CryptoJS.SHA256(value).toString();

const encodeJsonBlock = (value: unknown): string => bytesToBase64(textEncoder.encode(JSON.stringify(value)));

const decodeJsonBlock = <T = BackupDescriptor>(value: string): T => JSON.parse(textDecoder.decode(base64ToBytes(value.trim()))) as T;

const createPasswordSeal = (password: string | null | undefined, payloadHash: string): string => {
    if (!password) return '';
    return sha256(`xkey-backup-seal-v1|${password}|${payloadHash}`);
};

const createBackupId = (payloadHash: string, createdAt: string, summary?: Partial<BackupSummary>): string => sha256([
    'xkey-backup-id-v1',
    payloadHash,
    createdAt,
    summary?.walletCount ?? 0,
    summary?.folderCount ?? 0,
].join('|')).slice(0, 20);

const summarizeWallets = (wallets: Wallet[] = []): BackupSummary => {
    const folders = new Set<string>();
    const networks = new Set<string>();
    const tags = new Set<string>();
    for (const wallet of wallets) {
        if (wallet.groupId) folders.add(wallet.groupId);
        if (wallet.network) networks.add(wallet.network);
        if (Array.isArray(wallet.tags)) wallet.tags.forEach((tag: string) => tags.add(tag));
    }
    return {
        walletCount: wallets.length,
        folderCount: folders.size,
        networkCount: networks.size,
        tagCount: tags.size,
    };
};

const createBackupRecovery = (payloadText: string): BackupRecovery => {
    const encoded = encodeReedSolomon(textEncoder.encode(payloadText), reedSolomonDefaults);
    return {
        algorithm: encoded.algorithm,
        dataShards: encoded.dataShards,
        parityShards: encoded.parityShards,
        overheadPercent: encoded.overheadPercent,
        shardSize: encoded.shardSize,
        originalLength: encoded.originalLength,
        dataHashes: encoded.data.map(shard => sha256(bytesToBase64(shard))),
        parity: encoded.parity.map((shard: Uint8Array, index: number) => ({
            index: encoded.dataShards + index,
            data: bytesToBase64(shard),
            hash: sha256(bytesToBase64(shard)),
        })),
    };
};

const recoverXorBackupPayload = (payloadText: string, recovery?: BackupRecovery): BackupRecoveryResult => {
    if (recovery?.algorithm !== 'xor-parity-v1') return { payloadText, recovered: false, recoveredBytes: 0 };
    if (!recovery.shardHashes || typeof recovery.parity !== 'string') return { payloadText, recovered: false, recoveredBytes: 0 };
    const bytes = textEncoder.encode(payloadText);
    const shards = Array.from({ length: recovery.dataShards }, (_, index) => bytes.slice(index * recovery.shardSize, (index + 1) * recovery.shardSize));
    const invalidIndexes = shards
        .map((shard, index) => sha256(bytesToBase64(shard)) === recovery.shardHashes?.[index] ? -1 : index)
        .filter((index: number) => index >= 0);

    if (invalidIndexes.length !== 1) return { payloadText, recovered: false, recoveredBytes: 0 };
    const missingIndex = invalidIndexes[0];
    const recovered = base64ToBytes(recovery.parity);
    shards.forEach((shard, index) => {
        if (index === missingIndex) return;
        for (let i = 0; i < recovery.shardSize; i += 1) recovered[i] ^= shard[i] || 0;
    });
    const expectedLength = missingIndex === recovery.dataShards - 1
        ? recovery.originalLength - recovery.shardSize * missingIndex
        : recovery.shardSize;
    const recoveredShard = recovered.slice(0, expectedLength);
    if (sha256(bytesToBase64(recoveredShard)) !== recovery.shardHashes[missingIndex]) {
        return { payloadText, recovered: false, recoveredBytes: 0 };
    }
    shards[missingIndex] = recoveredShard;
    const repaired = new Uint8Array(recovery.originalLength);
    let offset = 0;
    for (const shard of shards) {
        repaired.set(shard.slice(0, Math.min(shard.length, repaired.length - offset)), offset);
        offset += shard.length;
    }
    return {
        payloadText: textDecoder.decode(repaired),
        recovered: true,
        recoveredBytes: recoveredShard.length,
        recoveredShards: [missingIndex],
    };
};

const recoverBackupPayload = (payloadText: string, recovery?: BackupRecovery): BackupRecoveryResult => {
    if (recovery?.algorithm === 'xor-parity-v1') return recoverXorBackupPayload(payloadText, recovery);
    if (recovery?.algorithm !== 'reed-solomon-gf256-v1') {
        return { payloadText, recovered: false, recoveredBytes: 0, recoveredShards: [] };
    }
    if (typeof recovery.parityShards !== 'number' || recovery.parityShards <= 0 || !recovery.dataHashes) {
        return { payloadText, recovered: false, recoveredBytes: 0, recoveredShards: [] };
    }

    const parityShardCount: number = recovery.parityShards;
    const totalShards = recovery.dataShards + parityShardCount;
    const bytes = textEncoder.encode(payloadText);
    const shards: Uint8Array[] = Array.from({ length: totalShards }, () => new Uint8Array(recovery.shardSize));
    const present: boolean[] = Array(totalShards).fill(false);
    const invalidIndexes: number[] = [];

    for (let index = 0; index < recovery.dataShards; index += 1) {
        const shard = new Uint8Array(recovery.shardSize);
        shard.set(bytes.slice(index * recovery.shardSize, Math.min((index + 1) * recovery.shardSize, bytes.length)));
        const valid = sha256(bytesToBase64(shard)) === recovery.dataHashes?.[index];
        shards[index] = shard;
        present[index] = valid;
        if (!valid) invalidIndexes.push(index);
    }

    const parityShards = Array.isArray(recovery.parity) ? recovery.parity : [];
    for (const parity of parityShards) {
        if (!Number.isInteger(parity.index) || parity.index < recovery.dataShards || parity.index >= totalShards) continue;
        if (sha256(parity.data) !== parity.hash) continue;
        shards[parity.index] = base64ToBytes(parity.data);
        present[parity.index] = true;
    }

    if (invalidIndexes.length === 0) {
        return { payloadText, recovered: false, recoveredBytes: 0, recoveredShards: [] };
    }

    try {
        const recovered = decodeReedSolomon({
            shards,
            present,
            dataShards: recovery.dataShards,
            parityShards: parityShardCount,
            originalLength: recovery.originalLength,
        });
        const repairedPayload = textDecoder.decode(recovered);
        return {
            payloadText: repairedPayload,
            recovered: true,
            recoveredBytes: invalidIndexes.length * recovery.shardSize,
            recoveredShards: invalidIndexes,
        };
    } catch {
        return { payloadText, recovered: false, recoveredBytes: 0, recoveredShards: invalidIndexes };
    }
};

const decodeBackupFileData = (fileData: string): string => {
    try {
        const binString = atob(fileData);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) bytes[i] = binString.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    } catch {
        return fileData;
    }
};

const extractBlock = (text: string, startMarker: string, endMarker?: string): string => {
    const start = text.indexOf(startMarker);
    if (start < 0) return '';
    const contentStart = start + startMarker.length;
    const end = endMarker ? text.indexOf(endMarker, contentStart) : text.indexOf('\n', contentStart + 1);
    if (end < 0) return text.slice(contentStart).trim();
    return text.slice(contentStart, end).trim();
};

const parseV4BackupContainer = (text: string): BackupDescriptor | null => {
    if (!text.includes(V4_PAYLOAD) || !text.includes(V4_FOOTER)) return null;
    const footerText = extractBlock(text, V4_FOOTER, V4_END);
    const headerText = extractBlock(text, V4_HEADER, V4_PAYLOAD);
    const descriptor = decodeJsonBlock<BackupDescriptor>(footerText || headerText);
    const payload = extractBlock(text, V4_PAYLOAD, V4_PAYLOAD_END);
    if (descriptor?.format !== BACKUP_FORMAT_V4 || !payload) return null;
    return {
        ...descriptor,
        payload,
        containerHash: sha256(text),
        footerRecovered: !headerText && !!footerText,
    };
};

const parseBackupContainer = (text: string): BackupDescriptor | null => {
    try {
        const v4 = parseV4BackupContainer(text);
        if (v4) return v4;
    } catch {
        // Fall through to v3 JSON and legacy encrypted backup text.
    }
    try {
        const parsed = JSON.parse(text) as BackupDescriptor;
        if (parsed?.format === BACKUP_FORMAT_V3 && parsed?.payload) {
            return {
                ...parsed,
                backupId: parsed.integrity?.backupId || createBackupId(parsed.integrity?.payloadHash || '', parsed.createdAt || '', parsed.summary),
                containerHash: sha256(text),
            };
        }
    } catch {
        // Legacy encrypted backup text.
    }
    return null;
};

const encryptBackup = async (data: BackupPayload, key: string): Promise<string> => {
    return encryptEnvelope(data, key);
};

const decryptBackup = async (cipherText: string, key: string): Promise<BackupPayload> => {
    if (isCryptoEnvelope(cipherText)) {
        return decryptEnvelope<BackupPayload>(cipherText, key);
    }
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) throw new Error("Invalid Key");
    return JSON.parse(decryptedStr) as BackupPayload;
};

export const createPortableBackupText = async (wallets: Wallet[], config: BackupConfig, userPassword: string): Promise<string> => {
    const backupPayload = {
        version: 2,
        portable: true,
        timestamp: new Date().toISOString(),
        wallets,
        config
    };

    const encryptedPayload = await encryptBackup(backupPayload, userPassword);
    const payloadHash = sha256(encryptedPayload);
    const summary = summarizeWallets(wallets);
    const backupId = createBackupId(payloadHash, backupPayload.timestamp, summary);
    const metadata = {
        format: BACKUP_FORMAT_V4,
        app: 'xKey',
        source: BACKUP_SOURCE,
        backupId,
        createdAt: backupPayload.timestamp,
        createdBy: {
            platform: Capacitor.getPlatform(),
            native: Capacitor.isNativePlatform(),
            userAgent: navigator.userAgent || '',
        },
        portable: true,
        version: backupPayload.version,
        summary,
        configSummary: config ? {
            hasConfig: true,
            scope: config.scope || 'vault',
        } : { hasConfig: false },
    };

    const recovery = createBackupRecovery(encryptedPayload);
    const descriptorHash = sha256(JSON.stringify({
        metadata,
        payloadHash,
        recovery,
    }));
    const descriptor = {
        ...metadata,
        integrity: {
            algorithm: 'SHA-256',
            payloadHash,
            backupId,
            descriptorHash,
            passwordSeal: createPasswordSeal(userPassword, payloadHash),
        },
        recovery,
    };

    return [
        V4_BEGIN,
        V4_HEADER,
        encodeJsonBlock(descriptor),
        V4_PAYLOAD,
        encryptedPayload,
        V4_PAYLOAD_END,
        V4_FOOTER,
        encodeJsonBlock(descriptor),
        V4_END,
        '',
    ].join('\n');
};

// #14: Portable backup (uses user-chosen password)
export const exportPortableBackup = async (wallets: Wallet[], config: BackupConfig, userPassword: string): Promise<boolean> => {
    try {
        const encryptedData = await createPortableBackupText(wallets, config, userPassword);
        const fileName = `xkey_portable_${new Date().getTime()}.xkey`;

        if (!Capacitor.isNativePlatform()) {
            const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            return true;
        }

        // Write to app cache (no permissions needed on any Android version)
        const fileResult = await Filesystem.writeFile({
            path: fileName,
            data: encryptedData,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        // Open share sheet so user can save to Downloads, Drive, etc.
        await Share.share({
            title: 'xKey Portable Backup',
            text: 'Password-protected xKey vault backup.',
            url: fileResult.uri,
            dialogTitle: 'Save Portable Backup'
        });

        await appendAuditLog('backup.exported', {
            walletCount: wallets.length,
            portable: true,
            fileName,
        });
        return true;
    } catch (e) {
        console.error("Portable backup export failed", e);
        return false;
    }
};

export const inspectBackupFile = async (base64Data: string): Promise<BackupInspection> => {
    const rawText = decodeBackupFileData(base64Data);
    const container = parseBackupContainer(rawText);
    if (!container) {
        return {
            legacy: true,
            canPreview: false,
            integrity: 'unknown',
            status: 'legacy',
            title: 'Legacy xKey backup',
            message: 'This backup was created by an older xKey version. Metadata preview is not available until it is decrypted.',
        };
    }

    let payload = container.payload || '';
    if (!payload) {
        return {
            legacy: false,
            canPreview: true,
            format: container.format,
            backupId: container.backupId || container.integrity?.backupId || '',
            containerHash: container.containerHash || sha256(rawText),
            integrity: 'modified',
            status: 'tampered',
            recovered: false,
            recoveredBytes: 0,
            recoveredShards: [],
            footerRecovered: !!container.footerRecovered,
        };
    }
    let recovered = false;
    let recoveredBytes = 0;
    let recoveredShards: number[] = [];
    if (sha256(payload) !== container.integrity?.payloadHash) {
        const repair = recoverBackupPayload(payload, container.recovery);
        payload = repair.payloadText;
        recovered = repair.recovered;
        recoveredBytes = repair.recoveredBytes;
        recoveredShards = repair.recoveredShards || [];
    }

    const verified = sha256(payload) === container.integrity?.payloadHash;
    return {
        legacy: false,
        canPreview: true,
        format: container.format,
        backupId: container.backupId || container.integrity?.backupId || '',
        containerHash: container.containerHash || sha256(rawText),
        integrity: verified ? (recovered ? 'repaired' : 'verified') : 'modified',
        status: verified ? 'ok' : 'tampered',
        recovered,
        recoveredBytes,
        recoveredShards,
        footerRecovered: !!container.footerRecovered,
        metadata: {
            app: container.app,
            source: container.source,
            backupId: container.backupId || container.integrity?.backupId || '',
            containerHash: container.containerHash || sha256(rawText),
            createdAt: container.createdAt,
            platform: container.createdBy?.platform || 'unknown',
            native: !!container.createdBy?.native,
            walletCount: container.summary?.walletCount ?? 0,
            folderCount: container.summary?.folderCount ?? 0,
            networkCount: container.summary?.networkCount ?? 0,
            tagCount: container.summary?.tagCount ?? 0,
            portable: !!container.portable,
            scope: container.configSummary?.scope || 'vault',
        },
    };
};

export const parseEncryptedBackupText = async (encryptedText: string, aesKey: string, userPassword: string | null = null) => {
    const container = parseBackupContainer(encryptedText);
    let backupText = encryptedText;
    let inspection: BackupInspection | null = null;
    if (container) {
        inspection = await inspectBackupFile(encryptedText);
        if (inspection.status === 'tampered') {
            await appendAuditLog('backup.tamper_detected', {
                createdAt: inspection.metadata?.createdAt,
                walletCount: inspection.metadata?.walletCount,
            });
            throw new Error('Backup integrity check failed. This file was modified or corrupted.');
        }
        backupText = recoverBackupPayload(container.payload || '', container.recovery).payloadText;
        const payloadHash = sha256(backupText);
        if (container.integrity?.passwordSeal && userPassword && createPasswordSeal(userPassword, payloadHash) !== container.integrity.passwordSeal) {
            throw new Error('Backup password seal failed. Check your password or backup file.');
        }
    }

    let decrypted: BackupPayload | null = null;

    if (userPassword) {
        try {
            decrypted = await decryptBackup(backupText, userPassword);
        } catch {
            // Password failed
        }
    }

    if (!decrypted) {
        try {
            decrypted = await decryptBackup(backupText, aesKey);
        } catch {
            // Device key also failed
        }
    }

    if (!decrypted) {
        throw new Error("Wrong password or corrupted backup file.");
    }

    if (!decrypted.wallets || !Array.isArray(decrypted.wallets)) {
        throw new Error("Invalid backup format");
    }

    if (inspection?.recovered) {
        await appendAuditLog('backup.self_healed', {
            recoveredBytes: inspection.recoveredBytes,
            recoveredShards: inspection.recoveredShards,
            walletCount: decrypted.wallets.length,
        });
    }

    return decrypted;
};

// Parse backup file — auto-detect format
export const parseVaultBackupFile = async (base64Data: string, aesKey: string, userPassword: string | null = null) => {
    try {
        const encryptedText = decodeBackupFileData(base64Data);

        return parseEncryptedBackupText(encryptedText, aesKey, userPassword);
    } catch (e) {
        console.error("Backup import failed", e);
        throw new Error(getErrorMessage(e) || "Failed to decrypt backup. Check your password and try again.");
    }
};
