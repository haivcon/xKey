import { Camera, QrCode, SplitSquareVertical } from 'lucide-react';
import { hapticTap } from '../../../utils/haptics';
import type { TranslationFn } from '../../../contexts/LanguageContext';

type ShamirSectionProps = {
  t: TranslationFn;
  onCreateBackup: () => void | Promise<void>;
  onRestoreBackup: () => void;
};

export function ShamirSection({ t, onCreateBackup, onRestoreBackup }: ShamirSectionProps) {
  return (
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
          onClick={() => { hapticTap(); void onCreateBackup(); }}
          className="btn-glow flex items-center justify-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20"
        >
          <QrCode size={16} />
          {t('shamir.createSingleButton')}
        </button>
        <button
          onClick={() => { hapticTap(); onRestoreBackup(); }}
          className="btn-glow flex items-center justify-center gap-2 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 text-sm font-medium text-fuchsia-300 hover:bg-fuchsia-500/20"
        >
          <Camera size={16} />
          {t('shamir.restoreButton')}
        </button>
      </div>
    </div>
  );
}
