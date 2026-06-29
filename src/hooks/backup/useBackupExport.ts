import { useCallback, useState } from 'react';

import { loadWallets } from '../../utils/storage';
import { exportPortableBackup } from '../../utils/backup/backupUtils';
import { hapticSuccess } from '../../utils/haptics';
import { requireSensitiveAction } from '../../features/security/sensitiveActions';
import type { TranslationFn } from '../../contexts/LanguageContext';

interface UseBackupExportOptions {
  aesKey: string | null;
  isDecoyMode: boolean;
  showToast?: (message: unknown, type?: string) => void;
  t: TranslationFn;
}

export default function useBackupExport({ aesKey, isDecoyMode, showToast, t }: UseBackupExportOptions) {
  const [showBackupExport, setShowBackupExport] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [backupFileName, setBackupFileName] = useState('');
  const [backupExporting, setBackupExporting] = useState(false);

  const closeBackupExport = useCallback(() => {
    setShowBackupExport(false);
    setBackupPassword('');
    setBackupPasswordConfirm('');
    setBackupFileName('');
  }, []);

  const handleExportBackup = useCallback(async () => {
    if (!backupPassword || backupPassword.length < 6) {
      showToast?.(t('settings.passwordMinError'), 'warning');
      return;
    }
    if (backupPassword !== backupPasswordConfirm) {
      showToast?.(t('settings.passwordMismatch'), 'error');
      return;
    }

    setBackupExporting(true);
    try {
      const verified = await requireSensitiveAction({
        action: 'backup.export',
        reason: t('settings.exportBackup'),
        metadata: { decoy: isDecoyMode },
      });
      if (!verified) {
        showToast?.(t('common.cancel'), 'warning');
        return;
      }

      const currentWallets = await loadWallets(aesKey, isDecoyMode);
      const success = await exportPortableBackup(currentWallets || [], null, backupPassword, backupFileName);
      if (success) {
        hapticSuccess();
        showToast?.(t('settings.exportSuccess'), 'success');
        closeBackupExport();
      } else {
        showToast?.(t('settings.exportFailed'), 'error');
      }
    } catch {
      showToast?.(t('settings.exportError'), 'error');
    } finally {
      setBackupExporting(false);
    }
  }, [aesKey, backupFileName, backupPassword, backupPasswordConfirm, closeBackupExport, isDecoyMode, showToast, t]);

  return {
    showBackupExport,
    setShowBackupExport,
    backupPassword,
    setBackupPassword,
    backupPasswordConfirm,
    setBackupPasswordConfirm,
    backupFileName,
    setBackupFileName,
    backupExporting,
    closeBackupExport,
    handleExportBackup,
  };
}