import { appendAuditLog } from './auditLog';
import {
  createPasswordSeal,
  decodeBackupFileData,
  parseBackupContainer,
  recoverBackupPayload,
  sha256,
  type BackupConfig,
  type BackupInspection,
  type BackupPayload,
} from './backupFormat';
import { decryptBackup } from './backupCrypto';
import { inspectBackupFile } from './backupInspection';

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error || '');

export { createPortableBackupText, decryptBackup, encryptBackup } from './backupCrypto';
export { createExportFileName, exportPortableBackup, getBackupDeviceInfo } from './backupExport';
export { getBackupHistory, recordBackupExport, type BackupHistoryEntry } from './backupHistory';
export { inspectBackupFile } from './backupInspection';

export const parseEncryptedBackupText = async (
  encryptedText: string,
  aesKey: string,
  userPassword: string | null = null,
) => {
  const container = parseBackupContainer(encryptedText);
  let backupText = encryptedText;
  let inspection: BackupInspection | null = null;
  if (container) {
    if (typeof container.version === 'number' && container.version > 2) {
      throw new Error(`Unsupported backup version: ${container.version}`);
    }
    inspection = await inspectBackupFile(encryptedText);
    if (inspection.status === 'tampered') {
      throw new Error('Backup integrity check failed. This file was modified or corrupted.');
    }
    backupText = recoverBackupPayload(container.payload || '', container.recovery).payloadText;
    const payloadHash = sha256(backupText);
    if (
      container.integrity?.passwordSeal
      && userPassword
      && createPasswordSeal(userPassword, payloadHash) !== container.integrity.passwordSeal
    ) {
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
    throw new Error('Wrong password or corrupted backup file.');
  }

  if (!decrypted.wallets || !Array.isArray(decrypted.wallets)) {
    throw new Error('Invalid backup format');
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
export const parseVaultBackupFile = async (
  base64Data: string,
  aesKey: string,
  userPassword: string | null = null,
) => {
  try {
    const encryptedText = decodeBackupFileData(base64Data);
    return parseEncryptedBackupText(encryptedText, aesKey, userPassword);
  } catch (e) {
    console.error('Backup import failed', e);
    throw new Error(getErrorMessage(e) || 'Failed to decrypt backup. Check your password and try again.');
  }
};

export type { BackupConfig, BackupInspection, BackupPayload };