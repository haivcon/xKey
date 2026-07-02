import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useT } from '../../contexts/LanguageContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { CreateWalletHeader, CreateWalletSaveFooter } from './CreateWalletModalLayout';
import { CreateWalletQRScanner } from './CreateWalletQRScanner';
import { CreateWalletTabs, GenerateModeTabs } from './CreateWalletTabs';
import { PostQuantumOptions } from './PostQuantumOptions';
import { ManualTab } from './tabs/ManualTab';
import { GenerateTab, GenerateUtilityTabs } from './tabs/GenerateTab';
import { VanityTab } from './tabs/VanityTab';
import { useVanityGeneration } from '../../hooks/vanity/useVanityGeneration';
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
    entropyVerification,
    retryEntropyVerification,
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

  const vanity = useVanityGeneration({
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

  const mathStepItems = t('createWallet.mathSteps.steps') as unknown as MathStep[];

  return (
    <div className="app-scaled-icons create-wallet-modal-shell fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="create-wallet-modal-panel flex flex-col rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <CreateWalletHeader t={t} onClose={vanity.closeCreateWalletModal} />

        <CreateWalletTabs tab={tab} setTab={setTab} t={t} />

        <div className="keyboard-scroll-target create-wallet-modal-body space-y-4 overflow-y-auto flex-1">
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
              entropyVerification={entropyVerification}
              onRetryEntropy={retryEntropyVerification}
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
      <CreateWalletQRScanner
        show={showQRScanner}
        setManualAddress={setManualAddress}
        setManualPK={setManualPK}
        setManualSeed={setManualSeed}
        checkDuplicate={checkDuplicate}
        onClose={() => setShowQRScanner(false)}
      />
    </div>
  );
}
