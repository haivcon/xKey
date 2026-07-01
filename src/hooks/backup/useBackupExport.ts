import { useCallback, useMemo, useState } from 'react';

import { createPasswordChallengeChoices, getPasswordChallengeProgress, type PasswordChallengeChoice } from '../../features/backup/passwordChallenge';
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
  const [showPasswordChallenge, setShowPasswordChallenge] = useState(false);
  const [passwordChallengeChoices, setPasswordChallengeChoices] = useState<PasswordChallengeChoice[]>([]);
  const [passwordChallengeSelected, setPasswordChallengeSelected] = useState<string[]>([]);

  const passwordChallengeProgress = useMemo(
    () => getPasswordChallengeProgress(backupPassword, passwordChallengeSelected),
    [backupPassword, passwordChallengeSelected],
  );

  const resetPasswordChallenge = useCallback(() => {
    setShowPasswordChallenge(false);
    setPasswordChallengeChoices([]);
    setPasswordChallengeSelected([]);
  }, []);

  const closeBackupExport = useCallback(() => {
    setShowBackupExport(false);
    setBackupPassword('');
    setBackupPasswordConfirm('');
    setBackupFileName('');
    resetPasswordChallenge();
  }, [resetPasswordChallenge]);

  const performExportBackup = useCallback(async () => {
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
  }, [aesKey, backupFileName, backupPassword, closeBackupExport, isDecoyMode, showToast, t]);

  const handleExportBackup = useCallback(async () => {
    if (!backupPassword || backupPassword.length < 6) {
      showToast?.(t('settings.passwordMinError'), 'warning');
      return;
    }
    if (backupPassword !== backupPasswordConfirm) {
      showToast?.(t('settings.passwordMismatch'), 'error');
      return;
    }

    setPasswordChallengeChoices(createPasswordChallengeChoices(backupPassword));
    setPasswordChallengeSelected([]);
    setShowPasswordChallenge(true);
  }, [backupPassword, backupPasswordConfirm, showToast, t]);

  const cancelPasswordChallenge = useCallback(() => {
    resetPasswordChallenge();
  }, [resetPasswordChallenge]);

  const selectPasswordChallengeCharacter = useCallback((character: string) => {
    setPasswordChallengeSelected((current) => {
      const next = [...current, character];
      const progress = getPasswordChallengeProgress(backupPassword, next);
      if (!progress.isPrefixValid) {
        showToast?.(t('backupExportChallenge.invalid'), 'error');
        return [];
      }
      if (progress.isValid) {
        setTimeout(() => {
          resetPasswordChallenge();
          void performExportBackup();
        }, 0);
      }
      return next;
    });
  }, [backupPassword, performExportBackup, resetPasswordChallenge, showToast, t]);

  const clearPasswordChallengeSelection = useCallback(() => {
    setPasswordChallengeSelected([]);
  }, []);

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
    showPasswordChallenge,
    passwordChallengeChoices,
    passwordChallengeSelected,
    passwordChallengeProgress,
    closeBackupExport,
    handleExportBackup,
    cancelPasswordChallenge,
    selectPasswordChallengeCharacter,
    clearPasswordChallengeSelection,
  };
}