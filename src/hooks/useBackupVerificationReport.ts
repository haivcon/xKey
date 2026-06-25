import { useCallback } from 'react';
import { appendAuditLog } from '../utils/auditLog';
import { secureCopy } from '../utils/clipboard';
import { asNumber, asStringArray, asText } from '../app/valueFormatters';
import type { TranslationFn } from '../contexts/LanguageContext';
import type { BackupPreview } from './useFileImport';

type ShowToast = (
  message: string | { key: string; category?: string },
  type?: 'success' | 'error' | 'warning' | 'info',
  duration?: number,
  action?: { label: string; onClick: () => void | Promise<void> },
) => void;

type UseBackupVerificationReportOptions = {
  backupPreview: BackupPreview | null;
  t: TranslationFn;
  showToast?: ShowToast;
};

export default function useBackupVerificationReport({
  backupPreview,
  t,
  showToast,
}: UseBackupVerificationReportOptions) {
  const createVerificationReport = useCallback(() => {
    if (!backupPreview) return '';

    const metadata = backupPreview.metadata || {};
    const yesNo = (value: boolean) => value ? t('common.yes') : t('common.no');
    const statusLabel = backupPreview.status ? t(`restore.status_${backupPreview.status}`) : t('restore.integrity_unknown');

    return [
      t('restore.reportTitle'),
      `${t('restore.backupFile')}: ${backupPreview.fileName || ''}`,
      `${t('restore.openedExternal')}: ${yesNo(!!backupPreview.openedFromExternal)}`,
      `${t('restore.reportFormat')}: ${backupPreview.format || t('restore.integrity_unknown')}`,
      `${t('restore.backupId')}: ${backupPreview.backupId || asText(metadata.backupId) || ''}`,
      `${t('restore.containerHash')}: ${backupPreview.containerHash || asText(metadata.containerHash) || ''}`,
      `${t('audit.integrity')}: ${t(`restore.integrity_${backupPreview.integrity || 'unknown'}`)}`,
      `${t('restore.reportStatus')}: ${statusLabel}`,
      `${t('restore.createdAt')}: ${asText(metadata.createdAt)}`,
      `${t('restore.createdOn')}: ${asText(metadata.platform)}`,
      `${t('restore.walletCount')}: ${asText(metadata.walletCount)}`,
      `${t('restore.folderCount')}: ${asText(metadata.folderCount)}`,
      `${t('restore.networkCount')}: ${asText(metadata.networkCount)}`,
      `${t('restore.source')}: ${asText(metadata.source)}`,
      `${t('restore.reportRecovered')}: ${yesNo(!!backupPreview.recovered)}`,
      t('restore.recoveredBytes', { count: asNumber(backupPreview.recoveredBytes) }),
      `${t('restore.reportRecoveredShards')}: ${asStringArray(backupPreview.recoveredShards).join(', ')}`,
      `${t('restore.footerRecovered')}: ${yesNo(!!backupPreview.footerRecovered)}`,
    ].join('\n');
  }, [backupPreview, t]);

  const copyVerificationReport = useCallback(async () => {
    const copied = await secureCopy(createVerificationReport(), 120000);
    showToast?.(
      { key: copied ? 'restore.reportCopied' : 'common.error', category: copied ? 'copy' : 'warning' },
      copied ? 'success' : 'error',
    );
    appendAuditLog('backup.verification_report_copied', {
      fileName: backupPreview?.fileName || '',
      integrity: backupPreview?.integrity || 'unknown',
      backupId: backupPreview?.backupId || backupPreview?.metadata?.backupId || '',
    }).catch(() => {});
  }, [backupPreview, createVerificationReport, showToast]);

  const copyBackupPreviewValue = useCallback(async (label: string, value: string) => {
    if (!value) return;
    const copied = await secureCopy(value, 120000);
    showToast?.(
      { key: copied ? 'common.copied' : 'common.error', category: copied ? 'copy' : 'warning' },
      copied ? 'success' : 'error',
    );
    appendAuditLog('backup.metadata_copied', {
      fileName: backupPreview?.fileName || '',
      field: label,
      integrity: backupPreview?.integrity || 'unknown',
    }).catch(() => {});
  }, [backupPreview, showToast]);

  const verifyBackupOnly = useCallback((dismissPasswordPrompt: () => void) => {
    appendAuditLog('backup.verify_only', {
      fileName: backupPreview?.fileName || '',
      openedFromExternal: !!backupPreview?.openedFromExternal,
      integrity: backupPreview?.integrity || 'unknown',
      backupId: backupPreview?.backupId || backupPreview?.metadata?.backupId || '',
      walletCount: backupPreview?.metadata?.walletCount,
    }).catch(() => {});
    dismissPasswordPrompt();
  }, [backupPreview]);

  return {
    createVerificationReport,
    copyVerificationReport,
    copyBackupPreviewValue,
    verifyBackupOnly,
  };
}