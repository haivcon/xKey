import type { Dispatch, SetStateAction } from 'react';
import type { TranslationFn } from '../../../contexts/LanguageContext';
import { AlertCircle, AlertTriangle, BrainCircuit, Check, ChevronDown, Copy, Folder, Gauge, Info, KeyRound, Maximize2, Minimize2, Pause, Play, RefreshCw, Save, ShieldCheck, Sparkles, Square, Star, Tag, Target, Timer, Trash2, Trees, Wallet } from 'lucide-react';
import { InlineSelect } from '../components';
import { VANITY_DEFAULT_FOLDER, VANITY_EXTRA_FILTER_KEYS, VANITY_EXTRA_LIMITS, VANITY_HEX_PATTERN, VANITY_TIME_LIMITS } from '../constants';
import { formatCompactNumber, formatVanitySeconds } from '../formatters';
import { buildVanityExtraFilterPreview } from '../vanityPreview';
import type { useVanityGeneration } from '../../../hooks/useVanityGeneration';
import type { GeneratedWallet, VanityPerformanceMode } from '../types';

export type VanityTabProps = ReturnType<typeof useVanityGeneration> & {
  t: TranslationFn;
  allTags: string[];
  generatedWallets: GeneratedWallet[];
  setGeneratedWallets: Dispatch<SetStateAction<GeneratedWallet[]>>;
  walletName: string;
  handleCopy: (text: string, field: string) => void | Promise<void>;
  copiedField: string | null;
};

export function VanityTab(props: VanityTabProps) {
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
                  {[
                    { number: 1, label: t('createWallet.seedPhrase') + ' / ' + t('createWallet.privateKey'), active: vanityExpandedSections.primary },
                    { number: 2, label: t('createWallet.vanityTitle'), active: vanityExpandedSections.target },
                    { number: 3, label: t('createWallet.vanityStorage'), active: vanityExpandedSections.storage },
                    { number: 4, label: t('createWallet.vanityPerformanceSafety'), active: vanityExpandedSections.performance },
                    { number: 5, label: t('createWallet.vanityExtraCaptureTitle'), active: vanityExpandedSections.extraFilters },
                  ].map((step) => (
                    <div key={step.number} className={`vanity-progress-step ${step.active ? 'is-active' : ''}`}>
                      <span>{step.number}</span>
                      <strong>{step.label}</strong>
                    </div>
                  ))}
                </div>

                <div className={`vanity-step-card ${vanityExpandedSections.primary ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    onClick={() => toggleVanitySection('primary')}
                    className="w-full flex items-center justify-between p-3 transition-colors hover:bg-brand-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="vanity-step-number">1</span>
                      <KeyRound size={16} className="text-brand-400" />
                      <span className="text-sm font-bold text-brand-700 dark:text-brand-200">{t('createWallet.seedPhrase')} / {t('createWallet.privateKey')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-200">
                        {vanityGenerationMode === 'mnemonic' ? t('createWallet.seedPhrase') : t('createWallet.privateKey')}
                      </span>
                      <ChevronDown size={16} className={`text-brand-400 transition-transform ${vanityExpandedSections.primary ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {vanityExpandedSections.primary && (
                    <div className="px-3 pb-3 space-y-3">
                      <p className="text-[11px] leading-relaxed text-surface-400">
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
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${vanityMnemonicWords === 12 ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500'} disabled:opacity-50`}
                          >
                            12 {t('createWallet.words')}
                          </button>
                          <button
                            type="button"
                            disabled={vanityGenerating}
                            onClick={() => setVanityMnemonicWords(24)}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${vanityMnemonicWords === 24 ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500'} disabled:opacity-50`}
                          >
                            24 {t('createWallet.words')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <section className={`vanity-step-card ${vanityExpandedSections.target ? 'is-open' : ''}`}>
                  <button type="button" onClick={() => toggleVanitySection('target')} className="flex w-full items-center justify-between border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
                    <div className="flex items-center gap-2">
                      <span className="vanity-step-number">2</span>
                      <Sparkles size={16} className="text-brand-400" />
                      <span className="text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityTitle') || 'Mục tiêu tìm kiếm'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(vanityPrefix || vanitySuffix) && <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-300">{vanityPrefix}...{vanitySuffix}</span>}
                      <ChevronDown size={16} className={`text-surface-400 transition-transform ${vanityExpandedSections.target ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {vanityExpandedSections.target && (
                    <div className="space-y-4 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-surface-400">{t('createWallet.vanityPrefix') || 'Prefix'}</label>
                          <input type="text" value={vanityPrefix} onChange={(e) => setVanityPrefix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. 123" disabled={vanityGenerating}
                            className={`w-full rounded-lg border bg-surface-50 px-4 py-3 font-mono text-sm text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-900 dark:text-white ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'}`} />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityPrefixHint')}</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-surface-400">{t('createWallet.vanitySuffix') || 'Suffix'}</label>
                          <input type="text" value={vanitySuffix} onChange={(e) => setVanitySuffix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. abc" disabled={vanityGenerating}
                            className={`w-full rounded-lg border bg-surface-50 px-4 py-3 font-mono text-sm text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-900 dark:text-white ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'}`} />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanitySuffixHint')}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-surface-200/80 bg-white/60 p-2 dark:border-surface-700/80 dark:bg-surface-900/60">
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                            {t('createWallet.vanityPresets')}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setVanityPresetsExpanded(prev => !prev)}
                              className="rounded-full border border-surface-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-surface-600 transition-colors hover:border-brand-500 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-brand-400 dark:hover:text-brand-300"
                            >
                              {vanityPresetsExpanded ? t('common.showLess') : t('common.showMore', { count: vanityHiddenPresetCount })}
                            </button>
                            {(vanityPrefix || vanitySuffix) && (
                              <button
                                type="button"
                                disabled={vanityGenerating}
                                onClick={() => {
                                  setVanityPrefix('');
                                  setVanitySuffix('');
                                }}
                                className="rounded-full border border-surface-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-surface-600 transition-colors hover:border-surface-300 hover:text-surface-950 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500 dark:hover:text-white"
                              >
                                {t('createWallet.clearPattern')}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          {visibleVanityPresetGroups.map((group) => (
                            <div key={group.key} className="flex min-w-0 items-center gap-1.5">
                              <div className="flex w-20 shrink-0 items-center gap-1 overflow-hidden sm:w-24">
                                <span
                                  aria-hidden="true"
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-[10px] dark:bg-brand-500/15"
                                >
                                  {group.icon}
                                </span>
                                <span className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300">
                                  {t(`createWallet.${group.labelKey}`)}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                                {group.items.map((preset) => {
                                  const active = vanitySuffixClean === preset.toLowerCase();
                                  return (
                                    <button
                                      key={preset}
                                      type="button"
                                      disabled={vanityGenerating}
                                      onClick={() => applyVanitySuffixPattern(preset)}
                                      className={`min-w-[3.25rem] rounded-md border px-2 py-1 font-mono text-[10px] font-bold leading-none transition-colors disabled:opacity-50 ${
                                        active
                                          ? 'border-brand-500 bg-brand-500/15 text-brand-700 shadow-sm shadow-brand-500/10 dark:text-brand-200'
                                          : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-brand-500 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-950/50 dark:text-surface-200 dark:hover:text-brand-300'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-surface-200/70 pt-2 dark:border-surface-700/70">
                          <label className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300">
                            {t('createWallet.vanityCustomPattern')}
                          </label>
                          <input
                            type="text"
                            value={vanityCustomPattern}
                            disabled={vanityGenerating}
                            onChange={(e) => setVanityCustomPattern(e.target.value.replace(/\s/g, '').slice(0, 12))}
                            placeholder="e.g. babe"
                            className={`min-w-[7rem] flex-1 rounded-md border bg-surface-50 px-2 py-1.5 font-mono text-[11px] font-semibold text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-950/50 dark:text-white ${
                              vanityCustomPattern && !VANITY_HEX_PATTERN.test(vanityCustomPattern)
                                ? 'border-red-500/60 focus:border-red-400'
                                : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'
                            }`}
                          />
                          <button
                            type="button"
                            disabled={vanityGenerating || !vanityCustomPattern || !VANITY_HEX_PATTERN.test(vanityCustomPattern)}
                            onClick={() => applyVanitySuffixPattern(vanityCustomPattern)}
                            className="shrink-0 rounded-md border border-brand-500/40 bg-brand-500/10 px-2 py-1.5 text-[10px] font-bold text-brand-700 transition-colors hover:bg-brand-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-200"
                          >
                            {t('createWallet.vanityApplyCustom')}
                          </button>
                          <button
                            type="button"
                            disabled={vanityGenerating || !vanityCustomPattern}
                            onClick={() => {
                              const appliedCustomPattern = vanityCustomPattern.trim().toLowerCase();
                              setVanityCustomPattern('');
                              if (vanitySuffixClean === appliedCustomPattern) setVanitySuffix('');
                            }}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                            className="shrink-0 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {vanityHasPattern && vanityDifficultyAnalyzer ? (
                        <div className={`rounded-xl border ${vanityDifficultyAnalyzer.diffTone} p-4`}>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="flex min-w-0 items-center gap-2 text-sm font-bold">
                              <BrainCircuit size={16} className="shrink-0" /> <span className="min-w-0 truncate">{t('createWallet.vanityPatternAnalyzer')}</span>
                            </h4>
                            <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${vanityDifficultyAnalyzer.difficultyBadgeTone}`}>
                              {vanityDifficultyAnalyzer.difficultyLabel}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <Gauge size={14} /> {t('createWallet.vanityProbability')}
                              </div>
                              <div className="font-mono text-sm font-extrabold">1 / {formatCompactNumber(vanityDifficultyAnalyzer.combinations)}</div>
                            </div>
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <Timer size={14} /> {t('createWallet.vanityEstimatedTime')}
                              </div>
                              <div className="text-sm font-extrabold">{vanityDifficultyAnalyzer.timeLabel}</div>
                            </div>
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <Target size={14} /> {t('createWallet.vanityPatternType')}
                              </div>
                              <div className="text-sm font-extrabold">{vanityDifficultyAnalyzer.hasBoth ? t('createWallet.vanityPatternBoth') : (vanityPrefixClean ? t('createWallet.vanityPatternPrefix') : t('createWallet.vanityPatternSuffix'))}</div>
                            </div>
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <ShieldCheck size={14} /> {t('createWallet.vanityLocal')}
                              </div>
                              <div className="text-sm font-extrabold">{vanitySpeed > 0 ? t('createWallet.vanitySpeedValue', { speed: formatCompactNumber(Math.round(vanityDifficultyAnalyzer.effectiveSpeed)) }) : t('createWallet.vanityOffline')}</div>
                              <div className="mt-0.5 text-[10px] font-semibold opacity-70">{vanityDifficultyAnalyzer.sourceLabel}</div>
                            </div>
                          </div>

                          {vanityDifficultyAnalyzer.hasBoth && (
                            <p className="mt-3 flex items-start gap-1.5 rounded bg-white/45 p-2 text-[11px] opacity-80 dark:bg-black/10">
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />
                              {t('createWallet.vanityBothWarning')}
                            </p>
                          )}
                          {vanityPatternLength > 6 && (
                            <p className="mt-2 flex items-start gap-1.5 rounded bg-white/45 p-2 text-[11px] opacity-80 dark:bg-black/10">
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />
                              {t('createWallet.vanityLengthWarning')}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>

                <section className={`vanity-step-card ${vanityExpandedSections.storage ? 'is-open' : ''}`}>
                  <button type="button" onClick={() => toggleVanitySection('storage')} className="vanity-step-header flex w-full items-center justify-between gap-3 border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="vanity-step-number">3</span>
                      <Folder size={16} className="shrink-0 text-blue-400" />
                      <span className="shrink-0 text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityStorage')}</span>
                    </div>
                    <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
                      <span className="vanity-summary-pill min-w-0 truncate rounded-full border border-surface-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-surface-600 dark:border-surface-700 dark:bg-surface-950/40 dark:text-surface-300">
                        {vanityStorageSummary}
                      </span>
                      <ChevronDown size={16} className={`shrink-0 text-surface-400 transition-transform ${vanityExpandedSections.storage ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {vanityExpandedSections.storage && (
                    <div className="space-y-4 p-4">
                      <div className="grid gap-3 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                            <Copy size={13} /> {t('createWallet.vanityQuantity')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={vanityTargetCount}
                            disabled={vanityGenerating}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setVanityTargetCount('');
                                return;
                              }
                              setVanityTargetCount(Math.max(1, Math.floor(Number(raw) || 1)));
                            }}
                            onBlur={() => setVanityTargetCount(vanitySafeTargetCount)}
                            className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm font-semibold text-surface-950 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                          />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityQuantityHint')}</p>
                        </div>

                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                            <Wallet size={13} /> {t('createWallet.network')}
                          </label>
                          <InlineSelect
                            value={vanityNetwork}
                            disabled={vanityGenerating}
                            onChange={setVanityNetwork}
                            options={vanityNetworkOptions}
                          />
                        </div>

                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                            <Folder size={13} /> {t('home.folders')}
                          </label>
                          <InlineSelect
                            value={vanityFolder}
                            disabled={vanityGenerating}
                            onChange={setVanityFolder}
                            options={vanityFolderOptions}
                          />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityFolderHint')}</p>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                          <Tag size={13} /> {t('createWallet.tags')}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={vanityTagInput}
                            disabled={vanityGenerating}
                            onChange={(e) => setVanityTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addVanityTag();
                              }
                            }}
                            placeholder={t('createWallet.tagPlaceholder')}
                            className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-950 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:placeholder:text-surface-600"
                          />
                          <button
                            type="button"
                            disabled={vanityGenerating || !vanityTagInput.trim()}
                            onClick={addVanityTag}
                            className="rounded-lg border border-surface-200 bg-surface-50 px-3 text-sm font-semibold text-surface-700 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:text-brand-300"
                          >
                            {t('common.add')}
                          </button>
                        </div>
                        {(vanityTags.length > 0 || allTags.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {vanityTags.map(tag => (
                              <button
                                key={tag}
                                type="button"
                                disabled={vanityGenerating}
                                onClick={() => setVanityTags(prev => prev.filter(item => item !== tag))}
                                className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 disabled:opacity-50 dark:text-brand-300"
                              >
                                {tag} ×
                              </button>
                            ))}
                            {allTags.filter(tag => !vanityTags.includes(tag)).slice(0, 6).map(tag => (
                              <button
                                key={tag}
                                type="button"
                                disabled={vanityGenerating}
                                onClick={() => setVanityTags(prev => [...prev, tag])}
                                className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 text-xs font-semibold text-surface-600 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:text-brand-300"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className={`vanity-step-card ${vanityExpandedSections.performance ? 'is-open' : ''}`}>
                  <button type="button" onClick={() => toggleVanitySection('performance')} className="flex w-full items-center justify-between border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
                    <div className="flex items-center gap-2">
                      <span className="vanity-step-number">4</span>
                      <Gauge size={16} className="text-orange-400" />
                      <span className="text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityPerformanceSafety')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-300 uppercase">{vanityPerformanceMode}</span>
                      <ChevronDown size={16} className={`text-surface-400 transition-transform ${vanityExpandedSections.performance ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {vanityExpandedSections.performance && (
                    <div className="space-y-4 p-4">
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                          <Gauge size={13} /> {t('createWallet.vanityPerformance')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['eco', 'balanced', 'fast'] as VanityPerformanceMode[]).map(mode => (
                            <button
                              key={mode}
                              type="button"
                              disabled={vanityGenerating}
                              onClick={() => setVanityPerformanceMode(mode)}
                              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanityPerformanceMode === mode ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                            >
                              {t(`createWallet.vanityPerformance_${mode}`)}
                            </button>
                          ))}
                        </div>
                          <p className="mt-1 text-[11px] text-surface-500">
                            {t(`createWallet.vanityPerformanceHint_${vanityPerformanceMode}`)} · {t('createWallet.vanityWorkers', { count: vanityWorkerCount })} · {t('createWallet.vanityBatch', { count: vanityBatchSize })}
                          </p>
                      </div>

                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                          <Timer size={13} /> {t('createWallet.vanityTimeLimit')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {VANITY_TIME_LIMITS.map((seconds) => (
                            <button
                              key={seconds}
                              type="button"
                              disabled={vanityGenerating}
                              onClick={() => setVanityTimeLimit(seconds)}
                              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanityTimeLimit === seconds ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                            >
                              {seconds === 0 ? t('createWallet.vanityNoLimit') : formatVanitySeconds(seconds)}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={vanityTimeLimit}
                            disabled={vanityGenerating}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setVanityTimeLimit(Math.max(0, Math.floor(Number(raw) || 0)));
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-950 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                            placeholder={t('createWallet.vanityCustomTimePlaceholder')}
                          />
                          <span className="shrink-0 text-[11px] font-semibold text-surface-500">{t('createWallet.vanityTimeSeconds', { seconds: '' }).trim()}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-orange-500" />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-orange-700 dark:text-orange-100">{t('createWallet.vanityNoticeTitle')}</h4>
                            <p className="mt-1 text-xs leading-relaxed text-orange-700/85 dark:text-orange-100/75">{t('createWallet.vanityHeatDesc')}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-orange-700/80 dark:text-orange-100/70">
                              <li>{t('createWallet.vanitySafeTipShortPattern')}</li>
                              <li>{t('createWallet.vanitySafeTipNoHotCharge')}</li>
                              <li>{t('createWallet.vanityHeatCooling')}</li>
                              <li>{t('createWallet.vanitySafeTipVentilation')}</li>
                              <li>{t('createWallet.vanityHeatRisk')}</li>
                              <li>{t('createWallet.vanityHeatFix')}</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <div className="flex items-start gap-3">
                          <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                          <div>
                            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-100">{t('createWallet.vanitySecurityTitle')}</h4>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-700/85 dark:text-emerald-100/75">{t('createWallet.vanitySecurityDesc')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section className={`vanity-step-card ${vanityExpandedSections.extraFilters ? 'is-open' : ''} ${
                  vanityCaptureExtras
                    ? 'border-cyan-500/25 bg-cyan-500/5 shadow-sm shadow-cyan-500/5'
                    : 'border-surface-200 bg-surface-50/70 dark:border-surface-700 dark:bg-surface-900/50'
                }`}>
                  <div className={`border-b px-4 py-3 transition-colors ${
                    vanityCaptureExtras
                      ? 'border-cyan-500/20 bg-gradient-to-r from-cyan-500/12 via-cyan-500/[0.06] to-transparent'
                      : 'border-surface-200 bg-surface-50/80 dark:border-surface-700/50 dark:bg-surface-800/40'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleVanitySection('extraFilters')}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-opacity hover:opacity-85"
                      >
                         <span className="vanity-step-number">5</span>
                         <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                           vanityCaptureExtras
                             ? 'border-cyan-400/25 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
                             : 'border-surface-200 bg-white text-surface-400 dark:border-surface-700 dark:bg-surface-900'
                         }`}>
                           <Star size={15} />
                         </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-bold ${
                            vanityCaptureExtras ? 'text-cyan-800 dark:text-cyan-100' : 'text-surface-950 dark:text-white'
                          }`}>
                            {t('createWallet.vanityExtraCaptureTitle')}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-surface-500 dark:text-surface-400">
                            {vanityCaptureExtras ? vanityExtraSummary : t('common.disabled')}
                          </span>
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`hidden max-w-[150px] truncate rounded-full border px-2 py-1 text-[10px] font-bold sm:inline-flex ${
                          vanityCaptureExtras
                            ? 'border-cyan-400/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200'
                            : 'border-surface-200 bg-white text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400'
                        }`}>
                          {vanityExtraSummary}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={vanityCaptureExtras}
                          disabled={vanityGenerating}
                          onClick={() => setVanityCaptureExtras(!vanityCaptureExtras)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                            vanityCaptureExtras ? 'bg-cyan-500' : 'bg-surface-300 dark:bg-surface-700'
                          }`}
                        >
                          <span className="sr-only">{vanityCaptureExtras ? t('common.enabled') : t('common.disabled')}</span>
                          <span
                            aria-hidden="true"
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              vanityCaptureExtras ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleVanitySection('extraFilters')}
                          className="rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
                        >
                          <ChevronDown size={16} className={`transition-transform ${vanityExpandedSections.extraFilters ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {vanityExpandedSections.extraFilters && (
                    <div className={`space-y-4 p-4 transition-opacity ${vanityCaptureExtras ? 'opacity-100' : 'opacity-70'}`}>
                      <div className={`rounded-xl border p-3 text-xs leading-relaxed ${
                        vanityCaptureExtras
                          ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-700 dark:text-cyan-100/80'
                          : 'border-surface-200 bg-white/70 text-surface-600 dark:border-surface-700 dark:bg-surface-900/70 dark:text-surface-400'
                      }`}>
                        <div className="flex items-start gap-2">
                          <Info size={15} className="mt-0.5 shrink-0 text-cyan-500" />
                          <span>{t('createWallet.vanityExtraCaptureDesc')}</span>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-surface-200 bg-white/80 p-3 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-900/75 dark:shadow-black/10">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-surface-800 dark:text-surface-100">{t('createWallet.vanityExtraLimit')}</label>
                            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-200">
                              {vanitySafeExtraLimit}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {VANITY_EXTRA_LIMITS.map(count => (
                              <button
                                key={count}
                                type="button"
                                disabled={vanityGenerating || !vanityCaptureExtras}
                                onClick={() => setVanityExtraLimit(count)}
                                className={`rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${vanitySafeExtraLimit === count ? 'border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-100' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-cyan-400/60 hover:bg-cyan-50 dark:border-surface-700 dark:bg-surface-950/60 dark:text-surface-300 dark:hover:border-cyan-500/50'} disabled:cursor-not-allowed disabled:opacity-45`}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={vanityExtraLimit}
                            disabled={vanityGenerating || !vanityCaptureExtras}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setVanityExtraLimit('');
                                return;
                              }
                              setVanityExtraLimit(Math.max(1, Math.min(500, Number(raw) || 1)));
                            }}
                            onBlur={() => setVanityExtraLimit(vanitySafeExtraLimit)}
                            placeholder={t('common.custom')}
                            className="mt-2 w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-950 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-950/60 dark:text-white"
                          />
                        </div>

                        <div className="rounded-xl border border-surface-200 bg-white/80 p-3 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-900/75 dark:shadow-black/10">
                          <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-surface-800 dark:text-surface-100">
                            <Folder size={13} className="text-cyan-500" /> {t('createWallet.vanityExtraFolder')}
                          </label>
                          <InlineSelect
                            value={vanityExtraFolder}
                            disabled={vanityGenerating || !vanityCaptureExtras}
                            onChange={setVanityExtraFolder}
                            options={vanityExtraFolderOptions}
                          />
                          <div className="mt-2 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-2.5 py-2 text-[11px] font-semibold text-cyan-700 dark:text-cyan-200">
                            {vanityExtraFolderLabel}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-surface-200 bg-white/80 p-3 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-900/75 dark:shadow-black/10">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-surface-900 dark:text-white">{t('createWallet.vanityExtraFilterTitle')}</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-surface-600 dark:text-surface-400">{t('createWallet.vanityExtraFilterDesc')}</p>
                          </div>
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-700 dark:text-cyan-200">
                            {vanityEnabledExtraFilterCount}/{VANITY_EXTRA_FILTER_KEYS.length}
                          </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {VANITY_EXTRA_FILTER_KEYS.map((key) => {
                            const rule = vanitySafeExtraFilters[key];
                            const enabled = !!rule.enabled;
                            const preview = buildVanityExtraFilterPreview(key, rule, rule.minRun || vanitySafeExtraMinRun);
                            return (
                              <div
                                key={key}
                                className={`rounded-xl border p-2.5 transition-colors ${
                                  enabled
                                    ? 'border-cyan-400/40 bg-cyan-500/10'
                                    : 'border-surface-200 bg-surface-50/80 dark:border-surface-700 dark:bg-surface-950/60'
                                } ${!vanityCaptureExtras ? 'pointer-events-none' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={enabled}
                                    disabled={vanityGenerating || !vanityCaptureExtras}
                                    onClick={() => updateVanityExtraFilter(key, { enabled: !enabled })}
                                    className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                                      enabled ? 'bg-cyan-500' : 'bg-surface-300 dark:bg-surface-700'
                                    }`}
                                  >
                                    <span className="sr-only">{enabled ? t('common.enabled') : t('common.disabled')}</span>
                                    <span
                                      aria-hidden="true"
                                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                        enabled ? 'translate-x-4' : 'translate-x-0.5'
                                      }`}
                                    />
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-surface-950 dark:text-white">{t(`createWallet.vanityExtraFilter_${key}`)}</p>
                                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-surface-600 dark:text-surface-400">{t(`createWallet.vanityExtraFilterHint_${key}`)}</p>
                                  </div>
                                </div>

                                <div className="mt-2 rounded-lg border border-cyan-400/20 bg-white/75 px-2 py-1.5 font-mono text-[10px] font-semibold leading-relaxed text-surface-600 shadow-inner dark:border-cyan-400/15 dark:bg-surface-950/70 dark:text-surface-300">
                                  <span className="mb-1 block font-sans text-[9px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">{t('createWallet.vanityExtraFilterPreview')}</span>
                                  <span className="break-all">
                                    {preview.segments.map((segment, segmentIndex) => segment.highlight ? (
                                      <mark key={`${key}-preview-${segmentIndex}`} className="rounded bg-amber-300/80 px-0.5 font-black text-amber-950 dark:bg-amber-400/80">{segment.text}</mark>
                                    ) : (
                                      <span key={`${key}-preview-${segmentIndex}`}>{segment.text}</span>
                                    ))}
                                  </span>
                                </div>

                                {key !== 'lucky' ? (
                                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-surface-200 bg-white/70 px-2 py-1.5 dark:border-surface-700 dark:bg-surface-900/70">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityExtraFilterMin')}</span>
                                    <div className="inline-flex items-center overflow-hidden rounded-md border border-surface-200 bg-surface-50 focus-within:border-cyan-500 dark:border-surface-700 dark:bg-surface-950">
                                      <button
                                        type="button"
                                        disabled={vanityGenerating || !vanityCaptureExtras || !enabled || getVanityExtraMinRunValue(key, rule.minRun || vanitySafeExtraMinRun) <= 3}
                                        onClick={() => stepVanityExtraMinRun(key, rule.minRun || vanitySafeExtraMinRun, -1)}
                                        className="flex h-6 w-6 items-center justify-center border-r border-surface-200 text-xs font-black text-cyan-700 transition-colors hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-35 dark:border-surface-700 dark:text-cyan-200"
                                        aria-label="-"
                                      >
                                        −
                                      </button>
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        min="3"
                                        max="12"
                                        value={vanityExtraMinRunDrafts[key] ?? String(rule.minRun || vanitySafeExtraMinRun)}
                                        disabled={vanityGenerating || !vanityCaptureExtras || !enabled}
                                        onChange={(event) => setVanityExtraMinRunDrafts(prev => ({ ...prev, [key]: event.target.value }))}
                                        onBlur={() => commitVanityExtraMinRun(key, rule.minRun || vanitySafeExtraMinRun)}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.currentTarget.blur();
                                          }
                                        }}
                                        className="h-6 w-9 border-0 bg-transparent px-1 text-center text-[11px] font-extrabold text-surface-950 focus:outline-none disabled:opacity-50 dark:text-white"
                                      />
                                      <button
                                        type="button"
                                        disabled={vanityGenerating || !vanityCaptureExtras || !enabled || getVanityExtraMinRunValue(key, rule.minRun || vanitySafeExtraMinRun) >= 12}
                                        onClick={() => stepVanityExtraMinRun(key, rule.minRun || vanitySafeExtraMinRun, 1)}
                                        className="flex h-6 w-6 items-center justify-center border-l border-surface-200 text-xs font-black text-cyan-700 transition-colors hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-35 dark:border-surface-700 dark:text-cyan-200"
                                        aria-label="+"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={(rule.patterns || []).join(', ')}
                                    disabled={vanityGenerating || !vanityCaptureExtras || !enabled}
                                    onChange={(event) => updateVanityExtraFilter(key, { patterns: event.target.value.split(',') })}
                                    placeholder="888, 666, 168"
                                    className="mt-2 w-full rounded-lg border border-surface-200 bg-white/70 px-2 py-1.5 text-xs font-semibold text-surface-950 placeholder:text-surface-400 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900/70 dark:text-white dark:placeholder:text-surface-500"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

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
                              <p className="max-w-full truncate font-mono text-sm font-extrabold text-surface-950 dark:text-white">{vanityWorkerCount} × {formatCompactNumber(vanityBatchSize)}</p>
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
                                {t('createWallet.vanityChunk', { chunk: formatCompactNumber(vanityEffectiveThroughput) })} · {t('createWallet.vanityPrimary', { current: generatedWallets.length, total: vanitySafeTargetCount })} · {t('createWallet.vanityExtra', { current: vanityExtraWallets.length, total: vanitySafeExtraLimit })}
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
                            const selected = selectedVanityAddresses.includes(address);
                            const saved = !!address && vanitySavedRef.current.has(address);
                            const score = wallet.vanityScore || 0;
                            return <div key={address || index} className={`rounded-xl border p-2 transition-all ${selected ? 'border-cyan-400/60 bg-cyan-100/80 shadow-sm shadow-cyan-900/5 dark:bg-cyan-500/15 dark:shadow-cyan-950/20' : 'border-surface-200 bg-surface-50/90 hover:border-cyan-300 hover:bg-cyan-50/70 dark:border-surface-700/80 dark:bg-surface-900/80 dark:hover:border-cyan-500/35 dark:hover:bg-surface-900'}`}>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                                <button type="button" onClick={() => toggleVanitySelection(address)} className="flex min-w-0 items-start gap-2 overflow-hidden text-left" aria-pressed={selected}>
                                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${selected ? 'bg-cyan-500 text-white shadow shadow-cyan-500/25' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'}`}>{index + 1}</span>
                                  <span className="block min-w-0 overflow-hidden">
                                    <code className="block min-w-0 overflow-hidden whitespace-nowrap text-[11px] font-bold leading-snug tracking-tight text-surface-950 dark:text-white sm:text-[12px]">{renderVanityExtraAddress(address, wallet)}</code>
                                    <span className="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-semibold text-cyan-700/80 dark:text-cyan-100/75">
                                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5">{getVanityExtraLabel(wallet)}</span>
                                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-bold shadow-sm ${getVanityScoreTone(score)}`}>{t('createWallet.vanityExtraScore', { score })}</span>
                                      {saved && <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 shadow-sm dark:text-emerald-200">{t('createWallet.vanityExtraSaved')}</span>}
                                    </span>
                                  </span>
                                </button>
                                <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg border border-surface-200 bg-surface-50/90 p-1 shadow-inner shadow-surface-900/5 dark:border-surface-700/60 dark:bg-surface-950/60 dark:shadow-black/10">
                                  <button type="button" onClick={() => handleCopy(address, `vanity-extra-${index}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white active:scale-95" aria-label={t('common.copy')}>
                                    {copiedField === `vanity-extra-${index}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                  </button>
                                  <button type="button" disabled={saved} onClick={() => saveSingleVanityWallet(wallet)} className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95" aria-label={t('createWallet.vanityExtraSaveOne')}>
                                    <Save size={13} />
                                  </button>
                                  <button type="button" onClick={() => removeVanityExtraWallet(address)} className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400 active:scale-95" aria-label={t('createWallet.vanityExtraRemoveOne')}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>;
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
                        <button onClick={() => setVanityPaused(false)} className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-4 py-2 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-surface-800" title={t('common.back')} aria-label={t('common.back')}><span aria-hidden="true">←</span>{t('common.back')}</button>
                        <button onClick={() => startVanity(true)} disabled={!vanityCanResume} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400" title={t('createWallet.vanityResume')} aria-label={t('createWallet.vanityResume')}><Play size={14} />{t('createWallet.vanityResume')}</button>
                      </>
                    ) : <button onClick={() => { void pauseVanity(); }} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300" title={t('createWallet.vanityPause')} aria-label={t('createWallet.vanityPause')}><Pause size={14} />{t('createWallet.vanityPause')}</button>}
                    <button onClick={stopVanity} className="inline-flex items-center gap-2 px-2 py-2 text-xs font-semibold text-red-600 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200" title={t('createWallet.stopVanity')} aria-label={t('createWallet.stopVanity')}><Square size={13} />{t('createWallet.stopVanity')}</button>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50 shadow-xl shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-800 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-aurora:shadow-black/30 theme-glass:border-white/15 theme-glass:bg-white/10 theme-glass:shadow-black/20">
                  <div className="flex items-center justify-between border-b border-surface-200 bg-surface-50/90 p-4 dark:border-surface-700 dark:bg-surface-800/80 theme-aurora:border-white/10 theme-aurora:bg-white/10 theme-glass:border-white/15 theme-glass:bg-white/12">
                    <div>
                      <h3 className="text-sm font-bold text-surface-950 dark:text-white">{walletName || allVanityWallets[0].name}</h3>
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {vanitySavedCount > 0
                          ? t('createWallet.vanitySavedSummary', { count: vanitySavedCount, folder: allVanityWallets[0]?.groupId || VANITY_DEFAULT_FOLDER })
                          : t('createWallet.vanityResultSummary', { primary: generatedWallets.length, extra: vanityExtraWallets.length })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={resetVanityResults} className="rounded-lg bg-surface-200 dark:bg-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-800 dark:text-white transition-colors hover:bg-surface-300 dark:hover:bg-surface-600 flex items-center gap-1.5">
                        <RefreshCw size={14} /> {t('authError.retry')}
                      </button>
                    </div>
                  </div>
                  <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto bg-surface-50/70 p-3 dark:bg-surface-900/30 theme-aurora:bg-white/5 theme-glass:bg-white/5">
                    {allVanityWallets.map((wallet, index) => {
                        const address = wallet.address || '';
                        const selected = selectedVanityAddresses.includes(address);
                        const isExtra = wallet.vanityMatchType === 'extra';
                        const saved = !!address && vanitySavedRef.current.has(address);
                        const isExpanded = expandedVanitySecrets[address] || false;

                        return (
                          <div key={address || `vanity-${index}`} className={`relative isolate flex min-h-[68px] flex-col gap-1.5 rounded-lg border p-2 transition-all will-change-transform ${selected ? 'border-brand-500/50 bg-brand-500/10 shadow-sm theme-aurora:bg-brand-400/12 theme-glass:bg-brand-400/12' : 'border-surface-200 bg-surface-50/90 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800/80 dark:hover:border-surface-600 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-aurora:hover:border-brand-300/35 theme-glass:border-white/15 theme-glass:bg-white/10 theme-glass:hover:border-brand-300/40'}`}>
                            <div className="flex items-start gap-2">
                              <button type="button" onClick={() => toggleVanitySelection(address)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition-colors ${selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-300 bg-surface-50 text-transparent dark:border-surface-600 dark:bg-surface-900'}`}>
                                <Check size={12} className={selected ? 'opacity-100' : 'opacity-0'} />
                              </button>

                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${isExtra ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}`}>
                                      {isExtra ? t('createWallet.vanityExtraTypeExtra') : t('createWallet.vanityExtraTypePrimary')}
                                    </span>
                                    {saved && <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"><Check size={10} />{t('createWallet.vanityExtraSaved')}</span>}
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-surface-200 bg-surface-100/70 p-1 dark:border-surface-700/50 dark:bg-surface-950/40">
                                    <button type="button" onClick={() => toggleVanitySecret(address)} className={`rounded-md p-1 transition-colors ${isExpanded ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300' : 'text-surface-500 hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white'}`} aria-label={t('createWallet.vanityToggleDetails')}>
                                      {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                    </button>
                                    <button type="button" onClick={() => handleCopy(address, `vanity-found-${index}`)} className="rounded-md p-1 text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white" aria-label={t('common.copy')}>
                                      {copiedField === `vanity-found-${index}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    </button>
                                    <button type="button" disabled={saved} onClick={() => saveSingleVanityWallet(wallet)} className="rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30" aria-label={t('createWallet.vanityExtraSaveOne')}>
                                      <Save size={12} />
                                    </button>
                                  </div>
                                </div>

                                <code className="mt-1 block min-w-0 overflow-hidden whitespace-nowrap text-[11px] font-bold tracking-wide text-surface-950 dark:text-white sm:text-[12px]">
                                  {isExtra ? renderVanityExtraAddress(address, wallet) : renderVanityAddress(address)}
                                </code>

                                {isExtra && (
                                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-cyan-700/80 dark:text-cyan-200/80 font-medium">
                                    <span>{getVanityExtraLabel(wallet)}</span>
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold shadow-sm ${getVanityScoreTone(wallet.vanityScore || 0)}`}><Star size={10} />{t('createWallet.vanityExtraScore', { score: wallet.vanityScore || 0 })}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-2 ml-0 space-y-2 rounded-lg border border-surface-200 bg-surface-50 p-3 shadow-inner dark:border-surface-700/50 dark:bg-surface-900/50 sm:ml-8">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1"><KeyRound size={10} /> {t('createWallet.privateKey')}</span>
                                    <button onClick={() => {
                                      const key = `${address}-pk`;
                                      if (!visibleVanitySecrets[key]) {
                                        setVisibleVanitySecrets(prev => ({ ...prev, [key]: true }));
                                        window.setTimeout(() => setVisibleVanitySecrets(prev => ({ ...prev, [key]: false })), 60000);
                                        return;
                                      }
                                      handleCopy(wallet.privateKey || '', `pk_${index}`);
                                    }} className="flex items-center gap-1 rounded bg-surface-50 px-2 py-0.5 text-[10px] font-medium text-surface-600 transition-colors hover:text-surface-950 dark:bg-surface-800 dark:text-surface-400 dark:hover:text-white">
                                      {visibleVanitySecrets[`${address}-pk`] ? (copiedField === `pk_${index}` ? <><Check size={12} className="text-emerald-400" /> {t('common.copy')}</> : <><Copy size={12} /> {t('common.copy')}</>) : t('common.show')}
                                    </button>
                                  </div>
                                  <code className="block text-[11px] font-mono text-red-600 dark:text-red-300/90 break-all bg-surface-100 dark:bg-surface-950 p-2.5 rounded border border-surface-300 dark:border-surface-800 shadow-inner">
                                    {visibleVanitySecrets[`${address}-pk`] ? wallet.privateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                                  </code>
                                </div>
                                {wallet.mnemonic && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1"><Trees size={10} /> {t('createWallet.seedPhrase')}</span>
                                      <button onClick={() => {
                                        const key = `${address}-mn`;
                                        if (!visibleVanitySecrets[key]) {
                                          setVisibleVanitySecrets(prev => ({ ...prev, [key]: true }));
                                          window.setTimeout(() => setVisibleVanitySecrets(prev => ({ ...prev, [key]: false })), 60000);
                                          return;
                                        }
                                        handleCopy(wallet.mnemonic || '', `mn_${index}`);
                                      }} className="flex items-center gap-1 rounded bg-surface-50 px-2 py-0.5 font-sans text-[10px] font-medium text-surface-600 transition-colors hover:text-surface-950 dark:bg-surface-800 dark:text-surface-400 dark:hover:text-white">
                                        {visibleVanitySecrets[`${address}-mn`] ? (copiedField === `mn_${index}` ? <><Check size={12} className="text-emerald-500 dark:text-emerald-400" /> {t('common.copy')}</> : <><Copy size={12} /> {t('common.copy')}</>) : t('common.show')}
                                      </button>
                                    </div>
                                    <div className="bg-surface-100 dark:bg-surface-950 p-2.5 rounded border border-surface-300 dark:border-surface-800 text-[11px] font-medium font-sans text-brand-700 dark:text-brand-200 leading-relaxed shadow-inner">
                                      {visibleVanitySecrets[`${address}-mn`] ? wallet.mnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                    })}
                  </div>
                  {hasSelectedUnsavedVanityWallets && (
                    <div className="border-t border-surface-200 bg-surface-50/90 p-3 dark:border-surface-700 dark:bg-surface-800/80 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-glass:border-white/15 theme-glass:bg-white/10">
                      <button
                        type="button"
                        disabled={selectedVanityAddresses.length === 0}
                        onClick={() => saveVanityWallets([...vanityFoundRef.current, ...vanityExtraRef.current], true)}
                        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-500 hover:shadow-brand-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400 disabled:shadow-none"
                      >
                        {t('createWallet.saveToVault')} ({selectedVanityAddresses.filter(addr => !vanitySavedRef.current.has(addr)).length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
  );
}
