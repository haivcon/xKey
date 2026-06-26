import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useT } from '../../contexts/LanguageContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import QRScannerModal from '../QRScannerModal';
import { CreateWalletHeader, CreateWalletSaveFooter } from './CreateWalletModalLayout';
import { CreateWalletTabs, GenerateModeTabs } from './CreateWalletTabs';
import { PostQuantumOptions } from './PostQuantumOptions';
import { ManualTab } from './tabs/ManualTab';
import { GenerateTab, GenerateUtilityTabs } from './tabs/GenerateTab';
import { VanityTab } from './tabs/VanityTab';
import { useVanityGeneration } from '../../hooks/useVanityGeneration';
import { useWalletGeneration } from '../../hooks/useWalletGeneration';
import type {
  CreateWalletModalProps,
  CreateWalletTab,
  MathStep,
} from './types';

export default function CreateWalletModal({ onClose, onSave, existingWallets = [], folders = [], activeFolder = 'All', allTags = [], aesKey, registerCloseHandler }: CreateWalletModalProps) {
  const [tab, setTab] = useState<CreateWalletTab>('manual');
  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();

  const {
    generateCount,
    setGenerateCount,
    seedWordCount,
    setSeedWordCount,
    generatedWallets,
    setGeneratedWallets,
    generating,
    generateProgress,
    floatingEffects,
    bulkResult,
    copiedField,
    walletName,
    setWalletName,
    postQuantumMode,
    setPostQuantumMode,
    showPostQuantumOptions,
    setShowPostQuantumOptions,
    rotationReminderMonths,
    setRotationReminderMonths,
    manualAddress,
    setManualAddress,
    manualPK,
    setManualPK,
    manualSeed,
    setManualSeed,
    manualBalance,
    setManualBalance,
    manualNotes,
    setManualNotes,
    manualNetwork,
    setManualNetwork,
    duplicateWarning,
    showQRScanner,
    setShowQRScanner,
    showNetworkDropdown,
    setShowNetworkDropdown,
    expandedStep,
    setExpandedStep,
    manualDerivationPath,
    setManualDerivationPath,
    randomGeneratedWallets,
    handleAdvancedEntropyGenerated,
    generateWallet,
    handleCopy,
    checkDuplicate,
    handleSaveGenerated,
    handleSaveManual,
    handleSaveHDWallet,
  } = useWalletGeneration({
    aesKey,
    existingWallets,
    onSave,
    onClose,
    showToast,
    t: t as (key: string, vars?: unknown) => string,
    setTab,
  });

  const {
    vanityPrefix, setVanityPrefix,
    vanitySuffix, setVanitySuffix,
    vanityGenerating,
    vanityScanned,
    vanitySpeed,
    vanityTime, setVanityTime,
    vanityTimeLimit, setVanityTimeLimit,
    vanityTargetCount, setVanityTargetCount,
    vanityNetwork, setVanityNetwork,
    vanityFolder, setVanityFolder,
    vanityCaptureExtras, setVanityCaptureExtras,
    vanityExtraMinRun, setVanityExtraMinRun,
    vanityExtraMinRunDrafts, setVanityExtraMinRunDrafts,
    vanityExtraLimit, setVanityExtraLimit,
    vanityExtraFilters, setVanityExtraFilters,
    vanityExtraFolder, setVanityExtraFolder,
    vanityTagInput, setVanityTagInput,
    vanityTags, setVanityTags,
    vanityStopReason,
    vanitySavedCount,
    vanityCandidates,
    vanityExtraWallets,
    selectedVanityAddresses, setSelectedVanityAddresses,
    vanityPaused, setVanityPaused,
    vanityGenerationMode, setVanityGenerationMode,
    vanityMnemonicWords, setVanityMnemonicWords,
    vanityExpandedSections,
    vanityGeneratorExpanded, setVanityGeneratorExpanded,
    expandedVanitySecrets, setExpandedVanitySecrets,
    visibleVanitySecrets, setVisibleVanitySecrets,
    vanityPerformanceMode, setVanityPerformanceMode,
    vanityPresetsExpanded, setVanityPresetsExpanded,
    vanityCustomPattern, setVanityCustomPattern,
    vanityCustomPatterns, setVanityCustomPatterns,
    hasRecoverableVanitySession,
    vanityPrefixClean,
    vanitySuffixClean,
    vanityInvalidChars,
    vanityPatternLength,
    vanityHasPattern,
    vanitySafeTargetCount,
    vanityExpectedTries,
    vanityCompletionRatio,
    vanityTooLong,
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
    vanityFolderLabel,
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
    compactAddress,
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
    finishVanityRun,
    restoreVanitySession,
    startVanity,
    pauseVanity,
    stopVanity,
    toggleVanitySelection,
    resetVanityResults,
    closeCreateWalletModal,
    clearVanitySession,
  } = useVanityGeneration({
    activeFolder,
    folders,
    aesKey,
    onSave,
    onClose,
    showToast,
    showConfirm,
    t: t as (key: string, vars?: unknown) => string,
    registerCloseHandler,
    generatedWallets,
    setGeneratedWallets,
    setWalletName,
  });

  const vanity = {
    vanityPrefix, setVanityPrefix,
    vanitySuffix, setVanitySuffix,
    vanityGenerating,
    vanityScanned,
    vanitySpeed,
    vanityTime, setVanityTime,
    vanityTimeLimit, setVanityTimeLimit,
    vanityTargetCount, setVanityTargetCount,
    vanityNetwork, setVanityNetwork,
    vanityFolder, setVanityFolder,
    vanityCaptureExtras, setVanityCaptureExtras,
    vanityExtraMinRun, setVanityExtraMinRun,
    vanityExtraMinRunDrafts, setVanityExtraMinRunDrafts,
    vanityExtraLimit, setVanityExtraLimit,
    vanityExtraFilters, setVanityExtraFilters,
    vanityExtraFolder, setVanityExtraFolder,
    vanityTagInput, setVanityTagInput,
    vanityTags, setVanityTags,
    vanityStopReason,
    vanitySavedCount,
    vanityCandidates,
    vanityExtraWallets,
    selectedVanityAddresses, setSelectedVanityAddresses,
    vanityPaused, setVanityPaused,
    vanityGenerationMode, setVanityGenerationMode,
    vanityMnemonicWords, setVanityMnemonicWords,
    vanityExpandedSections,
    vanityGeneratorExpanded, setVanityGeneratorExpanded,
    expandedVanitySecrets, setExpandedVanitySecrets,
    visibleVanitySecrets, setVisibleVanitySecrets,
    vanityPerformanceMode, setVanityPerformanceMode,
    vanityPresetsExpanded, setVanityPresetsExpanded,
    vanityCustomPattern, setVanityCustomPattern,
    vanityCustomPatterns, setVanityCustomPatterns,
    hasRecoverableVanitySession,
    vanityPrefixClean,
    vanitySuffixClean,
    vanityInvalidChars,
    vanityPatternLength,
    vanityHasPattern,
    vanitySafeTargetCount,
    vanityExpectedTries,
    vanityCompletionRatio,
    vanityTooLong,
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
    vanityFolderLabel,
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
    compactAddress,
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
    finishVanityRun,
    restoreVanitySession,
    startVanity,
    pauseVanity,
    stopVanity,
    toggleVanitySelection,
    resetVanityResults,
    closeCreateWalletModal,
    clearVanitySession,
  };

  const mathStepItems = t('createWallet.mathSteps.steps') as unknown as MathStep[];

  return (
    <div className="app-scaled-icons fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="create-wallet-modal-panel flex max-h-[90dvh] flex-col rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <CreateWalletHeader t={t} onClose={closeCreateWalletModal} />

        <CreateWalletTabs tab={tab} setTab={setTab} t={t} />

        <div className="keyboard-scroll-target p-5 space-y-4 overflow-y-auto flex-1">
          <GenerateModeTabs tab={tab} setTab={setTab} t={t} />
          {(tab === 'manual' || tab === 'generate') && (
            <PostQuantumOptions
              t={t}
              postQuantumMode={postQuantumMode}
              setPostQuantumMode={setPostQuantumMode}
              showPostQuantumOptions={showPostQuantumOptions}
              setShowPostQuantumOptions={setShowPostQuantumOptions}
              rotationReminderMonths={rotationReminderMonths}
              setRotationReminderMonths={setRotationReminderMonths}
            />
          )}

          {tab === 'manual' && (
            <ManualTab
              t={t}
              walletName={walletName}
              setWalletName={setWalletName}
              manualAddress={manualAddress}
              setManualAddress={setManualAddress}
              checkDuplicate={checkDuplicate}
              duplicateWarning={duplicateWarning}
              setShowQRScanner={setShowQRScanner}
              showNetworkDropdown={showNetworkDropdown}
              setShowNetworkDropdown={setShowNetworkDropdown}
              manualNetwork={manualNetwork}
              setManualNetwork={setManualNetwork}
              manualPK={manualPK}
              setManualPK={setManualPK}
              manualSeed={manualSeed}
              setManualSeed={setManualSeed}
              manualDerivationPath={manualDerivationPath}
              setManualDerivationPath={setManualDerivationPath}
              manualBalance={manualBalance}
              setManualBalance={setManualBalance}
              manualNotes={manualNotes}
              setManualNotes={setManualNotes}
            />
          )}

          {tab === 'generate' && (
            <GenerateTab
              t={t}
              generating={generating}
              floatingEffects={floatingEffects}
              generateCount={generateCount}
              generateProgress={generateProgress}
              bulkResult={bulkResult}
              onClose={onClose}
              randomGeneratedWallets={randomGeneratedWallets}
              setGenerateCount={setGenerateCount}
              seedWordCount={seedWordCount}
              setSeedWordCount={setSeedWordCount}
              mathStepItems={mathStepItems}
              expandedStep={expandedStep}
              setExpandedStep={setExpandedStep}
              generateWallet={generateWallet}
              walletName={walletName}
              setWalletName={setWalletName}
              handleCopy={handleCopy}
              copiedField={copiedField}
              setGeneratedWallets={setGeneratedWallets}
            />
          )}

          <GenerateUtilityTabs
            tab={tab}
            handleSaveHDWallet={handleSaveHDWallet}
            existingWallets={existingWallets}
            t={t}
            handleAdvancedEntropyGenerated={handleAdvancedEntropyGenerated}
          />

          {tab === 'vanity' && (
            <VanityTab
              {...vanity}
              t={t}
              allTags={allTags}
              generatedWallets={generatedWallets}
              setGeneratedWallets={setGeneratedWallets}
              walletName={walletName}
              handleCopy={handleCopy}
              copiedField={copiedField}
            />
          )}

        </div>

        <CreateWalletSaveFooter
          tab={tab}
          randomGeneratedWalletCount={randomGeneratedWallets.length}
          hasBulkResult={Boolean(bulkResult)}
          onSaveManual={handleSaveManual}
          onSaveGenerated={handleSaveGenerated}
          t={t}
        />
      </div>
      {showQRScanner && (
        <QRScannerModal
          onResult={({ text, type }) => {
            if (type === 'address') { setManualAddress(text); checkDuplicate(text); }
            else if (type === 'privateKey') setManualPK(text);
            else if (type === 'seedPhrase') setManualSeed(text);
            else setManualAddress(text);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}
