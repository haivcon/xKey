import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import CryptoJS from 'crypto-js';
import { decryptEnvelope, encryptEnvelope, isCryptoEnvelope } from './cryptoEnvelope';
import { appendAuditLog } from './auditLog';
import { saveTextFile } from './fileSaver';
import {
    BACKUP_FORMAT_V4,
    BACKUP_SOURCE,
    V4_BEGIN,
    V4_END,
    V4_FOOTER,
    V4_HEADER,
    V4_PAYLOAD,
    V4_PAYLOAD_END,
    createBackupId,
    createBackupRecovery,
    createPasswordSeal,
    decodeBackupFileData,
    encodeJsonBlock,
    parseBackupContainer,
    parseV4BackupContainer,
    recoverBackupPayload,
    sha256,
    summarizeWallets,
    type BackupConfig,
    type BackupInspection,
    type BackupPayload,
} from './backupFormat';
import type { Wallet } from '../types';

const BACKUP_HISTORY_KEY = 'xkey_backup_history_v1';
const MAX_BACKUP_HISTORY_ENTRIES = 20;

export type BackupHistoryEntry = {
    fileName: string;
    createdAt: string;
    walletCount: number;
    backupId: string;
    verified?: boolean;
    savedUri?: string;
    fileHash?: string;
};

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error || '');

const getBackupDeviceInfo = async () => {
    try {
        const info = await Device.getInfo();
        return {
            platform: Capacitor.getPlatform(),
            native: Capacitor.isNativePlatform(),
            userAgent: navigator.userAgent || '',
            manufacturer: info.manufacturer || '',
            model: info.model || '',
            osVersion: info.osVersion || '',
        };
    } catch {
        return { platform: Capacitor.getPlatform(), native: Capacitor.isNativePlatform(), userAgent: navigator.userAgent || '' };
    }
};

const createExportFileName = (requestedName: string | undefined, extension: string, fallback: string): string => {
    const baseName = (requestedName || '').trim()
        .split('').map(character => character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character).join('')
        .replace(new RegExp(`\\.${extension}$`, 'i'), '')
        .replace(/[-.\s]+$/g, '')
        .slice(0, 80);
    return `${baseName || fallback}.${extension}`;
};

const recordBackupExport = async (entry: BackupHistoryEntry): Promise<void> => {
    try {
        const { value } = await Preferences.get({ key: BACKUP_HISTORY_KEY });
        const current = value ? JSON.parse(value) : [];
        const history = Array.isArray(current) ? current : [];
        await Preferences.set({ key: BACKUP_HISTORY_KEY, value: JSON.stringify([entry, ...history].slice(0, MAX_BACKUP_HISTORY_ENTRIES)) });
    } catch {
        // Export has already succeeded; history is non-critical.
    }
};

export const getBackupHistory = async (): Promise<BackupHistoryEntry[]> => {
    try {
        const { value } = await Preferences.get({ key: BACKUP_HISTORY_KEY });
        const history = value ? JSON.parse(value) : [];
        return Array.isArray(history) ? history as BackupHistoryEntry[] : [];
    } catch {
        return [];
    }
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
        createdBy: await getBackupDeviceInfo(),
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
export const exportPortableBackup = async (wallets: Wallet[], config: BackupConfig, userPassword: string, requestedFileName?: string): Promise<boolean> => {
    try {
        const encryptedData = await createPortableBackupText(wallets, config, userPassword);
        const fileName = createExportFileName(requestedFileName, 'xkey', `xkey_portable_${new Date().getTime()}`);

        const savedFile = await saveTextFile(fileName, 'application/x-xkey', encryptedData);

        await appendAuditLog('backup.exported', {
            walletCount: wallets.length,
            portable: true,
            fileName,
        });
        const descriptor = parseV4BackupContainer(encryptedData);
        await recordBackupExport({
            fileName,
            createdAt: new Date().toISOString(),
            walletCount: wallets.length,
            backupId: descriptor?.backupId || '',
            verified: Boolean(savedFile.sha256) || !Capacitor.isNativePlatform(),
            savedUri: savedFile.uri,
            fileHash: savedFile.sha256 || sha256(encryptedData),
        });
        return true;
    } catch (e) {
        console.error("Portable backup export failed", e);
        return false;
    }
};

const invalidInspection = (title: string, message: string, messageKey: string): BackupInspection => ({
    legacy: false,
    canPreview: false,
    integrity: 'modified',
    status: 'tampered',
    title,
    message,
    messageKey,
});

export const inspectBackupFile = async (base64Data: string): Promise<BackupInspection> => {
    const rawText = decodeBackupFileData(base64Data);
    if (!rawText.trim()) {
        return invalidInspection('Invalid xKey backup', 'This file is empty or was not saved completely.', 'restore.emptyFile');
    }
    if (rawText.includes(V4_BEGIN) && (!rawText.includes(V4_PAYLOAD) || !rawText.includes(V4_END))) {
        return invalidInspection('Incomplete xKey backup', 'This backup container is incomplete and cannot be imported.', 'restore.incompleteFile');
    }

    const container = parseBackupContainer(rawText);
    if (!container) {
        return {
            legacy: true,
            canPreview: false,
            integrity: 'unknown',
            status: 'legacy',
            title: 'Legacy xKey backup',
            message: 'This backup was created by an older xKey version. Metadata preview is not available until it is decrypted.',
            messageKey: 'restore.legacyNoPreview',
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

    const backupId = container.backupId || container.integrity?.backupId || '';
    const containerHash = container.containerHash || sha256(rawText);
    const verified = sha256(payload) === container.integrity?.payloadHash;
    return {
        legacy: false,
        canPreview: true,
        format: container.format,
        backupId,
        containerHash,
        integrity: verified ? (recovered ? 'repaired' : 'verified') : 'modified',
        status: verified ? 'ok' : 'tampered',
        recovered,
        recoveredBytes,
        recoveredShards,
        footerRecovered: !!container.footerRecovered,
        metadata: {
            app: container.app,
            source: container.source,
            backupId,
            containerHash,
            createdAt: container.createdAt,
            platform: [container.createdBy?.manufacturer, container.createdBy?.model, container.createdBy?.osVersion ? `Android ${container.createdBy.osVersion}` : ''].filter(Boolean).join(' · ') || container.createdBy?.platform || 'unknown',
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

export type { BackupConfig, BackupInspection, BackupPayload };