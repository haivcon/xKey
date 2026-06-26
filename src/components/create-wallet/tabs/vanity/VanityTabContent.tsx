import type { Dispatch, SetStateAction } from 'react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import { AlertTriangle, BrainCircuit, Check, ChevronDown, Copy, Gauge, Maximize2, Pause, Play, RefreshCw, Save, ShieldCheck, Sparkles, Square, Target, Timer, Trash2 } from 'lucide-react';
import { formatCompactNumber, formatVanitySeconds } from '../../formatters';
import type { useVanityGeneration } from '../../../../hooks/useVanityGeneration';
import type { GeneratedWallet } from '../../types';
import { VanityExtraFiltersSection } from './VanityExtraFiltersSection';
import { VanityExtraWalletCard } from './VanityExtraWalletCard';
import { VanityPerformanceSection } from './VanityPerformanceSection';
import { VanityPrimaryWalletCard } from './VanityPrimaryWalletCard';
import { VanityResultsSection } from './VanityResultsSection';
import { VanityStorageSection } from './VanityStorageSection';
import { VanityTargetSection } from './VanityTargetSection';

export type VanityTabProps = ReturnType<typeof useVanityGeneration> & {
  t: TranslationFn;
  allTags: string[];
  generatedWallets: GeneratedWallet[];
  setGeneratedWallets: Dispatch<SetStateAction<GeneratedWallet[]>>;
  walletName: string;
  handleCopy: (text: string, field: string) => void | Promise<void>;
  copiedField: string | null;
};

type VanitySetupProgressProps = {
  t: TranslationFn;
  vanityDifficultyTone: string;
  vanityDifficultyKey: string;
  vanityExpandedSections: VanityTabProps['vanityExpandedSections'];
};

function VanitySetupProgress({
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

export function VanityTabContent(props: VanityTabProps) {
  const {
    t,
    allTags,
    generatedWallets,
    walletName,
    handleCopy,
    copiedField,
    vanityPrefix,
    setVanityPrefix,
    vanitySuffix,
    setVanitySuffix,
    vanityGenerating,
    vanityScanned,
    vanitySpeed,
    vanityTime,
    vanityTimeLimit,
    setVanityTimeLimit,
    vanityTargetCount,
    setVanityTargetCount,
    vanityNetwork,
    setVanityNetwork,
    vanityFolder,
    setVanityFolder,
    vanityCaptureExtras,
    setVanityCaptureExtras,
    vanityExtraMinRunDrafts,
    setVanityExtraMinRunDrafts,
    vanityExtraLimit,
    setVanityExtraLimit,
    vanityExtraFolder,
    setVanityExtraFolder,
    vanityTagInput,
    setVanityTagInput,
    vanityTags,
    setVanityTags,
    vanityStopReason,
    vanitySavedCount,
    vanityCandidates,
    vanityExtraWallets,
    selectedVanityAddresses,
    vanityPaused,
    setVanityPaused,
    vanityGenerationMode,
    setVanityGenerationMode,
    vanityMnemonicWords,
    setVanityMnemonicWords,
    vanityExpandedSections,
    vanityGeneratorExpanded,
    setVanityGeneratorExpanded,
    expandedVanitySecrets,
    visibleVanitySecrets,
    setVisibleVanitySecrets,
    vanityPerformanceMode,
    setVanityPerformanceMode,
    vanityPresetsExpanded,
    setVanityPresetsExpanded,
    vanityCustomPattern,
    setVanityCustomPattern,
    hasRecoverableVanitySession,
    vanityPrefixClean,
    vanitySuffixClean,
    vanityInvalidChars,
    vanityPatternLength,
    vanityHasPattern,
    vanitySafeTargetCount,
    vanityCanStart,
    vanityCanResume,
    vanitySafeExtraLimit,
    vanitySafeExtraMinRun,
    vanitySafeExtraFilters,
    vanityBatchSize,
    vanityWorkerCount,
    vanityDifficultyKey,
    vanityDifficultyTone,
    vanityRunActive,
    vanityProgress,
    vanityRemainingPrimary,
    vanityEtaSeconds,
    vanityProgressPercentLabel,
    vanityEffectiveThroughput,
    allVanityWallets,
    hasSelectedUnsavedVanityWallets,
    vanityDifficultyAnalyzer,
    vanityNetworkOptions,
    vanityFolderOptions,
    vanityStorageSummary,
    vanityExtraFolderOptions,
    vanityExtraFolderLabel,
    vanityEnabledExtraFilterCount,
    vanityExtraSummary,
    visibleVanityPresetGroups,
    vanityHiddenPresetCount,
    vanitySavedRef,
    vanityFoundRef,
    vanityExtraRef,
    toggleVanitySection,
    toggleVanitySecret,
    applyVanitySuffixPattern,
    getVanityExtraLabel,
    renderVanityAddress,
    renderVanityExtraAddress,
    updateVanityExtraFilter,
    getVanityExtraMinRunValue,
    commitVanityExtraMinRun,
    stepVanityExtraMinRun,
    addVanityTag,
    getVanityScoreTone,
    removeVanityExtraWallet,
    removeVanityPrimaryWallet,
    clearVanityExtraWallets,
    saveSingleVanityWallet,
    saveAllVanityExtraWallets,
    saveVanityWallets,
    restoreVanitySession,
    startVanity,
    pauseVanity,
    stopVanity,
    toggleVanitySelection,
    resetVanityResults,
  } = props;

  return (
            <div className="vanity-theme-sync space-y-6 pb-20">
              <div className={`vanity-setup-card mb-4 space-y-4 rounded-xl border border-surface-200 bg-surface-50/80 p-4 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-800/40 dark:shadow-none ${vanityRunActive ? 'hidden' : ''}`}>
                <VanitySetupProgress
                  t={t}
                  vanityDifficultyTone={vanityDifficultyTone}
                  vanityDifficultyKey={vanityDifficultyKey}
                  vanityExpandedSections={vanityExpandedSections}
                />

                <VanityPrimaryWalletCard
                  t={t}
                  expanded={vanityExpandedSections.primary}
                  vanityGenerating={vanityGenerating}
                  vanityGenerationMode={vanityGenerationMode}
                  setVanityGenerationMode={setVanityGenerationMode}
                  vanityMnemonicWords={vanityMnemonicWords}
                  setVanityMnemonicWords={setVanityMnemonicWords}
                  onToggle={() => toggleVanitySection('primary')}
                />

                <VanityTargetSection
                  t={t}
                  expanded={vanityExpandedSections.target}
                  vanityPrefix={vanityPrefix}
                  setVanityPrefix={setVanityPrefix}
                  vanitySuffix={vanitySuffix}
                  setVanitySuffix={setVanitySuffix}
                  vanityGenerating={vanityGenerating}
                  vanityInvalidChars={vanityInvalidChars}
                  vanityPresetsExpanded={vanityPresetsExpanded}
                  setVanityPresetsExpanded={setVanityPresetsExpanded}
                  vanityHiddenPresetCount={vanityHiddenPresetCount}
                  visibleVanityPresetGroups={visibleVanityPresetGroups}
                  vanitySuffixClean={vanitySuffixClean}
                  applyVanitySuffixPattern={applyVanitySuffixPattern}
                  vanityCustomPattern={vanityCustomPattern}
                  setVanityCustomPattern={setVanityCustomPattern}
                  vanityHasPattern={vanityHasPattern}
                  vanityDifficultyAnalyzer={vanityDifficultyAnalyzer}
                  vanityPrefixClean={vanityPrefixClean}
                  vanityPatternLength={vanityPatternLength}
                  vanitySpeed={vanitySpeed}
                  onToggle={() => toggleVanitySection('target')}
                />

                <VanityStorageSection
                  t={t}
                  expanded={vanityExpandedSections.storage}
                  allTags={allTags}
                  vanityGenerating={vanityGenerating}
                  vanityTargetCount={vanityTargetCount}
                  setVanityTargetCount={setVanityTargetCount}
                  vanitySafeTargetCount={vanitySafeTargetCount}
                  vanityNetwork={vanityNetwork}
                  setVanityNetwork={setVanityNetwork}
                  vanityNetworkOptions={vanityNetworkOptions}
                  vanityFolder={vanityFolder}
                  setVanityFolder={setVanityFolder}
                  vanityFolderOptions={vanityFolderOptions}
                  vanityStorageSummary={vanityStorageSummary}
                  vanityTagInput={vanityTagInput}
                  setVanityTagInput={setVanityTagInput}
                  vanityTags={vanityTags}
                  setVanityTags={setVanityTags}
                  addVanityTag={addVanityTag}
                  onToggle={() => toggleVanitySection('storage')}
                />

                <VanityPerformanceSection
                  t={t}
                  expanded={vanityExpandedSections.performance}
                  vanityGenerating={vanityGenerating}
                  vanityPerformanceMode={vanityPerformanceMode}
                  setVanityPerformanceMode={setVanityPerformanceMode}
                  vanityWorkerCount={vanityWorkerCount}
                  vanityBatchSize={vanityBatchSize}
                  vanityTimeLimit={vanityTimeLimit}
                  setVanityTimeLimit={setVanityTimeLimit}
                  onToggle={() => toggleVanitySection('performance')}
                />

                <VanityExtraFiltersSection
                  t={t}
                  expanded={vanityExpandedSections.extraFilters}
                  vanityCaptureExtras={vanityCaptureExtras}
                  setVanityCaptureExtras={setVanityCaptureExtras}
                  vanityGenerating={vanityGenerating}
                  vanityExtraSummary={vanityExtraSummary}
                  vanitySafeExtraLimit={vanitySafeExtraLimit}
                  vanityExtraLimit={vanityExtraLimit}
                  setVanityExtraLimit={setVanityExtraLimit}
                  vanityExtraFolder={vanityExtraFolder}
                  setVanityExtraFolder={setVanityExtraFolder}
                  vanityExtraFolderOptions={vanityExtraFolderOptions}
                  vanityExtraFolderLabel={vanityExtraFolderLabel}
                  vanityEnabledExtraFilterCount={vanityEnabledExtraFilterCount}
                  vanitySafeExtraFilters={vanitySafeExtraFilters}
                  vanitySafeExtraMinRun={vanitySafeExtraMinRun}
                  vanityExtraMinRunDrafts={vanityExtraMinRunDrafts}
                  setVanityExtraMinRunDrafts={setVanityExtraMinRunDrafts}
                  updateVanityExtraFilter={updateVanityExtraFilter}
                  getVanityExtraMinRunValue={getVanityExtraMinRunValue}
                  commitVanityExtraMinRun={commitVanityExtraMinRun}
                  stepVanityExtraMinRun={stepVanityExtraMinRun}
                  onToggle={() => toggleVanitySection('extraFilters')}
                />

                {vanityInvalidChars ? (
                  <div className="danger-note">
                    <AlertTriangle size={16} className="danger-note-icon" />
                    <span className="danger-note-body">{t('createWallet.vanityInvalidChars')}</span>
                  </div>
                ) : null}
              </div>

              {!vanityGenerating && !vanityPaused && allVanityWallets.length === 0 ? (
                <>
                {hasRecoverableVanitySession && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-200">{t('createWallet.vanitySessionAvailable')}</p>
                    <button type="button" onClick={() => void restoreVanitySession()} className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20">
                      {t('createWallet.vanitySessionRestore')}
                    </button>
                  </div>
                )}
                {vanityStopReason && (
                  <div className="warning-note flex items-start gap-2 rounded-xl border p-3 text-sm">
                    <AlertTriangle size={16} className="warning-note-icon mt-0.5 flex-shrink-0" />
                    <span className="warning-note-body">{vanityStopReason}</span>
                  </div>
                )}
                <button onClick={() => startVanity()} disabled={!vanityCanStart} className="group relative w-full overflow-hidden rounded-2xl border border-brand-500/50 bg-brand-500 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/40 disabled:translate-y-0 disabled:border-surface-300 disabled:bg-surface-200 disabled:text-surface-500 disabled:shadow-none disabled:cursor-not-allowed dark:border-brand-400/30 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-400 dark:disabled:border-surface-700 dark:disabled:bg-surface-800 dark:disabled:text-surface-600 theme-amoled:border-brand-400/50 theme-amoled:bg-brand-500 theme-amoled:shadow-[0_0_24px_rgba(var(--color-brand-500),0.3)] theme-amoled:hover:bg-brand-400 theme-amoled:hover:shadow-[0_0_32px_rgba(var(--color-brand-500),0.4)]">
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center gap-2">
                    <RefreshCw size={18} />
                    {vanityHasPattern ? t('createWallet.startVanity') : t('createWallet.vanityNeedPattern')}
                  </span>
                </button>
                </>
              ) : vanityGenerating || vanityPaused ? (
                <div className="space-y-3">
                  <section className="rounded-xl border border-brand-200 bg-brand-50/80 p-4 shadow-sm dark:border-brand-500/25 dark:bg-brand-500/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-400/30 bg-brand-500/10 ${vanityPaused ? '' : 'animate-pulse'}`}>
                          {vanityPaused ? <Pause size={17} className="text-amber-300" /> : <Sparkles size={17} className="text-brand-300" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-surface-950 dark:text-white">{vanityPaused ? t('createWallet.vanityPaused') : t('createWallet.vanityGeneratingCount', { current: generatedWallets.length, total: vanitySafeTargetCount })}</p>
                          <p className="mt-0.5 text-[11px] text-surface-600 dark:text-surface-400">{vanityPrefixClean || vanitySuffixClean ? `0x${vanityPrefixClean}...${vanitySuffixClean}` : t('createWallet.vanityScanning')}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-2 py-1 text-xs font-bold text-brand-200">{generatedWallets.length}/{vanitySafeTargetCount}</span>
                        <button
                          type="button"
                          onClick={() => setVanityGeneratorExpanded(prev => !prev)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-400/25 bg-white/70 text-brand-600 transition-colors hover:bg-brand-100 dark:bg-surface-950/60 dark:text-brand-200 dark:hover:bg-brand-500/15"
                          aria-label={vanityGeneratorExpanded ? t('common.collapse') : t('common.expand')}
                        >
                          <ChevronDown size={16} className={`transition-transform ${vanityGeneratorExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {vanityGeneratorExpanded && (
                      <>
                        <div className="mt-3 h-2 overflow-hidden rounded-full border border-surface-200 bg-surface-100 dark:border-surface-700/50 dark:bg-surface-900">
                          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300 shadow-[0_0_8px_rgba(14,165,233,0.5)]" style={{ width: `${Math.max(vanityProgress, vanityGenerating ? 2 : 0)}%` }} />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] sm:grid-cols-6">
                          <div className="rounded-xl border border-surface-200 bg-white/85 p-2.5 shadow-sm shadow-surface-900/5 dark:border-surface-700/70 dark:bg-surface-950/70 sm:col-span-2">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-500 dark:text-blue-300"><Target size={14} /></span>
                              <p className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityScanned')}</p>
                              <p className="max-w-full truncate font-mono text-sm font-extrabold text-surface-950 dark:text-white">{formatCompactNumber(vanityScanned)}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-brand-200 bg-brand-50/80 p-2.5 shadow-sm shadow-brand-900/5 dark:border-brand-500/25 dark:bg-brand-500/10 sm:col-span-2">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-500/15 text-brand-600 dark:text-brand-200"><Gauge size={14} /></span>
                              <p className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-brand-700/70 dark:text-brand-100/70">{t('createWallet.vanitySpeed')}</p>
                              <p className="max-w-full truncate font-mono text-sm font-extrabold text-brand-700 dark:text-brand-100">{vanitySpeed > 0 ? t('createWallet.vanitySpeedValue', { speed: formatCompactNumber(vanitySpeed) }) : t('createWallet.vanitySpeedMeasuring')}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-surface-200 bg-white/85 p-2.5 shadow-sm shadow-surface-900/5 dark:border-surface-700/70 dark:bg-surface-950/70 sm:col-span-2">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300"><Timer size={14} /></span>
                              <p className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityElapsed')}</p>
                              <p className="max-w-full truncate font-mono text-sm font-extrabold text-surface-950 dark:text-white">{formatVanitySeconds(vanityTime)}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-surface-200 bg-white/85 p-2.5 shadow-sm shadow-surface-900/5 dark:border-surface-700/70 dark:bg-surface-950/70 sm:col-span-2">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10 text-amber-500 dark:text-amber-300"><RefreshCw size={14} /></span>
                              <p className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityEstimatedTime')}</p>
                              <p className="max-w-full truncate font-mono text-sm font-extrabold text-surface-950 dark:text-white">{vanitySpeed > 0 && vanityRemainingPrimary > 0 ? formatVanitySeconds(vanityEtaSeconds) : '--'}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-surface-200 bg-white/85 p-2.5 shadow-sm shadow-surface-900/5 dark:border-surface-700/70 dark:bg-surface-950/70 sm:col-span-2">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-500 dark:text-violet-300"><Maximize2 size={14} /></span>
                              <p className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityScanProgress')}</p>
                              <p className="max-w-full truncate font-mono text-sm font-extrabold text-surface-950 dark:text-white">{vanityProgressPercentLabel}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-surface-200 bg-white/85 p-2.5 shadow-sm shadow-surface-900/5 dark:border-surface-700/70 dark:bg-surface-950/70 sm:col-span-2">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-cyan-500 dark:text-cyan-300"><BrainCircuit size={14} /></span>
                              <p className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityThreadsBatch')}</p>
                              <p className="max-w-full truncate font-mono text-sm font-extrabold text-surface-950 dark:text-white">{vanityWorkerCount} Ã— {formatCompactNumber(vanityBatchSize)}</p>
                            </div>
                          </div>
                          <div className="col-span-2 rounded-xl border border-orange-300/50 bg-gradient-to-br from-orange-50 to-amber-50/60 p-2.5 shadow-sm shadow-orange-900/5 dark:border-orange-500/25 dark:from-orange-500/10 dark:to-amber-500/5 sm:col-span-6">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-orange-400/25 bg-orange-500/15 text-orange-600 dark:text-orange-300"><ShieldCheck size={14} /></span>
                              <div className="flex max-w-full items-center justify-center gap-2">
                                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-orange-700/75 dark:text-orange-200/75">{t('createWallet.vanityMode')}</p>
                                <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-orange-700 dark:text-orange-200">{vanityPerformanceMode}</span>
                              </div>
                              <p className="max-w-full truncate font-mono text-[11px] font-bold text-orange-800 dark:text-orange-100">
                                {t('createWallet.vanityChunk', { chunk: formatCompactNumber(vanityEffectiveThroughput) })} Â· {t('createWallet.vanityPrimary', { current: generatedWallets.length, total: vanitySafeTargetCount })} Â· {t('createWallet.vanityExtra', { current: vanityExtraWallets.length, total: vanitySafeExtraLimit })}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                          <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                            <AlertTriangle size={14} />
                            {t('createWallet.vanityNoticeTitle')}
                          </h4>
                          <ul className="mt-2 space-y-1 pl-5 text-[11px] leading-relaxed text-amber-700/80 dark:text-amber-200/80 list-disc">
                            <li>{t('createWallet.vanityHeatDesc')}</li>
                            <li>{t('createWallet.vanitySafeTipShortPattern')}</li>
                            <li>{t('createWallet.vanitySafeTipNoHotCharge')}</li>
                            <li>{t('createWallet.vanityHeatCooling')}</li>
                            <li>{t('createWallet.vanitySafeTipVentilation')}</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </section>

                  <section className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-sm shadow-emerald-900/5 dark:border-emerald-500/20 dark:bg-surface-950/60 dark:shadow-emerald-950/10">
                    <div className="border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.04] to-transparent px-3 py-2.5">
                      <button type="button" onClick={() => toggleVanitySection('primary')} className="flex w-full items-center justify-between gap-3 text-left transition-opacity hover:opacity-85">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300">
                            <Target size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-emerald-800 dark:text-emerald-100">{t('createWallet.vanityPrimaryMatches')}</p>
                            <p className="mt-0.5 truncate text-[10px] text-emerald-700/75 dark:text-emerald-100/55">{vanityPrefixClean || vanitySuffixClean ? `0x${vanityPrefixClean}...${vanitySuffixClean}` : t('createWallet.vanityScanning')}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-100">{generatedWallets.length}/{vanitySafeTargetCount}</span>
                          <ChevronDown size={14} className={`text-emerald-600 dark:text-emerald-400 transition-transform ${vanityExpandedSections.primary ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    </div>
                    {vanityExpandedSections.primary && (
                      <div className="max-h-56 space-y-1.5 overflow-y-auto p-2">
                        {generatedWallets.length === 0 ? <p className="px-2 py-3 text-center text-[11px] text-emerald-600/70 dark:text-emerald-200/50">{t('createWallet.vanityScanning')}</p> : generatedWallets.map((wallet, index) => {
                          const address = wallet.address || '';
                          const selected = selectedVanityAddresses.includes(address);
                          const saved = !!address && vanitySavedRef.current.has(address);
                          return <div key={address || index} className={`rounded-xl border p-2 transition-all ${selected ? 'border-emerald-400/60 bg-emerald-100/80 shadow-sm shadow-emerald-900/5 dark:bg-emerald-500/15 dark:shadow-emerald-950/20' : 'border-surface-200 bg-surface-50/90 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-surface-700/80 dark:bg-surface-900/80 dark:hover:border-emerald-500/35 dark:hover:bg-surface-900'}`}>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                                <button type="button" onClick={() => toggleVanitySelection(address)} className="flex min-w-0 items-start gap-2 overflow-hidden text-left" aria-pressed={selected}>
                                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${selected ? 'bg-emerald-500 text-white shadow shadow-emerald-500/25' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'}`}>{index + 1}</span>
                                  <span className="block min-w-0 overflow-hidden">
                                    <code className="block min-w-0 overflow-hidden whitespace-nowrap text-[11px] font-bold leading-snug tracking-tight text-surface-950 dark:text-white sm:text-[12px]">{renderVanityAddress(address)}</code>
                                  <span className="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-semibold text-emerald-700/80 dark:text-emerald-100/75">
                                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-1.5 py-0.5">{t('createWallet.vanityExtraTypePrimary')}</span>
                                    {saved && <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 shadow-sm dark:text-emerald-200">{t('createWallet.vanityExtraSaved')}</span>}
                                  </span>
                                </span>
                              </button>
                              <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg border border-surface-200 bg-surface-50/90 p-1 shadow-inner shadow-surface-900/5 dark:border-surface-700/60 dark:bg-surface-950/60 dark:shadow-black/10">
                                <button type="button" onClick={() => handleCopy(address, `vanity-found-${index}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white active:scale-95" aria-label={t('common.copy')}>
                                  {copiedField === `vanity-found-${index}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                </button>
                                <button type="button" disabled={saved} onClick={() => saveSingleVanityWallet(wallet)} className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95" aria-label={t('createWallet.vanityExtraSaveOne')}>
                                  <Save size={13} />
                                </button>
                                <button type="button" onClick={() => removeVanityPrimaryWallet(address)} className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400 active:scale-95" aria-label={t('createWallet.vanityExtraRemoveOne')}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>;
                        })}
                      </div>
                    )}
                  </section>

                  {vanityCaptureExtras && (
                    <section className="overflow-hidden rounded-xl border border-cyan-200 bg-cyan-50/70 shadow-sm shadow-cyan-900/5 dark:border-cyan-500/20 dark:bg-surface-950/60 dark:shadow-cyan-950/10">
                      <div className="border-b border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-cyan-500/[0.04] to-transparent px-3 py-2.5">
                        <button type="button" onClick={() => toggleVanitySection('extra')} className="flex w-full items-center justify-between gap-3 text-left transition-opacity hover:opacity-85">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-cyan-500 dark:text-cyan-300">
                              <Sparkles size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-cyan-800 dark:text-cyan-100">{t('createWallet.vanityExtraKept')}</p>
                              <p className="mt-0.5 truncate text-[10px] text-cyan-700/75 dark:text-cyan-100/55">{t('createWallet.vanityExtraAutoReplaceHint')}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-100">{vanityExtraWallets.length}/{vanitySafeExtraLimit}</span>
                            <ChevronDown size={14} className={`text-cyan-600 dark:text-cyan-400 transition-transform ${vanityExpandedSections.extra ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {vanityExpandedSections.extra && (
                          <div className="mt-2 flex items-center justify-end gap-1.5">
                            <button type="button" disabled={vanityExtraWallets.length === 0} onClick={saveAllVanityExtraWallets} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-200">
                              {t('createWallet.vanityExtraSaveAll')}
                            </button>
                            <button type="button" disabled={vanityExtraWallets.length === 0} onClick={clearVanityExtraWallets} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-700 shadow-sm transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-200">
                              {t('createWallet.vanityExtraClearAll')}
                            </button>
                          </div>
                        )}
                      </div>
                      {vanityExpandedSections.extra && (
                        <div className="max-h-56 space-y-1.5 overflow-y-auto p-2">
                          {vanityExtraWallets.length === 0 ? <p className="px-2 py-3 text-center text-[11px] text-cyan-600/70 dark:text-cyan-200/50">{t('createWallet.vanityExtraEmpty')}</p> : vanityExtraWallets.map((wallet, index) => {
                            const address = wallet.address || '';
                            return (
                              <VanityExtraWalletCard
                                key={address || index}
                                t={t}
                                wallet={wallet}
                                index={index}
                                selected={selectedVanityAddresses.includes(address)}
                                saved={!!address && vanitySavedRef.current.has(address)}
                                copiedField={copiedField}
                                renderVanityExtraAddress={renderVanityExtraAddress}
                                getVanityExtraLabel={getVanityExtraLabel}
                                getVanityScoreTone={getVanityScoreTone}
                                handleCopy={handleCopy}
                                toggleVanitySelection={toggleVanitySelection}
                                saveSingleVanityWallet={saveSingleVanityWallet}
                                removeVanityExtraWallet={removeVanityExtraWallet}
                              />
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  <section className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50/85 p-3 font-mono text-[11px] shadow-inner shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-950/90 dark:shadow-black/20">
                    <div className="mb-2 flex items-center justify-between text-surface-500 dark:text-surface-400"><span>{t('createWallet.vanityTerminal')}</span><span>{vanityCandidates.length}/6</span></div>
                    <div className="h-28 space-y-1 overflow-hidden">
                      {vanityCandidates.length === 0 ? <div className="text-surface-500">{t('createWallet.vanityScanning')}</div> : vanityCandidates.map((candidate, index) => (
                        <div key={`${candidate.address}-${index}`} className={`flex items-center gap-2 ${candidate.matched ? 'text-emerald-700 dark:text-emerald-300' : 'text-surface-600 dark:text-surface-400'}`}>
                          {candidate.matched ? <Sparkles size={12} className="shrink-0" /> : <Gauge size={12} className="shrink-0" />}
                          <span className="min-w-0 flex-1 whitespace-nowrap">{renderVanityAddress(candidate.address, true)}</span>
                          <button type="button" onClick={() => handleCopy(candidate.address, `vanity-candidate-${index}`)} className="shrink-0 rounded p-1 text-surface-500 transition-colors hover:bg-surface-800 hover:text-white" aria-label={t('common.copy')}>{copiedField === `vanity-candidate-${index}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}</button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <p className="px-1 text-[11px] leading-relaxed text-surface-600 dark:text-surface-500">{t('createWallet.vanityAutoLockPaused')}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {vanityPaused ? (
                      <>
                        <button onClick={() => setVanityPaused(false)} className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-4 py-2 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-surface-800" title={t('common.back')} aria-label={t('common.back')}><span aria-hidden="true">â†</span>{t('common.back')}</button>
                        <button onClick={() => startVanity(true)} disabled={!vanityCanResume} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400" title={t('createWallet.vanityResume')} aria-label={t('createWallet.vanityResume')}><Play size={14} />{t('createWallet.vanityResume')}</button>
                      </>
                    ) : <button onClick={() => { void pauseVanity(); }} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300" title={t('createWallet.vanityPause')} aria-label={t('createWallet.vanityPause')}><Pause size={14} />{t('createWallet.vanityPause')}</button>}
                    <button onClick={stopVanity} className="inline-flex items-center gap-2 px-2 py-2 text-xs font-semibold text-red-600 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200" title={t('createWallet.stopVanity')} aria-label={t('createWallet.stopVanity')}><Square size={13} />{t('createWallet.stopVanity')}</button>
                  </div>
                </div>
              ) : (
                <VanityResultsSection
                  t={t}
                  walletName={walletName}
                  allVanityWallets={allVanityWallets}
                  generatedWallets={generatedWallets}
                  vanityExtraWallets={vanityExtraWallets}
                  vanitySavedCount={vanitySavedCount}
                  selectedVanityAddresses={selectedVanityAddresses}
                  vanitySavedRef={vanitySavedRef}
                  vanityFoundRef={vanityFoundRef}
                  vanityExtraRef={vanityExtraRef}
                  expandedVanitySecrets={expandedVanitySecrets}
                  visibleVanitySecrets={visibleVanitySecrets}
                  setVisibleVanitySecrets={setVisibleVanitySecrets}
                  copiedField={copiedField}
                  hasSelectedUnsavedVanityWallets={hasSelectedUnsavedVanityWallets}
                  resetVanityResults={resetVanityResults}
                  toggleVanitySelection={toggleVanitySelection}
                  toggleVanitySecret={toggleVanitySecret}
                  handleCopy={handleCopy}
                  saveSingleVanityWallet={saveSingleVanityWallet}
                  saveVanityWallets={saveVanityWallets}
                  renderVanityAddress={renderVanityAddress}
                  renderVanityExtraAddress={renderVanityExtraAddress}
                  getVanityExtraLabel={getVanityExtraLabel}
                  getVanityScoreTone={getVanityScoreTone}
                />
              )}
            </div>
  );
}

