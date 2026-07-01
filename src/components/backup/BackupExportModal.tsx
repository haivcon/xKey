import { RotateCcw, ShieldAlert, UploadCloud } from 'lucide-react';
import BrandSlogan from '../shared/BrandSlogan';
import PasswordInput from '../shared/PasswordInput';
import { hapticTap } from '../../utils/haptics';
import type { TranslationFn } from '../../contexts/LanguageContext';
import type { PasswordChallengeChoice } from '../../features/backup/passwordChallenge';

type BackupExportModalProps = {
  fileName: string;
  password: string;
  passwordConfirm: string;
  exporting: boolean;
  brandReminders: boolean;
  showPasswordChallenge: boolean;
  passwordChallengeChoices: PasswordChallengeChoice[];
  passwordChallengeSelected: string[];
  passwordChallengeComplete: boolean;
  t: TranslationFn;
  onFileNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onClose: () => void;
  onExport: () => void;
  onCancelPasswordChallenge: () => void;
  onSelectPasswordChallengeCharacter: (character: string) => void;
  onClearPasswordChallengeSelection: () => void;
};

export default function BackupExportModal({
  fileName,
  password,
  passwordConfirm,
  exporting,
  brandReminders,
  showPasswordChallenge,
  passwordChallengeChoices,
  passwordChallengeSelected,
  passwordChallengeComplete,
  t,
  onFileNameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onClose,
  onExport,
  onCancelPasswordChallenge,
  onSelectPasswordChallengeCharacter,
  onClearPasswordChallengeSelection,
}: BackupExportModalProps) {
  const handleClose = () => {
    hapticTap();
    onClose();
  };

  const handleExport = () => {
    hapticTap();
    onExport();
  };

  const handleCancelChallenge = () => {
    hapticTap();
    onCancelPasswordChallenge();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="my-auto h-auto w-[calc(100vw-1rem)] max-w-xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-4 shadow-2xl sm:p-6 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)]">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <UploadCloud size={22} className="text-emerald-400" />
        </div>
        <h3 className="text-white font-bold text-center mb-1">{t('actionBar.exportBackup')}</h3>
        <p className="text-surface-400 text-sm text-center mb-5">{t('settings.backupSubtitle')}</p>
        {brandReminders && <BrandSlogan note={t('brand.backupExportNote')} tone="success" className="mb-4 text-center" />}

        {showPasswordChallenge ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3 sm:p-4">
              <p className="text-sm font-semibold text-emerald-200">{t('backupExportChallenge.title')}</p>
              <p className="mt-1 text-xs leading-relaxed text-surface-300">{t('backupExportChallenge.description')}</p>
              <div className="mt-3 rounded-xl border border-surface-700 bg-surface-950/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-surface-500">
                  <span>{t('backupExportChallenge.selected')}</span>
                  <span>{passwordChallengeSelected.length}/{Array.from(password).length}</span>
                </div>
                <div className="flex min-h-9 flex-wrap gap-1.5">
                  {Array.from(password).map((_, index) => (
                    <span
                      key={index}
                      className={`h-8 min-w-7 rounded-lg border px-2 text-center text-sm font-semibold leading-8 ${
                        passwordChallengeSelected[index]
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                          : 'border-surface-700 bg-surface-800 text-surface-500'
                      }`}
                    >
                      {passwordChallengeSelected[index] || '•'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid max-h-44 grid-cols-6 gap-2 overflow-y-auto pr-1 sm:max-h-56 sm:grid-cols-8">
                {passwordChallengeChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => onSelectPasswordChallengeCharacter(choice.char)}
                    disabled={exporting || passwordChallengeComplete}
                    className="btn-glow h-10 rounded-xl border border-surface-700 bg-surface-800 text-sm font-bold text-white transition-colors hover:border-emerald-500/60 hover:bg-surface-700 disabled:opacity-50"
                    aria-label={t('backupExportChallenge.pickCharacter', { char: choice.char })}
                  >
                    {choice.char}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onClearPasswordChallengeSelection}
                  disabled={exporting || passwordChallengeSelected.length === 0}
                  className="btn-glow flex items-center justify-center gap-2 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  {t('common.clear')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelChallenge}
                  disabled={exporting}
                  className="btn-glow flex-1 rounded-lg bg-surface-800 px-3 py-2 text-sm font-medium text-surface-300 hover:bg-surface-700 disabled:opacity-50"
                >
                  {t('common.back')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                <p className="text-scale-xs text-yellow-300/80 leading-relaxed">{t('settings.passwordWarning')}</p>
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
          </>
        )}
      </div>
    </div>
  );
}