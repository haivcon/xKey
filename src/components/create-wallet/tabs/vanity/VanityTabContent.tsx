import type { Dispatch, SetStateAction } from 'react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { useVanityGeneration } from '../../../../hooks/vanity/useVanityGeneration';
import type { GeneratedWallet } from '../../types';
import { VanityExtraFiltersSection } from './VanityExtraFiltersSection';
import { VanityPerformanceSection } from './VanityPerformanceSection';
import { VanityPrimaryWalletCard } from './VanityPrimaryWalletCard';
import { VanityResultsSection } from './VanityResultsSection';
import { VanityRunningPanel } from './VanityRunningPanel';
import { VanitySetupProgress } from './VanitySetupProgress';
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
    vanitySpeed,
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
    vanityExtraWallets,
    selectedVanityAddresses,
    vanityPaused,
    vanityGenerationMode,
    setVanityGenerationMode,
    vanityMnemonicWords,
    setVanityMnemonicWords,
    vanityExpandedSections,
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
    vanitySafeExtraLimit,
    vanitySafeExtraMinRun,
    vanitySafeExtraFilters,
    vanityBatchSize,
    vanityWorkerCount,
    vanityDifficultyKey,
    vanityDifficultyTone,
    vanityRunActive,
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
    saveSingleVanityWallet,
    saveVanityWallets,
    restoreVanitySession,
    startVanity,
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
                <VanityRunningPanel {...props} />
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

