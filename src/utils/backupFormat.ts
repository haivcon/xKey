import CryptoJS from 'crypto-js';
import { decodeReedSolomon, encodeReedSolomon, reedSolomonDefaults } from './reedSolomon';
import type { Wallet } from '../types';

export const BACKUP_FORMAT_V3 = 'xkey-backup-v3';
export const BACKUP_FORMAT_V4 = 'xkey-backup-v4';
export const BACKUP_SOURCE = 'github.com/haivcon/xKey';
export const V4_BEGIN = '-----BEGIN XKEY BACKUP V4-----';
export const V4_HEADER = '-----BEGIN XKEY HEADER-----';
export const V4_PAYLOAD = '-----BEGIN XKEY PAYLOAD-----';
export const V4_PAYLOAD_END = '-----END XKEY PAYLOAD-----';
export const V4_FOOTER = '-----BEGIN XKEY RECOVERY FOOTER-----';
export const V4_END = '-----END XKEY BACKUP V4-----';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type BackupConfig = {
    scope?: string;
    [key: string]: unknown;
} | null | undefined;

export type BackupPayload = {
    wallets?: Wallet[];
    config?: BackupConfig;
    [key: string]: unknown;
};

export type BackupSummary = {
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

export type BackupRecovery = {
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

export type BackupDescriptor = {
    format?: string;
    app?: string;
    source?: string;
    backupId?: string;
    createdAt?: string;
    createdBy?: {
        platform?: string;
        native?: boolean;
        userAgent?: string;
        manufacturer?: string;
        model?: string;
        osVersion?: string;
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

export type BackupRecoveryResult = {
    payloadText: string;
    recovered: boolean;
    recoveredBytes: number;
    recoveredShards?: number[];
};

export type BackupInspection = {
    legacy: boolean;
    canPreview: boolean;
    integrity: string;
    status: string;
    title?: string;
    message?: string;
    messageKey?: string;
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

export const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

export const base64ToBytes = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

export const sha256 = (value: string): string => CryptoJS.SHA256(value).toString();

export const encodeJsonBlock = (value: unknown): string => bytesToBase64(textEncoder.encode(JSON.stringify(value)));

const decodeJsonBlock = <T = BackupDescriptor>(value: string): T => JSON.parse(textDecoder.decode(base64ToBytes(value.trim()))) as T;

export const createPasswordSeal = (password: string | null | undefined, payloadHash: string): string => {
    if (!password) return '';
    return sha256(`xkey-backup-seal-v1|${password}|${payloadHash}`);
};

export const createBackupId = (payloadHash: string, createdAt: string, summary?: Partial<BackupSummary>): string => sha256([
    'xkey-backup-id-v1',
    payloadHash,
    createdAt,
    summary?.walletCount ?? 0,
    summary?.folderCount ?? 0,
].join('|')).slice(0, 20);

export const summarizeWallets = (wallets: Wallet[] = []): BackupSummary => {
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

export const createBackupRecovery = (payloadText: string): BackupRecovery => {
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

export const recoverBackupPayload = (payloadText: string, recovery?: BackupRecovery): BackupRecoveryResult => {
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
        return {
            payloadText: textDecoder.decode(recovered),
            recovered: true,
            recoveredBytes: invalidIndexes.length * recovery.shardSize,
            recoveredShards: invalidIndexes,
        };
    } catch {
        return { payloadText, recovered: false, recoveredBytes: 0, recoveredShards: invalidIndexes };
    }
};

export const decodeBackupFileData = (fileData: string): string => {
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

export const parseV4BackupContainer = (text: string): BackupDescriptor | null => {
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

export const parseBackupContainer = (text: string): BackupDescriptor | null => {
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