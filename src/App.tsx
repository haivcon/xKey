import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import {
  UploadCloud, BarChart3, Settings, Plus, FolderPlus, Bell, Eye, EyeOff, ShieldCheck, ServerOff, FileKey2
} from 'lucide-react';

// Components (Eager loaded)
import WalletList from './components/wallet/WalletList';
import AuthErrorScreen from './components/auth/AuthErrorScreen';
import FolderTabs from './components/FolderTabs';
import ActionBar from './components/ActionBar';
import DuplicateDetector from './components/DuplicateDetector';
import AdvancedToolsModal, { SENSITIVE_EXPORT_LOCK_KEY } from './components/AdvancedToolsModal';
import OnboardingScreen from './components/auth/OnboardingScreen';
import PinLockScreen from './components/auth/PinLockScreen';
import DeviceUnlockScreen from './components/auth/DeviceUnlockScreen';
import BatchActionBar from './components/BatchActionBar';
import AnimatedSplash from './components/AnimatedSplash';
import BackupExportModal from './components/backup/BackupExportModal';
import HomeHeader from './components/HomeHeader';
import BackupImportPasswordModal from './components/backup/BackupImportPasswordModal';

// Components (Lazy loaded)
const SettingsScreen = lazy(() => import('./components/SettingsScreen'));
const QRCodeModal = lazy(() => import('./components/qr/QRCodeModal'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const ExportCSVModal = lazy(() => import('./components/ExportCSVModal'));
const CsvImportPreviewModal = lazy(() => import('./components/CsvImportPreviewModal'));
const CreateWalletModal = lazy(() => import('./components/CreateWalletModal'));
const MoveToFolderModal = lazy(() => import('./components/MoveToFolderModal'));
const DonateModal = lazy(() => import('./components/DonateModal'));
const BulkNetworkModal = lazy(() => import('./components/BulkNetworkModal'));
const AssetBalanceModal = lazy(() => import('./components/AssetBalanceModal'));
const KeyHealthModal = lazy(() => import('./components/KeyHealthModal'));

// Utils & Hooks
import { hapticTap, hapticSuccess, initFeedbackSettings } from './utils/haptics';
import useAutoLock from './hooks/security/useAutoLock';
import useAutoBackup from './hooks/backup/useAutoBackup';
import useWallets from './hooks/useWallets';
import useFileImport from './hooks/useFileImport';
import useBackButton from './hooks/useBackButton';
import useShakeToLock from './hooks/security/useShakeToLock';
import useBatchSelect from './hooks/useBatchSelect';
import useLiteMode from './hooks/useLiteMode';
import useAppVersion from './hooks/useAppVersion';
import useGlobalInputFocus from './hooks/useGlobalInputFocus';
import useHomeHeaderHeight from './hooks/useHomeHeaderHeight';
import useBackupVerificationReport from './hooks/backup/useBackupVerificationReport';
import useExternalBackupOpen from './hooks/backup/useExternalBackupOpen';
import useAssetBalanceSettings from './hooks/useAssetBalanceSettings';
import useStartupIntegrity from './hooks/security/useStartupIntegrity';
import useBackupExport from './hooks/backup/useBackupExport';
import useFolderEditing from './hooks/useFolderEditing';
import useKeyHealthFlow from './hooks/useKeyHealthFlow';
import useVaultAuth from './hooks/security/useVaultAuth';
import useAppHealthMessages from './hooks/useAppHealthMessages';
import { useT } from './contexts/LanguageContext';
import { useToast } from './contexts/ToastContext';
import { useConfirm } from './contexts/ConfirmContext';
import { useTheme } from './contexts/ThemeContext';
import { appendAuditLog } from './utils/auditLog';
import { clearClipboardNow } from './utils/clipboard';
import { LOGO_LOCK_ENABLED_KEY, LOGO_LOCK_SETTINGS_CHANGED_EVENT } from './features/security/logoLock';
import type { WalletSaveInput } from './app/types';
import type { QrModalData, Wallet } from './types';

export default function App() {
  const [authError, setAuthError] = useState('');

  // Navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Modals
  const [qrModalData, setQrModalData] = useState<QrModalData>({ isOpen: false, data: '', title: '', subtitle: '' });
  const [showExportCSV, setShowExportCSV] = useState(false);
  const [exportWalletsOverride, setExportWalletsOverride] = useState<Wallet[] | null>(null);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showBulkNetworkModal, setShowBulkNetworkModal] = useState(false);
  const [movingWallet, setMovingWallet] = useState<Wallet | null>(null);
  const [showDonate, setShowDonate] = useState(false);
  const [showAssetBalance, setShowAssetBalance] = useState(false);
  const [showKeyHealth, setShowKeyHealth] = useState(false);
  const [logoLockEnabled, setLogoLockEnabled] = useState(false);
  const homeHeaderRef = useRef<HTMLElement | null>(null);
  const createWalletCloseHandlerRef = useRef<(() => void | Promise<void>) | null>(null);

  // Performance hooks
  useLiteMode();

  useEffect(() => {
    initFeedbackSettings();
  }, []);

  const t = useT();
  const tRef = useRef(t);
  const { showToast } = useToast() || {};
  const showConfirm = useConfirm();
  const appVersion = useAppVersion();
  const { brandReminders, privacyMode, togglePrivacyMode } = useTheme();

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // --- Custom Hooks ---
  const setWalletsRef = useRef<(wallets: Wallet[]) => void>(() => {});
  const setVaultLoadingRef = useRef<(loading: boolean) => void>(() => {});

  const {
    showSplash,
    setSplashAnimationDone,
    integrityStatus,
    integrityFailed,
    setIntegrityFailed,
  } = useStartupIntegrity({
    t,
    setAuthError,
    setVaultLoading: (loading) => setVaultLoadingRef.current(loading),
  });

  const {
    aesKey,
    setAesKey,
    isDecoyMode,
    showOnboarding,
    setShowOnboarding,
    vaultLoading,
    setVaultLoading,
    needsPinAuth,
    setNeedsPinAuth,
    useDeviceCredentialUnlock,
    handlePinSuccess,
    handleDeviceUnlock,
    resetVaultLock,
  } = useVaultAuth({
    showSplash,
    setWallets: (nextWallets) => setWalletsRef.current(nextWallets),
    setAuthError,
    t,
  });

  const {
    wallets, setWallets,
    activeFolder, setActiveFolder,
    searchQuery, setSearchQuery,
    sortOrder, setSortOrder,
    activeFilter, setActiveFilter,
    folders, filteredWallets, totalBalance, duplicateCount, allTags,
    handleDeleteWallet, handleDeleteWalletDirect,
    handleDeleteFolder, handleRemoveFolderOnly, handleRenameFolder,
    handleRenameWallet, handleEditWallet,
    handleBulkNetworkChange, handleCreateFolder, handleSaveWallet,
    handleToggleFolderPin, handleSetDefaultFolder, handleReorderFolder,
    handleTogglePin, handleMoveWallet, handleReorderWallet,
    pinnedFolders, defaultFolder,
  } = useWallets(aesKey, isDecoyMode);


  const handleWalletDropToFolder = useCallback((folder: string, walletId: string) => {
    const wallet = wallets.find(w => String(w._id || w.address || '') === walletId);
    if (!wallet) return;
    hapticSuccess();
    void handleMoveWallet(wallet, folder);
  }, [wallets, handleMoveWallet]);

  useEffect(() => {
    setWalletsRef.current = setWallets;
    setVaultLoadingRef.current = setVaultLoading;
  }, [setWallets, setVaultLoading]);
  const {
    showProofOfKeysReminder,
    keyHealthAttentionCount,
    runProofOfKeysCheck: handleRunProofOfKeysCheck,
    patchKeyHealthWallets,
  } = useKeyHealthFlow({
    aesKey,
    wallets,
    filteredWallets,
    setWallets,
    isDecoyMode,
    showToast,
    t,
  });

  const {
    showBackupExport,
    setShowBackupExport,
    backupPassword,
    setBackupPassword,
    backupPasswordConfirm,
    setBackupPasswordConfirm,
    backupFileName,
    setBackupFileName,
    backupExporting,
    showPasswordChallenge,
    passwordChallengeChoices,
    passwordChallengeSelected,
    passwordChallengeProgress,
    closeBackupExport,
    handleExportBackup,
    cancelPasswordChallenge,
    selectPasswordChallengeCharacter,
    clearPasswordChallengeSelection,
  } = useBackupExport({ aesKey, isDecoyMode, showToast, t });

  const {
    assetUnit,
    totalBalanceText,
    updateAssetUnit,
    handleSaveAssetBalances: saveAssetBalances,
  } = useAssetBalanceSettings({
    wallets,
    setWallets,
    totalBalance,
    aesKey,
    isDecoyMode,
    showToast,
    t,
  });

  const handleSaveAssetBalances = useCallback(async (...args: Parameters<typeof saveAssetBalances>) => {
    await saveAssetBalances(...args);
    const [, options = {}] = args;
    if (!options.silent) setShowAssetBalance(false);
  }, [saveAssetBalances]);

  const handleCreateWalletSave = useCallback(async (walletData: WalletSaveInput) => {
    const savedWallets = await handleSaveWallet(walletData);
    const firstSaved = Array.isArray(savedWallets) ? savedWallets[0] : savedWallets;
    if (firstSaved?.groupId) {
      setActiveFolder(firstSaved.groupId);
      setSearchQuery('');
      setActiveFilter('all');
      setSortOrder('none');
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        requestAnimationFrame(() => {
          document.querySelector('.wallet-new-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }
    return savedWallets;
  }, [handleSaveWallet, setActiveFolder, setSearchQuery, setActiveFilter, setSortOrder]);

  const {
    editingFolder,
    editFolderName,
    setEditFolderName,
    creatingFolder,
    newFolderName,
    setNewFolderName,
    startCreateFolder,
    finishCreateFolder,
    startEditFolder,
    finishEditFolder,
  } = useFolderEditing(handleCreateFolder);

  useHomeHeaderHeight(homeHeaderRef, location.pathname === '/');

  const {
    loading, fileOperationKey,
    showPasswordPrompt, backupPreview, backupAnalysis, restoreSandbox, csvImportPreview, backupImportMode, setBackupImportMode, updateMissingSensitive, setUpdateMissingSensitive, backupWalletsForSelection, selectedBackupWalletIds, setSelectedBackupWalletIds, importPassword, setImportPassword,
    handleFileUpload, handleExternalBackupFile, handleImportWithPassword, previewBackupWithPassword, updateCsvImportMapping, confirmCsvImport, saveCsvImportReport, dismissCsvImportPreview, saveRestoreReport, dismissPasswordPrompt,
  } = useFileImport(wallets, setWallets, aesKey, isDecoyMode);

  const {
    copyVerificationReport: handleCopyVerificationReport,
    copyBackupPreviewValue: handleCopyBackupPreviewValue,
    verifyBackupOnly,
  } = useBackupVerificationReport({ backupPreview, t, showToast });

  const externalBackupWaiting = useExternalBackupOpen(aesKey, handleExternalBackupFile);
  const healthMessages = useAppHealthMessages({ aesKey, externalBackupWaiting, tRef });

  const {
    selectionMode, toggleSelectionMode,
    selectedCount, toggleSelect, selectAll, deselectAll, isSelected,
    bulkDelete, bulkMove, bulkTag, bulkPin,
  } = useBatchSelect(wallets, setWallets, filteredWallets, aesKey, isDecoyMode);

  const closeQrModal = useCallback(() => {
    setQrModalData(prev => ({ ...prev, isOpen: false }));
  }, []);

  const registerCreateWalletCloseHandler = useCallback((handler: (() => void | Promise<void>) | null) => {
    createWalletCloseHandlerRef.current = handler;
  }, []);

  const closeCreateWalletFromBack = useCallback(() => {
    const handler = createWalletCloseHandlerRef.current;
    if (handler) return handler();
    setShowCreateWallet(false);
  }, []);

  useBackButton({
    showPasswordPrompt, setShowPasswordPrompt: dismissPasswordPrompt,
    showDuplicates, setShowDuplicates,
    showCreateWallet, setShowCreateWallet, closeCreateWallet: closeCreateWalletFromBack,
    showExportCSV, setShowExportCSV,
    showBackupExport, setShowBackupExport,
    showAdvancedTools, setShowAdvancedTools,
    showBulkNetworkModal, setShowBulkNetworkModal,
    showAssetBalance, setShowAssetBalance,
    movingWallet, setMovingWallet,
    showDonate, setShowDonate,
    qrModalOpen: qrModalData.isOpen, closeQrModal,
  });

  const isAppActive = useShakeToLock(needsPinAuth, vaultLoading, setNeedsPinAuth, !!aesKey);

  // Auto-lock after idle
  useAutoLock(() => { setNeedsPinAuth(true); }, !!aesKey);

  // Auto-backup on app open
  useAutoBackup(aesKey);

  useEffect(() => {
    appendAuditLog('app.opened', { version: appVersion.label }).catch(() => {});
  }, [appVersion.label]);

  useEffect(() => {
    const loadLogoLockSetting = async () => {
      const { value } = await Preferences.get({ key: LOGO_LOCK_ENABLED_KEY });
      setLogoLockEnabled(value === 'true');
    };

    loadLogoLockSetting();
    window.addEventListener(LOGO_LOCK_SETTINGS_CHANGED_EVENT, loadLogoLockSetting);
    return () => window.removeEventListener(LOGO_LOCK_SETTINGS_CHANGED_EVENT, loadLogoLockSetting);
  }, []);

  useGlobalInputFocus();

  // Self-destruct
  const handleSelfDestruct = async () => {
    const { wipeAllData } = await import('./utils/storage');
    await wipeAllData();
    await Preferences.clear();
    window.location.reload();
  };

  const handleEmergencyLock = useCallback(() => {
    clearClipboardNow().catch(() => {});
    setQrModalData(prev => ({ ...prev, isOpen: false, data: '', title: '', subtitle: '' }));
    setShowExportCSV(false);
    setExportWalletsOverride(null);
    setShowAdvancedTools(false);
    setShowCreateWallet(false);
    setShowDuplicates(false);
    setShowBulkNetworkModal(false);
    setMovingWallet(null);
    setShowDonate(false);
    setShowAssetBalance(false);
    setShowKeyHealth(false);
    closeBackupExport();
    dismissPasswordPrompt();
    setWallets([]);
    resetVaultLock();
    navigate('/');
    appendAuditLog('security.emergency_lock').catch(() => {});
  }, [closeBackupExport, dismissPasswordPrompt, navigate, resetVaultLock, setWallets]);

  // Wipe vault
  const handleWipe = () => {
    setWallets([]);
    resetVaultLock();
    navigate('/');
  };

  const handleVerifyBackupOnly = useCallback(() => {
    verifyBackupOnly(dismissPasswordPrompt);
  }, [dismissPasswordPrompt, verifyBackupOnly]);

  const openExportCSV = async (walletsOverride: Wallet[] | null = null) => {
    const { value } = await Preferences.get({ key: SENSITIVE_EXPORT_LOCK_KEY });
    if (value === 'true') {
      const ok = await showConfirm(t('advancedTools.csvLockConfirm'), { danger: true });
      if (!ok) return;
    }
    hapticTap();
    setExportWalletsOverride(walletsOverride);
    setShowExportCSV(true);
  };

  const openExportFolder = (folderName: string) => {
    const folderWallets = wallets.filter(w => (w.groupId || 'Imported') === folderName);
    setActiveFolder(folderName);
    setSearchQuery('');
    setActiveFilter('all');
    openExportCSV(folderWallets);
  };

  // --- View Router ---
  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (authError) {
    return (
      <AuthErrorScreen
        error={authError}
        title={integrityFailed ? t('integrity.failureTitle') : undefined}
        onRetry={() => {
          if (integrityFailed) {
            window.location.reload();
            return;
          }
          setAuthError('');
          setIntegrityFailed(false);
          setAesKey(null);
          setVaultLoading(false);
          setNeedsPinAuth(true);
        }}
      />
    );
  }

  let mainContent;

  if (!aesKey) {
    mainContent = (
      <div className={`min-h-screen bg-surface-950 text-white font-sans overflow-hidden flex flex-col ${!isAppActive ? 'blur-xl pointer-events-none' : ''} items-center justify-center`}>
        <div className="text-[56px] font-bold text-white tracking-[2px]" style={{ textShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}>
          xKey
        </div>
      </div>
    );
  } else if (location.pathname === '/settings') {
    mainContent = (
      <Suspense fallback={<div className="min-h-screen bg-surface-950 flex items-center justify-center text-brand-500"><Settings className="w-8 h-8 animate-spin" /></div>}>
        <SettingsScreen
          aesKey={aesKey}
          onBack={() => navigate('/')}
          onWipe={handleWipe}
          onImport={(newWallets) => setWallets(newWallets)}
        />
      </Suspense>
    );
  } else if (location.pathname === '/dashboard') {
    mainContent = (
      <Suspense fallback={<div className="min-h-screen bg-surface-950 flex items-center justify-center text-brand-500"><BarChart3 className="w-8 h-8 animate-pulse" /></div>}>
        <DashboardView wallets={wallets} onBack={() => navigate('/')} assetUnit={assetUnit} />
      </Suspense>
    );
  } else {
    // --- Home View ---
    mainContent = (
      <>
      <div className={`app-scaled-icons min-h-screen bg-surface-950 text-surface-50 font-sans selection:bg-brand-500/30 ${!isAppActive ? 'blur-xl pointer-events-none' : ''}`}>

        <HomeHeader
          headerRef={homeHeaderRef}
          brandReminders={brandReminders}
          t={t}
          onOpenDonate={() => setShowDonate(true)}
          onOpenSettings={() => navigate('/settings')}
          onEmergencyLock={handleEmergencyLock}
          logoLockEnabled={logoLockEnabled}
        />

        <main className="p-4 max-w-[140rem] mx-auto w-full pb-20">
          {externalBackupWaiting && (
            <div className="mb-3 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-100">
              {t('restore.externalWaiting')}
            </div>
          )}
          {healthMessages.length > 0 && (
            <div className="mb-3 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
              <div className="font-semibold">{t('health.title')}</div>
              <div className="mt-1 space-y-0.5">
                {healthMessages.map(message => <p key={message}>{message}</p>)}
              </div>
            </div>
          )}
          {wallets.length > 0 && keyHealthAttentionCount > 0 && (
            <button
              type="button"
              onClick={() => { hapticTap(); setShowKeyHealth(true); }}
              className="mb-3 flex w-full items-center justify-between gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-left text-xs text-amber-100 transition-colors hover:bg-amber-400/15"
            >
              <span className="min-w-0">
                <span className="block font-semibold">{showProofOfKeysReminder ? t('keyHealth.proofDayTitle') : t('keyHealth.attentionTitle')}</span>
                <span className="mt-0.5 block truncate text-amber-100/80">{t('keyHealth.attentionDesc', { count: keyHealthAttentionCount })}</span>
              </span>
              <Bell size={16} className="shrink-0" />
            </button>
          )}
          {wallets.length === 0 ? (
            <div className="space-y-4 mt-10 max-w-2xl mx-auto">
              {(folders.length > 1 || creatingFolder) && (
                <div className="glass-card p-3">
                  <FolderTabs
                    folders={folders}
                    activeFolder={activeFolder}
                    wallets={wallets}
                    editingFolder={editingFolder}
                    editFolderName={editFolderName}
                    pinnedFolders={pinnedFolders}
                    defaultFolder={defaultFolder}
                    creatingFolder={creatingFolder}
                    newFolderName={newFolderName}
                    onSelectFolder={(f) => { setActiveFolder(f); }}
                    onStartEdit={startEditFolder}
                    onEditChange={setEditFolderName}
                    onFinishEdit={(oldName, newName) => finishEditFolder(oldName, newName, handleRenameFolder)}
                    onDeleteFolder={handleDeleteFolder}
                    onRemoveFolderOnly={handleRemoveFolderOnly}
                    onTogglePinFolder={handleToggleFolderPin}
                    onSetDefaultFolder={handleSetDefaultFolder}
                    onExportFolder={openExportFolder}
                    onReorderFolder={handleReorderFolder}
                    onStartCreate={() => { hapticTap(); startCreateFolder(); }}
                    onCreateChange={setNewFolderName}
                    onFinishCreate={finishCreateFolder}
                    createFolderLabel={t('home.createFolder')}
                    t={t}
                  />
                </div>
              )}
              <div className="glass-card w-full overflow-hidden p-5 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-300 shadow-lg shadow-brand-500/10">
                  <FileKey2 size={28} />
                </div>
                <h2 className="text-2xl font-black text-white">{t('home.welcomeTitle')}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-surface-400">
                  {t('home.welcomeDesc')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => { hapticTap(); handleFileUpload(activeFolder !== 'All' ? activeFolder : undefined); }}
                className="btn-glow group glass-card flex w-full min-h-[240px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-brand-400/25 bg-gradient-to-br from-brand-500/10 via-surface-900/70 to-emerald-500/10 p-8 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-brand-400/60 hover:shadow-xl hover:shadow-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-400/40 active:scale-[0.98]"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-300 shadow-lg shadow-brand-500/10 transition-transform duration-200 group-hover:scale-110 group-hover:bg-brand-500/20">
                  {loading ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                  ) : (
                    <UploadCloud size={32} className="text-brand-400 transition-transform duration-200 group-hover:-translate-y-0.5" />
                  )}
                </div>
                <h3 className="mb-2 text-xl font-extrabold text-white">{t('home.importVaultFiles')}</h3>
                <p className="max-w-xl text-sm leading-relaxed text-surface-400">
                  {t('home.importVaultFilesDesc')}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-200">.CSV</span>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200">.XKEY</span>
                  <span className="rounded-full border border-surface-700 bg-surface-900 px-3 py-1 text-xs font-bold text-surface-300">OFFLINE</span>
                </div>
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-surface-500">
                  {t('home.importVaultFilesHint')}
                </p>
              </button>

              <div className="grid items-stretch gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { hapticTap(); setShowCreateWallet(true); }}
                  className="btn-glow glass-card group flex w-full cursor-pointer items-center justify-center gap-3 border-2 border-dashed border-brand-400/25 bg-brand-500/5 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/50 hover:bg-brand-500/10 hover:shadow-lg hover:shadow-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-400/30 active:scale-[0.98]"
                >
                  <Plus size={24} className="text-brand-400 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-semibold text-white">{t('home.addWallet')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { hapticTap(); startCreateFolder(); }}
                  className="btn-glow glass-card group flex w-full cursor-pointer items-center justify-center gap-3 border-2 border-dashed border-sky-400/25 bg-sky-500/5 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-sky-500/10 hover:shadow-lg hover:shadow-sky-500/10 focus:outline-none focus:ring-2 focus:ring-sky-400/30 active:scale-[0.98]"
                >
                  <FolderPlus size={23} className="text-brand-400 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-semibold text-white">{t('home.createFolder')}</span>
                </button>
              </div>

              <div className="grid items-stretch gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-center transition-transform duration-200 hover:-translate-y-0.5">
                  <ShieldCheck size={20} className="mx-auto text-emerald-300" />
                  <p className="mt-2 text-xs font-semibold text-surface-200">{t('home.localEncrypted')}</p>
                </div>
                <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-center transition-transform duration-200 hover:-translate-y-0.5">
                  <ServerOff size={20} className="mx-auto text-sky-300" />
                  <p className="mt-2 text-xs font-semibold text-surface-200">{t('home.noServer')}</p>
                </div>
                <div className="rounded-2xl border border-brand-400/20 bg-brand-500/10 p-3 text-center transition-transform duration-200 hover:-translate-y-0.5">
                  <FileKey2 size={20} className="mx-auto text-brand-300" />
                  <p className="mt-2 text-xs font-semibold text-surface-200">{t('home.xkeyBackup')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
              <aside className="hidden lg:block">
                <div className="sticky top-[calc(var(--home-header-height)+1rem)] space-y-3">
                  <div className="glass-card p-3">
                    <div className="flex items-center justify-between gap-3 px-2 pb-2">
                      <span className="text-scale-2xs font-semibold uppercase tracking-wider text-surface-500">{t('home.folders') || 'Folders'}</span><div className="flex items-center gap-1 rounded-lg border border-brand-500/20 bg-surface-900/50 px-2 py-1"><button type="button" onClick={() => { hapticTap(); setShowAssetBalance(true); }} className="min-w-0 text-right"><span className={`block truncate text-xs font-extrabold text-brand-400 hover:text-brand-300 transition-colors ${privacyMode ? 'privacy-mask-text' : ''}`}>{privacyMode ? '••••••' : totalBalanceText}</span></button><button type="button" onClick={() => { hapticTap(); togglePrivacyMode(); }} className={`ml-1 flex h-6 w-6 items-center justify-center rounded transition-colors ${privacyMode ? 'bg-brand-500/20 text-brand-300' : 'text-surface-400 hover:bg-surface-700 hover:text-white'}`} title={privacyMode ? t('privacy.showSensitiveValues') : t('privacy.hideSensitiveValues')} aria-label={privacyMode ? t('privacy.showSensitiveValues') : t('privacy.hideSensitiveValues')} aria-pressed={privacyMode}>{privacyMode ? <EyeOff size={13} /> : <Eye size={13} />}</button></div>
                    </div>
                    <FolderTabs
                      variant="sidebar"
                      folders={folders} activeFolder={activeFolder} wallets={wallets}
                      editingFolder={editingFolder} editFolderName={editFolderName}
                      pinnedFolders={pinnedFolders}
                      defaultFolder={defaultFolder}
                      creatingFolder={creatingFolder} newFolderName={newFolderName}
                      onSelectFolder={(f) => { setActiveFolder(f); }}
                      onStartEdit={startEditFolder}
                      onWalletDrop={handleWalletDropToFolder}

                      onEditChange={setEditFolderName}
                      onFinishEdit={(oldName, newName) => finishEditFolder(oldName, newName, handleRenameFolder)}
                      onDeleteFolder={handleDeleteFolder}
                      onRemoveFolderOnly={handleRemoveFolderOnly}
                      onTogglePinFolder={handleToggleFolderPin}
                      onSetDefaultFolder={handleSetDefaultFolder}
                      onExportFolder={openExportFolder}
                      onReorderFolder={handleReorderFolder}
                      onStartCreate={startCreateFolder}
                      onCreateChange={setNewFolderName}
                      onFinishCreate={finishCreateFolder}
                      createFolderLabel={t('home.createFolder')}
                      t={t}
                    />
                  </div>
                </div>
              </aside>

              <section className="min-w-0">
                <div className="sticky top-[var(--home-header-height)] z-20 -mx-4 px-4 pt-3 pb-2 bg-surface-950/95 text-white backdrop-blur-md border-b border-surface-900/80">
                  <div className="lg:hidden grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <FolderTabs
                        folders={folders} activeFolder={activeFolder} wallets={wallets}
                        editingFolder={editingFolder} editFolderName={editFolderName}
                        pinnedFolders={pinnedFolders}
                        defaultFolder={defaultFolder}
                        creatingFolder={creatingFolder} newFolderName={newFolderName}
                        onSelectFolder={(f) => { setActiveFolder(f); }}
                        onStartEdit={startEditFolder}
                        onEditChange={setEditFolderName}
                        onFinishEdit={(oldName, newName) => finishEditFolder(oldName, newName, handleRenameFolder)}
                        onDeleteFolder={handleDeleteFolder}
                        onRemoveFolderOnly={handleRemoveFolderOnly}
                        onTogglePinFolder={handleToggleFolderPin}
                        onSetDefaultFolder={handleSetDefaultFolder}
                        onExportFolder={openExportFolder}
                        onReorderFolder={handleReorderFolder}
                        onWalletDrop={handleWalletDropToFolder}
                        onStartCreate={startCreateFolder}
                        onCreateChange={setNewFolderName}
                        onFinishCreate={finishCreateFolder}
                        createFolderLabel={t('home.createFolder')}
                        t={t}
                      />
                    </div>
                    <div className="grid max-w-[38vw] flex-shrink-0 grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-1 rounded-xl border border-brand-500/30 bg-surface-900 px-2 py-1.5 text-right shadow-sm">
                      <button
                        type="button"
                        onClick={() => { hapticTap(); setShowAssetBalance(true); }}
                        className="min-w-0 text-right"
                      >
                        <span className="block text-scale-3xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">{t('home.totalAssets')}</span>
                        <span className={`block truncate text-xs font-extrabold leading-none text-brand-700 dark:text-brand-200 ${privacyMode ? 'privacy-mask-text' : ''}`}>{privacyMode ? '••••••' : totalBalanceText}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { hapticTap(); togglePrivacyMode(); }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${privacyMode ? 'bg-brand-500/20 text-brand-300' : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-white'}`}
                        title={privacyMode ? t('privacy.showSensitiveValues') : t('privacy.hideSensitiveValues')}
                        aria-label={privacyMode ? t('privacy.showSensitiveValues') : t('privacy.hideSensitiveValues')}
                        aria-pressed={privacyMode}
                      >
                        {privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <ActionBar
                    searchQuery={searchQuery} onSearchChange={setSearchQuery}
                    sortOrder={sortOrder} onSortChange={setSortOrder}
                    activeFilter={activeFilter} onFilterChange={setActiveFilter}
                    onAddWallet={() => { hapticTap(); setShowCreateWallet(true); }}
                    onBulkNetwork={() => { hapticTap(); setShowBulkNetworkModal(true); }}
                    onUpload={() => { hapticTap(); handleFileUpload(activeFolder !== 'All' ? activeFolder : undefined); }}
                    loading={loading}
                    allTags={allTags}
                    selectionMode={selectionMode}
                    onToggleSelectionMode={toggleSelectionMode}
                    onExportCSV={openExportCSV}
                    onExportBackup={() => { hapticTap(); setShowBackupExport(true); }}
                    onShowDuplicates={() => { hapticTap(); setShowDuplicates(true); }}
                    duplicateCount={duplicateCount}
                    onAnalytics={() => { hapticTap(); navigate('/dashboard'); }}
                    onAdvancedTools={() => { hapticTap(); setShowAdvancedTools(true); }}
                    keyHealthAttentionCount={keyHealthAttentionCount}
                    onOpenKeyHealth={() => { hapticTap(); setShowKeyHealth(true); }}
                  />
                </div>

                <WalletList
                  vaultLoading={vaultLoading}
                  filteredWallets={filteredWallets}
                  setQrModalData={setQrModalData}
                  handleDeleteWallet={handleDeleteWallet}
                  handleRenameWallet={handleRenameWallet}
                  handleEditWallet={handleEditWallet}
                  handleTogglePin={handleTogglePin}
                  setMovingWallet={setMovingWallet}
                  t={t}
                  selectionMode={selectionMode}
                  isSelected={isSelected}
                  toggleSelect={toggleSelect}
                  sortOrder={sortOrder}
                  onReorder={handleReorderWallet}
                  assetUnit={assetUnit}
                  activeFolder={activeFolder}
                  searchQuery={searchQuery}
                  onAddWallet={() => { hapticTap(); setShowCreateWallet(true); }}
                  onImport={() => { hapticTap(); handleFileUpload(activeFolder !== 'All' ? activeFolder : undefined); }}
                />
              </section>
            </div>
          )}
        </main>

        {/* Modals wrapped in Suspense */}
        <Suspense fallback={null}>
          <QRCodeModal
            isOpen={qrModalData.isOpen}
            onClose={closeQrModal}
            data={qrModalData.data}
            title={qrModalData.title}
            subtitle={qrModalData.subtitle}
          />
          {showExportCSV && (
            <ExportCSVModal
              onClose={() => {
                setShowExportCSV(false);
                setExportWalletsOverride(null);
              }}
              wallets={exportWalletsOverride || filteredWallets}
              aesKey={aesKey}
            />
          )}
        {showCreateWallet && (
          <CreateWalletModal
            onClose={() => setShowCreateWallet(false)}
            registerCloseHandler={registerCreateWalletCloseHandler}
            onSave={handleCreateWalletSave}
            aesKey={aesKey}
            existingWallets={wallets}
            folders={folders}
            activeFolder={activeFolder}
            allTags={allTags}
          />
        )}

        {showDuplicates && (
          <DuplicateDetector
            wallets={wallets}
            onDeleteWallet={handleDeleteWalletDirect}
            onClose={() => setShowDuplicates(false)}
          />
        )}

        {movingWallet && (
          <MoveToFolderModal
            wallet={movingWallet}
            folders={folders}
            onMove={handleMoveWallet}
            onClose={() => setMovingWallet(null)}
          />
        )}

        {showBulkNetworkModal && (
          <BulkNetworkModal
            wallets={wallets}
            onClose={() => setShowBulkNetworkModal(false)}
            onSave={(network) => { handleBulkNetworkChange(network); setShowBulkNetworkModal(false); }}
          />
        )}
        {showDonate && (
          <DonateModal onClose={() => setShowDonate(false)} />
        )}
        {showAssetBalance && (
          <AssetBalanceModal
            wallets={filteredWallets}
            assetUnit={assetUnit}
            totalBalance={totalBalance}
            onClose={() => setShowAssetBalance(false)}
            onSave={handleSaveAssetBalances}
            onUnitChange={updateAssetUnit}
            t={t}
          />
        )}
        {showKeyHealth && (
          <KeyHealthModal
            wallets={wallets}
            visibleWallets={filteredWallets}
            onClose={() => setShowKeyHealth(false)}
            onRunProofCheck={handleRunProofOfKeysCheck}
            onMarkReviewed={(targetWallets) => patchKeyHealthWallets(targetWallets, { keyHealthReviewedAt: Date.now(), rotationSnoozedUntil: undefined })}
            onRemindLater={(targetWallets) => patchKeyHealthWallets(targetWallets, { rotationSnoozedUntil: Date.now() + 30 * 24 * 60 * 60 * 1000 })}
            onCreateReplacement={() => { setShowKeyHealth(false); setShowCreateWallet(true); }}
            t={t}
          />
        )}
        </Suspense>

        {showAdvancedTools && (
          <AdvancedToolsModal
            wallets={wallets}
            filteredWallets={filteredWallets}
            setWallets={setWallets}
            aesKey={aesKey}
            isDecoyMode={isDecoyMode}
            onSearch={setSearchQuery}
            onClose={() => setShowAdvancedTools(false)}
          />
        )}

        {/* Password prompt for backup import */}
        {showPasswordPrompt && (
          <BackupImportPasswordModal
            loading={loading}
            fileOperationKey={fileOperationKey}
            backupPreview={backupPreview}
            backupAnalysis={backupAnalysis}
            restoreSandbox={restoreSandbox}
            backupImportMode={backupImportMode}
            updateMissingSensitive={updateMissingSensitive}
            importPassword={importPassword}
            backupWalletsForSelection={backupWalletsForSelection}
            selectedBackupWalletIds={selectedBackupWalletIds}
            brandReminders={brandReminders}
            t={t}
            onPasswordChange={setImportPassword}
            onSelectedBackupWalletIdsChange={setSelectedBackupWalletIds}
            onCancel={dismissPasswordPrompt}
            onPreview={previewBackupWithPassword}
            onImport={handleImportWithPassword}
            onSaveRestoreReport={saveRestoreReport}
            onVerifyOnly={handleVerifyBackupOnly}
            onCopyVerificationReport={handleCopyVerificationReport}
            onCopyPreviewValue={handleCopyBackupPreviewValue}
            onImportModeChange={setBackupImportMode}
            onUpdateMissingSensitiveChange={setUpdateMissingSensitive}
            onConfirmReplace={() => showConfirm(t('restore.replaceConfirm'), { danger: true })}
            onConfirmUpdateMissingSensitive={() => showConfirm(t('restore.updateMissingSensitiveConfirm'))}
            onHapticTap={hapticTap}
            onHapticSuccess={hapticSuccess}
          />
        )}

        {csvImportPreview && (
          <CsvImportPreviewModal
            preview={csvImportPreview}
            loading={loading}
            brandReminders={brandReminders}
            t={t}
            onMappingChange={updateCsvImportMapping}
            onCancel={dismissCsvImportPreview}
            onImport={confirmCsvImport}
            onSaveReport={saveCsvImportReport}
          />
        )}

        {showBackupExport && (
          <BackupExportModal
            fileName={backupFileName}
            password={backupPassword}
            passwordConfirm={backupPasswordConfirm}
            exporting={backupExporting}
            brandReminders={brandReminders}
            showPasswordChallenge={showPasswordChallenge}
            passwordChallengeChoices={passwordChallengeChoices}
            passwordChallengeSelected={passwordChallengeSelected}
            passwordChallengeComplete={passwordChallengeProgress.isComplete}
            t={t}
            onFileNameChange={setBackupFileName}
            onPasswordChange={setBackupPassword}
            onPasswordConfirmChange={setBackupPasswordConfirm}
            onClose={closeBackupExport}
            onExport={handleExportBackup}
            onCancelPasswordChallenge={cancelPasswordChallenge}
            onSelectPasswordChallengeCharacter={selectPasswordChallengeCharacter}
            onClearPasswordChallengeSelection={clearPasswordChallengeSelection}
          />
        )}

        {selectionMode && (
          <BatchActionBar
            selectedCount={selectedCount}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onDelete={bulkDelete}
            onMove={bulkMove}
            onTag={bulkTag}
            onPin={bulkPin}
            onCancel={toggleSelectionMode}
            folders={folders}
          />
        )}
      </div>
      </>
    );
  }

  return (
    <>
      {showSplash && <AnimatedSplash onFinish={() => setSplashAnimationDone(true)} status={integrityStatus} version={appVersion.version} />}
      <div style={{ display: (needsPinAuth && !vaultLoading) ? 'none' : 'block' }}>
        {mainContent}
      </div>
      {needsPinAuth && !vaultLoading && (
        <div className="fixed inset-0 z-[10000] bg-surface-950">
          {useDeviceCredentialUnlock ? (
            <DeviceUnlockScreen onUnlock={handleDeviceUnlock} />
          ) : (
            <PinLockScreen onSuccess={handlePinSuccess} onSelfDestruct={handleSelfDestruct} />
          )}
          {!isAppActive && (
            <div className="fixed inset-0 z-[10001] bg-surface-950/80 backdrop-blur-xl flex items-center justify-center">
              <div className="text-[40px] font-bold text-white/30 tracking-[2px]">xKey</div>
            </div>
          )}
        </div>
      )}
      {!isAppActive && !needsPinAuth && (
        <div className="fixed inset-0 z-[9999] bg-surface-950/95 backdrop-blur-xl flex items-center justify-center">
          <div className="rounded-2xl border border-surface-800 bg-surface-900/80 px-8 py-6 text-center shadow-2xl">
            <div className="text-[34px] font-bold text-white/50 tracking-[2px]">xKey</div>
            <div className="mt-1 text-xs font-medium text-surface-500">{t('privacyShield.subtitle')}</div>
          </div>
        </div>
      )}
    </>
  );
}
