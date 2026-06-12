import { useEffect, useState } from 'react';
import { Download, Lock, ShieldCheck, ShieldAlert, Save, ChevronDown, QrCode, Camera } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { loadWallets, saveWallets, encryptSetting } from '../../utils/storage';
import { exportPortableBackup } from '../../utils/backupUtils';
import { useToast } from '../../contexts/ToastContext';
import { useT } from '../../contexts/LanguageContext';
import { hapticTap, hapticSuccess } from '../../utils/haptics';
import PasswordInput from '../PasswordInput';
import QRTransferModal from '../QRTransferModal';
import QRReceiveModal from '../QRReceiveModal';

export default function DataTab({ aesKey, onImport }) {
  // Auto-Backup
  const [autoBackupInterval, setAutoBackupInterval] = useState('off');
  const [showAutoBackup, setShowAutoBackup] = useState(false);
  const [autoBackupPassword, setAutoBackupPassword] = useState('');

  // Vault Backup
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [exporting, setExporting] = useState(false);

  // QR Transfer
  const [showQRTransfer, setShowQRTransfer] = useState(false);
  const [showQRReceive, setShowQRReceive] = useState(false);
  const [transferWallets, setTransferWallets] = useState([]);

  const { showToast } = useToast();
  const t = useT();

  // Load saved auto-backup settings
  useEffect(() => {
    (async () => {
      const { value: abInterval } = await Preferences.get({ key: 'xkey_autobackup_interval' });
      if (abInterval) setAutoBackupInterval(abInterval);
      // Don't load encrypted password into state - user re-enters it
    })();
  }, []);

  const saveAutoBackup = async (interval) => {
    await Preferences.set({ key: 'xkey_autobackup_interval', value: interval });
    setAutoBackupInterval(interval);
    showToast(t('settings.autoBackupSet', { interval: interval }), 'success');
  };

  const saveAutoBackupPassword = async () => {
    if (autoBackupPassword.length < 6) {
      showToast(t('settings.passwordMinError'), 'warning');
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
      showToast(t('settings.passwordMismatch'), 'error');
      return;
    }
    setExporting(true);
    try {
      const wallets = await loadWallets(aesKey);
      const success = await exportPortableBackup(wallets, null, backupPassword);
      if (!success) showToast(t('settings.exportFailed'), 'error');
      else {
        hapticSuccess();
        showToast(t('settings.exportSuccess'), 'success');
        setShowPasswordInput(false);
        setBackupPassword('');
        setBackupPasswordConfirm('');
      }
    } catch {
      showToast(t('settings.exportError'), 'error');
    }
    setExporting(false);
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
              {['off', 'daily', 'weekly'].map(opt => (
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

        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 mb-5 flex gap-2.5">
          <ShieldCheck size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-surface-300 leading-relaxed">{t('settings.backupInfo')}</p>
        </div>

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
                value={backupPassword} autoFocus
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
              <p className="text-[11px] text-yellow-300/80 leading-relaxed">{t('settings.passwordWarning')}</p>
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
            if (typeof onImport === 'function') onImport(finalWallets);
            let msg = t('home.importSuccess', { count: uniqueNew.length, folder: 'QR Transfer' });
            if (skippedCount > 0) msg += t('home.duplicatesSkipped', { count: skippedCount });
            showToast(msg, 'success');
          }}
        />
      )}
    </>
  );
}
