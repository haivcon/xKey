import { appendAuditLog } from '../auditLog';
import {
  BACKUP_SOURCE,
  V4_BEGIN,
  V4_END,
  V4_PAYLOAD,
  decodeBackupFileData,
  parseBackupContainer,
  recoverBackupPayload,
  sha256,
  type BackupInspection,
} from './backupFormat';

const invalidInspection = (title: string, message: string, messageKey: string): BackupInspection => ({
  legacy: false,
  canPreview: false,
  integrity: 'modified',
  status: 'tampered',
  title,
  message,
  messageKey,
});


const formatBackupSource = (source?: string, appVersion?: string): string => {
  const normalizedSource = source || BACKUP_SOURCE;
  const normalizedVersion = (appVersion || '').trim();
  return normalizedVersion ? `${normalizedSource} + v${normalizedVersion.replace(/^v/i, '')}` : normalizedSource;
};

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
  const result: BackupInspection = {
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
      source: formatBackupSource(container.source, container.appVersion),
      appVersion: container.appVersion,
      backupId,
      containerHash,
      createdAt: container.createdAt,
      platform:
        [
          container.createdBy?.manufacturer,
          container.createdBy?.model,
          container.createdBy?.osVersion ? `Android ${container.createdBy.osVersion}` : '',
        ].filter(Boolean).join(' · ') || container.createdBy?.platform || 'unknown',
      native: !!container.createdBy?.native,
      walletCount: container.summary?.walletCount ?? 0,
      folderCount: container.summary?.folderCount ?? 0,
      networkCount: container.summary?.networkCount ?? 0,
      tagCount: container.summary?.tagCount ?? 0,
      portable: !!container.portable,
      scope: container.configSummary?.scope || 'vault',
    },
  };

  if (result.status === 'tampered') {
    await appendAuditLog('backup.tamper_detected', {
      createdAt: result.metadata?.createdAt,
      walletCount: result.metadata?.walletCount,
    });
  }

  return result;
};