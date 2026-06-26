import { ChevronDown, Save } from 'lucide-react';
import PasswordInput from '../../PasswordInput';
import { hapticTap } from '../../../utils/haptics';
import type { TranslationFn } from '../../../contexts/LanguageContext';

export type AutoBackupInterval = 'off' | 'daily' | 'weekly';

type AutoBackupSectionProps = {
  t: TranslationFn;
  intervals: AutoBackupInterval[];
  autoBackupInterval: AutoBackupInterval;
  showAutoBackup: boolean;
  autoBackupPassword: string;
  setShowAutoBackup: (show: boolean) => void;
  setAutoBackupPassword: (password: string) => void;
  saveAutoBackup: (interval: AutoBackupInterval) => void;
  saveAutoBackupPassword: () => void;
};

export function AutoBackupSection({
  t,
  intervals,
  autoBackupInterval,
  showAutoBackup,
  autoBackupPassword,
  setShowAutoBackup,
  setAutoBackupPassword,
  saveAutoBackup,
  saveAutoBackupPassword,
}: AutoBackupSectionProps) {
  return (
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
            {intervals.map(opt => (
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
  );
}