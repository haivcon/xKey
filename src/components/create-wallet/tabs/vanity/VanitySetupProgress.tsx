import { Sparkles } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import type { VanityTabProps } from './VanityTabContent';

type VanitySetupProgressProps = {
  t: TranslationFn;
  vanityDifficultyTone: string;
  vanityDifficultyKey: string;
  vanityExpandedSections: VanityTabProps['vanityExpandedSections'];
};

export function VanitySetupProgress({
  t,
  vanityDifficultyTone,
  vanityDifficultyKey,
  vanityExpandedSections,
}: VanitySetupProgressProps) {
  const setupSteps = [
    { number: 1, label: t('createWallet.seedPhrase') + ' / ' + t('createWallet.privateKey'), active: vanityExpandedSections.primary },
    { number: 2, label: t('createWallet.vanityTitle'), active: vanityExpandedSections.target },
    { number: 3, label: t('createWallet.vanityStorage'), active: vanityExpandedSections.storage },
    { number: 4, label: t('createWallet.vanityPerformanceSafety'), active: vanityExpandedSections.performance },
    { number: 5, label: t('createWallet.vanityExtraCaptureTitle'), active: vanityExpandedSections.extraFilters },
  ];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-surface-950 dark:text-white flex items-center gap-2">
            <Sparkles size={16} className="text-brand-400" />
            {t('createWallet.vanityTitle')}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('createWallet.vanitySubtitle')}</p>
        </div>
        <div className={`vanity-status-badge inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${vanityDifficultyTone}`}>
          {t(`createWallet.vanityDifficulty_${vanityDifficultyKey}`)}
        </div>
      </div>

      <div className="vanity-step-progress" aria-label="Vanity setup steps">
        {setupSteps.map((step) => (
          <div key={step.number} className={`vanity-progress-step ${step.active ? 'is-active' : ''}`}>
            <span>{step.number}</span>
            <strong>{step.label}</strong>
          </div>
        ))}
      </div>
    </>
  );
}