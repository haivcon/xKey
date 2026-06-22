import { useEffect, useState } from 'react';
import { Download, Lock, ShieldCheck, ShieldAlert, Save, ChevronDown, QrCode, Camera, SplitSquareVertical, CheckCircle2, MapPin, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Preferences } from '@capacitor/preferences';
import { loadWallets, saveWallets, encryptSetting } from '../../utils/storage';
import { exportPortableBackup, getBackupHistory, type BackupHistoryEntry } from '../../utils/backupUtils';
import { verifySavedTextFile } from '../../utils/fileSaver';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useT } from '../../contexts/LanguageContext';
import { hapticTap, hapticSuccess } from '../../utils/haptics';
import PasswordInput from '../PasswordInput';
import QRTransferModal from '../QRTransferModal';
import QRReceiveModal from '../QRReceiveModal';
import ShamirBackupModal from '../ShamirBackupModal';
import ShamirRestoreModal from '../ShamirRestoreModal';
import DangerZone from './DangerZone';
import Notice from '../Notice';
import type { Wallet } from '../../types';

type AutoBackupInterval = 'off' | 'daily' | 'weekly';

type DataTabProps = {
  aesKey: string;
  onImport?: (wallets: Wallet[]) => void;
  onWipe?: () => void;
};

const AUTO_BACKUP_INTERVALS: AutoBackupInterval[] = ['off', 'daily', 'weekly'];

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
      {/* ═══ Auto-Backup ═══ */}
      <div className="glass-card overflow-hidden">
        <button onClick={() => { hapticTap(); setShowAutoBackup(!showAutoBackup); }}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Save size={20} className="text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-medium">{t('settings.autoBackupTitle')}</h3>
              <p className="text-xs text-surface-400">{t('settings.autoBackupStatus', { interval: t(`settings.${autoBackupInterval}`) || autoBackupInterval })}</p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-surface-500 transition-transform ${showAutoBackup ? 'rotate-180' : ''}`} />
        </button>
        {showAutoBackup && (
          <div className="px-4 pb-4 border-t border-surface-700/50 space-y-3 pt-3">
            <div className="flex gap-2">
              {AUTO_BACKUP_INTERVALS.map(opt => (
                <button key={opt} onClick={() => saveAutoBackup(opt)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${autoBackupInterval === opt ? 'bg-brand-500/15 border-2 border-brand-500/40 text-white' : 'bg-surface-800 border-2 border-transparent text-surface-400 hover:text-white'}`}>
                  {t(`settings.${opt}`) || opt}
                </button>
              ))}
            </div>
            {autoBackupInterval !== 'off' && (
              <div className="flex gap-2">
                <PasswordInput value={autoBackupPassword} onChange={e => setAutoBackupPassword(e.target.value)}
                  placeholder={t('settings.backupPassword')} wrapperClassName="flex-1"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <button onClick={saveAutoBackupPassword}
                  className="btn-glow bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm transition-all">{t('common.save')}</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Vault Backup ═══ */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Download size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('settings.backupTitle')}</h2>
            <p className="text-xs text-surface-400">{t('settings.backupSubtitle')}</p>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 mb-3 flex gap-2.5">
          <ShieldCheck size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-surface-300 leading-relaxed">{t('settings.backupInfo')}</p>
        </div>
        <Notice variant="warning" className="mb-5">
          {t('settings.hardwareBoundPortableBackupNote')}
        </Notice>

        {!showPasswordInput ? (
          <button
            onClick={() => { hapticTap(); setShowPasswordInput(true); }}
            disabled={exporting}
            className="btn-glow btn-glow-success w-full bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            {t('settings.createBackup')}
          </button>
        ) : (
          <div className="space-y-3 bg-surface-800/50 p-4 rounded-xl border border-surface-700">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">{t('settings.backupPassword')}</label>
              <PasswordInput
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder={t('settings.passwordMin')}
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">{t('settings.confirmPassword')}</label>
              <PasswordInput
                value={backupPasswordConfirm}
                onChange={(e) => setBackupPasswordConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExportPortable()}
                placeholder={t('settings.reenterPassword')}
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
              />
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-2.5 flex gap-2">
              <ShieldAlert size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300/80 leading-relaxed">{t('settings.passwordWarning')}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowPasswordInput(false); setBackupPassword(''); setBackupPasswordConfirm(''); }}
                className="btn-glow flex-1 bg-surface-700 hover:bg-surface-600 text-surface-300 py-2.5 rounded-lg text-sm transition-colors">{t('common.cancel')}</button>
              <button onClick={handleExportPortable} disabled={exporting}
                className="btn-glow btn-glow-success flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {exporting ? t('settings.exporting') : t('settings.exportBackup')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-surface-700/50 flex gap-2">
          <button onClick={async () => {
            hapticTap();
            const w = await loadWallets(aesKey);
            setTransferWallets(w || []);
            setShowQRTransfer(true);
          }}
            className="btn-glow flex-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
            <QrCode size={16} />
            {t('settings.qrTransferBtn')}
          </button>
          <button onClick={() => { hapticTap(); setShowQRReceive(true); }}
            className="btn-glow flex-1 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
            <Camera size={16} />
            {t('settings.qrReceiveBtn') || 'Receive QR'}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10"><Download size={20} className="text-brand-400" /></div>
          <div><h2 className="text-lg font-semibold text-white">{t('settings.backupHistoryTitle')}</h2><p className="text-xs text-surface-400">{t('settings.backupHistoryDesc')}</p></div>
        </div>
        {backupHistory.length > 0 && vaultChangedAt && new Date(vaultChangedAt).getTime() > new Date(backupHistory[0].createdAt).getTime() && (
          <Notice variant="warning" className="mb-4">{t('settings.backupOutdated')}</Notice>
        )}
        {verifiedBackupCount < 2 && (
          <Notice variant="warning" className="mb-4">{t('settings.backupRetentionNotice')}</Notice>
        )}
        {backupHistory.length === 0 ? <p className="text-sm text-surface-500">{t('settings.backupHistoryEmpty')}</p> : (
          <div className="space-y-2">
            {backupHistory.map((entry, index) => <div key={`${entry.backupId}-${index}`} className="rounded-lg border border-surface-700 bg-surface-800/50 p-3 text-xs">
              <div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate font-semibold text-surface-200">{entry.fileName}</span><span className="shrink-0 text-surface-500">{new Date(entry.createdAt).toLocaleString()}</span></div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-surface-400"><span>{t('settings.backupHistoryWallets', { count: entry.walletCount })}</span><code>{entry.backupId}</code>{entry.verified && <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={12} />{t('settings.backupVerified')}</span>}</div>
              {entry.savedUri && <div className="mt-1 flex items-center gap-1 truncate text-surface-500"><MapPin size={11} /><span className="truncate">{entry.savedUri}</span></div>}
              {entry.savedUri && entry.fileHash && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerifySavedBackup(entry)}
                    disabled={verifyingBackupId === entry.backupId}
                    className="inline-flex items-center gap-1.5 rounded-md border border-brand-500/20 bg-brand-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-300 hover:bg-brand-500/20 disabled:opacity-60"
                  >
                    <RefreshCw size={12} className={verifyingBackupId === entry.backupId ? 'animate-spin' : ''} />
                    {verifyingBackupId === entry.backupId ? t('settings.backupVerifying') : t('settings.backupVerifySaved')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleBackupQr(current => current === entry.backupId ? '' : entry.backupId)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <QrCode size={12} />
                    {t('settings.backupIdQr')}
                  </button>
                </div>
              )}
              {visibleBackupQr === entry.backupId && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-900/70 p-3">
                  <div className="rounded bg-white p-2">
                    <QRCodeSVG value={JSON.stringify({ type: 'xkey-backup-id', backupId: entry.backupId, hash: (entry.fileHash || '').slice(0, 16), createdAt: entry.createdAt })} size={88} bgColor="#ffffff" fgColor="#000000" level="Q" />
                  </div>
                  <p className="text-xs leading-relaxed text-surface-400">{t('settings.backupIdQrDesc')}</p>
                </div>
              )}
            </div>)}
          </div>
        )}
      </div>

      {/* ═══ Single Wallet Shamir Backup ═══ */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <SplitSquareVertical size={20} className="text-cyan-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('shamir.sectionTitle')}</h2>
            <p className="text-xs text-surface-400">{t('shamir.sectionSubtitle')}</p>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3.5">
          <p className="text-xs leading-relaxed text-surface-300">{t('shamir.singleWalletDesc')}</p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={async () => {
              hapticTap();
              const w = await loadWallets(aesKey);
              setShamirWallets(w || []);
              setShowShamirBackup(true);
            }}
            className="btn-glow flex items-center justify-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20"
          >
            <QrCode size={16} />
            {t('shamir.createSingleButton')}
          </button>
          <button
            onClick={() => { hapticTap(); setShowShamirRestore(true); }}
            className="btn-glow flex items-center justify-center gap-2 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 text-sm font-medium text-fuchsia-300 hover:bg-fuchsia-500/20"
          >
            <Camera size={16} />
            {t('shamir.restoreButton')}
          </button>
        </div>
      </div>

      {/* ═══ Danger Zone ═══ */}
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
        <ShamirBackupModal wallets={shamirWallets} onClose={() => setShowShamirBackup(false)} />
      )}

      {showShamirRestore && (
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
      )}
    </>
  );
}
