import CryptoJS from 'crypto-js';
import { decryptEnvelope, encryptEnvelope, isCryptoEnvelope } from '../crypto/cryptoEnvelope';
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
  encodeJsonBlock,
  sha256,
  summarizeWallets,
  type BackupConfig,
  type BackupPayload,
} from './backupFormat';
import type { Wallet } from '../../types';
import { getBackupDeviceInfo } from './backupExport';

const XKEY_APP_VERSION = typeof __XKEY_APP_VERSION__ !== 'undefined' ? __XKEY_APP_VERSION__ : '0.0.0';

export const encryptBackup = async (data: BackupPayload, key: string): Promise<string> => {
  return encryptEnvelope(data, key);
};

export const decryptBackup = async (cipherText: string, key: string): Promise<BackupPayload> => {
  if (isCryptoEnvelope(cipherText)) {
    return decryptEnvelope<BackupPayload>(cipherText, key);
  }
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
  if (!decryptedStr) throw new Error('Invalid Key');
  return JSON.parse(decryptedStr) as BackupPayload;
};

export const createPortableBackupText = async (
  wallets: Wallet[],
  config: BackupConfig,
  userPassword: string,
): Promise<string> => {
  const backupPayload = {
    version: 2,
    portable: true,
    timestamp: new Date().toISOString(),
    wallets,
    config,
  };

  const encryptedPayload = await encryptBackup(backupPayload, userPassword);
  const payloadHash = sha256(encryptedPayload);
  const summary = summarizeWallets(wallets);
  const backupId = createBackupId(payloadHash, backupPayload.timestamp, summary);
  const metadata = {
    format: BACKUP_FORMAT_V4,
    app: 'xKey',
    source: BACKUP_SOURCE,
    appVersion: XKEY_APP_VERSION,
    backupId,
    createdAt: backupPayload.timestamp,
    createdBy: await getBackupDeviceInfo(),
    portable: true,
    version: backupPayload.version,
    summary,
    configSummary: config
      ? {
          hasConfig: true,
          scope: config.scope || 'vault',
        }
      : { hasConfig: false },
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