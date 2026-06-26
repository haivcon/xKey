import { Download, Lock, ShieldAlert, ShieldCheck, QrCode, Camera } from 'lucide-react';
import PasswordInput from '../../shared/PasswordInput';
import Notice from '../../shared/Notice';
import { hapticTap } from '../../../utils/haptics';
import { XKEY_SLOGAN } from '../../../utils/branding';
import type { TranslationFn } from '../../../contexts/LanguageContext';

type VaultBackupSectionProps = {
  t: TranslationFn;
  brandReminders: boolean;
  showPasswordInput: boolean;
  backupPassword: string;
  backupPasswordConfirm: string;
  exporting: boolean;
  setShowPasswordInput: (show: boolean) => void;
  setBackupPassword: (password: string) => void;
  setBackupPasswordConfirm: (password: string) => void;
  handleExportPortable: () => void;
  onOpenQrTransfer: () => void;
  onOpenQrReceive: () => void;
};

export function VaultBackupSection({
  t,
  brandReminders,
  showPasswordInput,
  backupPassword,
  backupPasswordConfirm,
  exporting,
  setShowPasswordInput,
  setBackupPassword,
  setBackupPasswordConfirm,
  handleExportPortable,
  onOpenQrTransfer,
  onOpenQrReceive,
}: VaultBackupSectionProps) {
  const cancelPasswordInput = () => {
    setShowPasswordInput(false);
    setBackupPassword('');
    setBackupPasswordConfirm('');
  };

  return (
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

      <div className="mb-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3.5 text-center">
        <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck size={16} className="text-emerald-400" />
        </div>
        <div className="mx-auto max-w-2xl">
          {brandReminders && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300">{XKEY_SLOGAN}</p>}
          <p className={`${brandReminders ? 'mt-1' : ''} text-xs text-surface-300 leading-relaxed`}>{t('settings.backupInfo')}</p>
        </div>
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
            <button onClick={cancelPasswordInput}
              className="btn-glow flex-1 bg-surface-700 hover:bg-surface-600 text-surface-300 py-2.5 rounded-lg text-sm transition-colors">{t('common.cancel')}</button>
            <button onClick={handleExportPortable} disabled={exporting}
              className="btn-glow btn-glow-success flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {exporting ? t('settings.exporting') : t('settings.exportBackup')}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-surface-700/50 flex gap-2">
        <button onClick={onOpenQrTransfer}
          className="btn-glow flex-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
          <QrCode size={16} />
          {t('settings.qrTransferBtn')}
        </button>
        <button onClick={onOpenQrReceive}
          className="btn-glow flex-1 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
          <Camera size={16} />
          {t('settings.qrReceiveBtn') || 'Receive QR'}
        </button>
      </div>
    </div>
  );
}