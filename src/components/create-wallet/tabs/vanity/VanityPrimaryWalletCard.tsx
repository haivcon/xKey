import type { Dispatch, SetStateAction } from 'react';
import { ChevronDown, KeyRound } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import type { VanityTabProps } from './VanityTabContent';

type VanityPrimaryWalletCardProps = {
  t: TranslationFn;
  expanded: boolean;
  vanityGenerating: boolean;
  vanityGenerationMode: VanityTabProps['vanityGenerationMode'];
  setVanityGenerationMode: Dispatch<SetStateAction<VanityTabProps['vanityGenerationMode']>>;
  vanityMnemonicWords: VanityTabProps['vanityMnemonicWords'];
  setVanityMnemonicWords: Dispatch<SetStateAction<VanityTabProps['vanityMnemonicWords']>>;
  onToggle: () => void;
};

export function VanityPrimaryWalletCard({
  t,
  expanded,
  vanityGenerating,
  vanityGenerationMode,
  setVanityGenerationMode,
  vanityMnemonicWords,
  setVanityMnemonicWords,
  onToggle,
}: VanityPrimaryWalletCardProps) {
  return (
    <div className={`vanity-step-card ${expanded ? 'is-open' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 transition-colors hover:bg-brand-500/10"
      >
        <div className="flex items-center gap-2">
          <span className="vanity-step-number">1</span>
          <KeyRound size={16} className="text-brand-400" />
          <span className="text-sm font-bold text-brand-700 dark:text-brand-200">{t('createWallet.seedPhrase')} / {t('createWallet.privateKey')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-2 py-0.5 text-scale-2xs font-bold text-brand-700 dark:text-brand-200">
            {vanityGenerationMode === 'mnemonic' ? t('createWallet.seedPhrase') : t('createWallet.privateKey')}
          </span>
          <ChevronDown size={16} className={`text-brand-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-scale-xs leading-relaxed text-surface-400">
            {t('createWallet.vanityGenerationModeDesc')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={vanityGenerating}
              onClick={() => setVanityGenerationMode('privateKey')}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${vanityGenerationMode === 'privateKey' ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
            >
              {t('createWallet.privateKey')}
            </button>
            <button
              type="button"
              disabled={vanityGenerating}
              onClick={() => setVanityGenerationMode('mnemonic')}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${vanityGenerationMode === 'mnemonic' ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
            >
              {t('createWallet.seedPhrase')}
            </button>
          </div>

          {vanityGenerationMode === 'mnemonic' && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-500/10">
              <button
                type="button"
                disabled={vanityGenerating}
                onClick={() => setVanityMnemonicWords(12)}
                className={`rounded-lg border px-3 py-1.5 text-scale-xs font-semibold transition-colors ${vanityMnemonicWords === 12 ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500'} disabled:opacity-50`}
              >
                12 {t('createWallet.words')}
              </button>
              <button
                type="button"
                disabled={vanityGenerating}
                onClick={() => setVanityMnemonicWords(24)}
                className={`rounded-lg border px-3 py-1.5 text-scale-xs font-semibold transition-colors ${vanityMnemonicWords === 24 ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500'} disabled:opacity-50`}
              >
                24 {t('createWallet.words')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}