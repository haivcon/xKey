import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { appendAuditLog } from '../auditLog';
import { saveTextFile } from '../fileSaver';
import { BACKUP_FORMAT_V4, parseV4BackupContainer, sha256, type BackupConfig } from './backupFormat';
import type { Wallet } from '../../types';
import { createPortableBackupText } from './backupCrypto';
import { recordBackupExport } from './backupHistory';

const XKEY_APP_VERSION = typeof __XKEY_APP_VERSION__ !== 'undefined' ? __XKEY_APP_VERSION__ : '0.0.0';

const formatBackupTimestamp = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
};

const createDefaultBackupFileName = (walletCount: number, date = new Date()): string => (
  `xKey-backup(${walletCount})-${formatBackupTimestamp(date)}-v${XKEY_APP_VERSION}`
);

export const getBackupDeviceInfo = async () => {
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
    return {
      platform: Capacitor.getPlatform(),
      native: Capacitor.isNativePlatform(),
      userAgent: navigator.userAgent || '',
    };
  }
};

export const createExportFileName = (
  requestedName: string | undefined,
  extension: string,
  fallback: string,
): string => {
  const baseName = (requestedName || '')
    .trim()
    .split('')
    .map(character => (character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character))
    .join('')
    .replace(new RegExp(`\\.${extension}$`, 'i'), '')
    .replace(/[-.\s]+$/g, '')
    .slice(0, 80);
  return `${baseName || fallback}.${extension}`;
};

// #14: Portable backup (uses user-chosen password)
export const exportPortableBackup = async (
  wallets: Wallet[],
  config: BackupConfig,
  userPassword: string,
  requestedFileName?: string,
): Promise<boolean> => {
  try {
    const encryptedData = await createPortableBackupText(wallets, config, userPassword);
    const fileName = createExportFileName(requestedFileName, 'xKey', createDefaultBackupFileName(wallets.length));

    const savedFile = await saveTextFile(fileName, 'application/x-xkey', encryptedData);

    await appendAuditLog('backup.exported', {
      walletCount: wallets.length,
      portable: true,
      fileName,
      format: BACKUP_FORMAT_V4,
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
    console.error('Portable backup export failed', e);
    return false;
  }
};