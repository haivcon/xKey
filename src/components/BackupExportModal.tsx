import { ShieldAlert, UploadCloud } from 'lucide-react';
import BrandSlogan from './BrandSlogan';
import PasswordInput from './PasswordInput';
import { hapticTap } from '../utils/haptics';
import type { TranslationFn } from '../contexts/LanguageContext';

type BackupExportModalProps = {
  fileName: string;
  password: string;
  passwordConfirm: string;
  exporting: boolean;
  brandReminders: boolean;
  t: TranslationFn;
  onFileNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onClose: () => void;
  onExport: () => void;
};

export default function BackupExportModal({
  fileName,
  password,
  passwordConfirm,
  exporting,
  brandReminders,
  t,
  onFileNameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onClose,
  onExport,
}: BackupExportModalProps) {
  const handleClose = () => {
    hapticTap();
    onClose();
  };

  const handleExport = () => {
    hapticTap();
    onExport();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <UploadCloud size={22} className="text-emerald-400" />
        </div>
        <h3 className="text-white font-bold text-center mb-1">{t('actionBar.exportBackup')}</h3>
        <p className="text-surface-400 text-sm text-center mb-5">{t('settings.backupSubtitle')}</p>
        {brandReminders && <BrandSlogan note={t('brand.backupExportNote')} tone="success" className="mb-4 text-center" />}
        <div className="space-y-3">
          <input
            value={fileName}
            onChange={(event) => onFileNameChange(event.target.value)}
            placeholder={t('settings.backupFileName')}
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
          />
          <PasswordInput
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={t('settings.backupPassword')}
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
          />
          <PasswordInput
            value={passwordConfirm}
            onChange={(event) => onPasswordConfirmChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onExport()}
            placeholder={t('settings.confirmPassword')}
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
          />
          <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-2.5 flex gap-2">
            <ShieldAlert size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-yellow-300/80 leading-relaxed">{t('settings.passwordWarning')}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={handleClose}
            className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 py-2.5 rounded-lg font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-glow btn-glow-success flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {exporting ? t('settings.exporting') : t('settings.exportBackup')}
          </button>
        </div>
      </div>
    </div>
  );
}