import { lazy, Suspense, useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { loadWallets, saveWallets, encryptSetting } from '../../utils/storage';
import { exportPortableBackup, getBackupHistory, type BackupHistoryEntry } from '../../utils/backup/backupUtils';
import { verifySavedTextFile } from '../../utils/fileSaver';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useT } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { hapticTap, hapticSuccess } from '../../utils/haptics';
import QRTransferModal from '../qr/QRTransferModal';
import QRReceiveModal from '../qr/QRReceiveModal';
import DangerZone from './DangerZone';
import type { Wallet } from '../../types';
import { AutoBackupSection, type AutoBackupInterval } from './data/AutoBackupSection';
import { VaultBackupSection } from './data/VaultBackupSection';
import { BackupHistorySection } from './data/BackupHistorySection';
import { ShamirSection } from './data/ShamirSection';
import { requireSensitiveAction } from '../../features/security/sensitiveActions';

type DataTabProps = {
  aesKey: string;
  onImport?: (wallets: Wallet[]) => void;
  onWipe?: () => void;
};

const AUTO_BACKUP_INTERVALS: AutoBackupInterval[] = ['off', 'daily', 'weekly'];
const ShamirBackupModal = lazy(() => import('../shamir/ShamirBackupModal'));
const ShamirRestoreModal = lazy(() => import('../shamir/ShamirRestoreModal'));

function SettingsGroupLabel({ children }: { children: string }) {
  return (
    <div className="mt-5 mb-2 px-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-surface-500 first:mt-0">
      {children}
    </div>
  );
}

export default function DataTab({ aesKey, onImport, onWipe }: DataTabProps) {
  // Auto-Backup
  const [autoBackupInterval, setAutoBackupInterval] = useState<AutoBackupInterval>('off');
  const [showAutoBackup, setShowAutoBackup] = useState(false);
  const [autoBackupPassword, setAutoBackupPassword] = useState('');

  // Vault Backup
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [vaultChangedAt, setVaultChangedAt] = useState('');
  const [verifyingBackupId, setVerifyingBackupId] = useState('');
  const [visibleBackupQr, setVisibleBackupQr] = useState('');

  // QR Transfer
  const [showQRTransfer, setShowQRTransfer] = useState(false);
  const [showQRReceive, setShowQRReceive] = useState(false);
  const [showShamirBackup, setShowShamirBackup] = useState(false);
  const [showShamirRestore, setShowShamirRestore] = useState(false);
  const [transferWallets, setTransferWallets] = useState<Wallet[]>([]);
  const [shamirWallets, setShamirWallets] = useState<Wallet[]>([]);

  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();
  const { brandReminders } = useTheme();

  // Load saved auto-backup settings
  useEffect(() => {
    (async () => {
      const { value: abInterval } = await Preferences.get({ key: 'xkey_autobackup_interval' });
      if (AUTO_BACKUP_INTERVALS.includes(abInterval as AutoBackupInterval)) {
        setAutoBackupInterval(abInterval as AutoBackupInterval);
      }
      // Don't load encrypted password into state - user re-enters it
      setBackupHistory(await getBackupHistory());
      const { value: changedAt } = await Preferences.get({ key: 'xkey_vault_last_changed_at' });
      setVaultChangedAt(changedAt || '');
    })();
  }, []);

  const saveAutoBackup = async (interval: AutoBackupInterval) => {
    await Preferences.set({ key: 'xkey_autobackup_interval', value: interval });
    setAutoBackupInterval(interval);
    showToast(t('settings.autoBackupSet', { interval: interval }), 'success');
  };

  const saveAutoBackupPassword = async () => {
    if (autoBackupPassword.length < 6) {
      showToast({ key: 'settings.passwordMinError', category: 'warning' }, 'warning');
      return;
    }
    await Preferences.set({ key: 'xkey_autobackup_password', value: encryptSetting(autoBackupPassword, aesKey) });
    hapticSuccess();
    showToast(t('settings.autoBackupPasswordSaved'), 'success');
  };

  const handleExportPortable = async () => {
    const allowed = await requireSensitiveAction({
      action: 'backup.export',
      reason: t('settings.exportBackup'),
    });
    if (!allowed) return;

    if (!backupPassword || backupPassword.length < 6) {
      showToast(t('settings.passwordMinError'), 'warning');
      return;
    }
    if (backupPassword !== backupPasswordConfirm) {
      showToast({ key: 'settings.passwordMismatch', category: 'warning' }, 'error');
      return;
    }
    setExporting(true);
    try {
      const wallets = await loadWallets(aesKey);
      const success = await exportPortableBackup(wallets, null, backupPassword);
      if (!success) showToast({ key: 'settings.exportFailed', category: 'backup' }, 'error');
      else {
        hapticSuccess();
        showToast({ key: 'settings.exportSuccess', category: 'backup' }, 'success');
        setShowPasswordInput(false);
        setBackupPassword('');
        setBackupPasswordConfirm('');
        setBackupHistory(await getBackupHistory());
      }
    } catch {
      showToast({ key: 'settings.exportError', category: 'backup' }, 'error');
    }
    setExporting(false);
  };

  const handleWipe = async () => {
    const ok = await showConfirm(t('settings.wipeConfirm'), { danger: true });
    if (!ok) return;

    const allowed = await requireSensitiveAction({
      action: 'vault.delete',
      reason: t('settings.wipeAll'),
    });
    if (!allowed) return;

    const { wipeAllData } = await import('../../utils/storage');
    await wipeAllData();
    onWipe?.();
  };

  const verifiedBackupCount = backupHistory.filter(entry => entry.verified).length;

  const handleVerifySavedBackup = async (entry: BackupHistoryEntry) => {
    if (!entry.savedUri || !entry.fileHash) {
      showToast({ key: 'settings.backupVerifyUnavailable', category: 'backup' }, 'warning');
      return;
    }
    setVerifyingBackupId(entry.backupId);
    try {
      const result = await verifySavedTextFile(entry.savedUri, entry.fileHash);
      if (!result.verified || result.size === 0) {
        showToast({ key: 'settings.backupVerifyFailed', category: 'backup' }, 'error');
        return;
      }
      showToast({ key: 'settings.backupVerifySuccess', category: 'backup' }, 'success');
    } catch {
      showToast({ key: 'settings.backupVerifyFailed', category: 'backup' }, 'error');
    } finally {
      setVerifyingBackupId('');
    }
  };

  return (
    <>
      <SettingsGroupLabel>{t('settings.backupTitle')}</SettingsGroupLabel>

      <VaultBackupSection
        t={t}
        brandReminders={brandReminders}
        showPasswordInput={showPasswordInput}
        backupPassword={backupPassword}
        backupPasswordConfirm={backupPasswordConfirm}
        exporting={exporting}
        setShowPasswordInput={setShowPasswordInput}
        setBackupPassword={setBackupPassword}
        setBackupPasswordConfirm={setBackupPasswordConfirm}
        handleExportPortable={handleExportPortable}
        onOpenQrTransfer={async () => {
          hapticTap();
          const w = await loadWallets(aesKey);
          setTransferWallets(w || []);
          setShowQRTransfer(true);
        }}
        onOpenQrReceive={() => { hapticTap(); setShowQRReceive(true); }}
      />

      <AutoBackupSection
        t={t}
        intervals={AUTO_BACKUP_INTERVALS}
        autoBackupInterval={autoBackupInterval}
        showAutoBackup={showAutoBackup}
        autoBackupPassword={autoBackupPassword}
        setShowAutoBackup={setShowAutoBackup}
        setAutoBackupPassword={setAutoBackupPassword}
        saveAutoBackup={saveAutoBackup}
        saveAutoBackupPassword={saveAutoBackupPassword}
      />

      <BackupHistorySection
        t={t}
        brandReminders={brandReminders}
        backupHistory={backupHistory}
        vaultChangedAt={vaultChangedAt}
        verifiedBackupCount={verifiedBackupCount}
        verifyingBackupId={verifyingBackupId}
        visibleBackupQr={visibleBackupQr}
        onVerifySavedBackup={handleVerifySavedBackup}
        setVisibleBackupQr={setVisibleBackupQr}
      />

      <SettingsGroupLabel>{t('shamir.restoreButton')}</SettingsGroupLabel>

      <ShamirSection
        t={t}
        onCreateBackup={async () => {
          const allowed = await requireSensitiveAction({
            action: 'shamir.create_shares',
            reason: t('shamir.create'),
          });
          if (!allowed) return;

          const w = await loadWallets(aesKey);
          setShamirWallets(w || []);
          setShowShamirBackup(true);
        }}
        onRestoreBackup={() => setShowShamirRestore(true)}
      />

      <SettingsGroupLabel>{t('settings.dangerZone')}</SettingsGroupLabel>

      <DangerZone
        title={t('settings.dangerZone')}
        subtitle={t('settings.dangerSubtitle')}
        description={t('settings.wipeDesc')}
        actionLabel={t('settings.wipeAll')}
        onAction={handleWipe}
      />

      {/* Modals */}
      {showQRTransfer && transferWallets.length > 0 && (
        <QRTransferModal wallets={transferWallets} onClose={() => setShowQRTransfer(false)} />
      )}

      {showQRReceive && (
        <QRReceiveModal
          onClose={() => setShowQRReceive(false)}
          onImport={async (importedWallets) => {
            setShowQRReceive(false);
            const current = await loadWallets(aesKey) || [];
            const existingAddrs = new Set(current.map(w => w.address?.toLowerCase()).filter(Boolean));
            const uniqueNew = importedWallets.filter(w => {
              if (!w.address) return true;
              const lower = w.address.toLowerCase();
              if (existingAddrs.has(lower)) return false;
              existingAddrs.add(lower);
              return true;
            });
            const skippedCount = importedWallets.length - uniqueNew.length;
            const finalWallets = [...current, ...uniqueNew];
            await saveWallets(finalWallets, aesKey);
            onImport?.(finalWallets);
            let msg = t('home.importSuccess', { count: uniqueNew.length, folder: 'QR Transfer' });
            if (skippedCount > 0) msg += t('home.duplicatesSkipped', { count: skippedCount });
            showToast(msg, 'success');
          }}
        />
      )}

      {showShamirBackup && (
        <Suspense fallback={null}>
          <ShamirBackupModal wallets={shamirWallets} onClose={() => setShowShamirBackup(false)} />
        </Suspense>
      )}

      {showShamirRestore && (
        <Suspense fallback={null}>
          <ShamirRestoreModal
            aesKey={aesKey}
            onClose={() => setShowShamirRestore(false)}
            onRestore={async (importedWallets) => {
              const current = await loadWallets(aesKey) || [];
              const existingAddrs = new Set(current.map(w => w.address?.toLowerCase()).filter(Boolean));
              const uniqueNew = importedWallets.filter(w => {
                if (!w.address) return true;
                const lower = w.address.toLowerCase();
                if (existingAddrs.has(lower)) return false;
                existingAddrs.add(lower);
                return true;
              });
              const skippedCount = importedWallets.length - uniqueNew.length;
              const finalWallets = [...current, ...uniqueNew];
              await saveWallets(finalWallets, aesKey);
              onImport?.(finalWallets);
              let msg = t('home.importSuccess', { count: uniqueNew.length, folder: 'Shamir QR' });
              if (skippedCount > 0) msg += t('home.duplicatesSkipped', { count: skippedCount });
              showToast(msg, 'success');
            }}
          />
        </Suspense>
      )}
    </>
  );
}
