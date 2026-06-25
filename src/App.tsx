import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import {
  UploadCloud, BarChart3, Settings, Plus, FolderPlus, Bell
} from 'lucide-react';

// Components (Eager loaded)
import WalletList from './components/WalletList';
import AuthErrorScreen from './components/AuthErrorScreen';
import FolderTabs from './components/FolderTabs';
import ActionBar from './components/ActionBar';
import DuplicateDetector from './components/DuplicateDetector';
import AdvancedToolsModal, { SENSITIVE_EXPORT_LOCK_KEY } from './components/AdvancedToolsModal';
import OnboardingScreen, { ONBOARDED_KEY } from './components/OnboardingScreen';
import PinLockScreen, { PIN_HASH_KEY } from './components/PinLockScreen';
import DeviceUnlockScreen from './components/DeviceUnlockScreen';
import BatchActionBar from './components/BatchActionBar';
import AnimatedSplash from './components/AnimatedSplash';
import BackupExportModal from './components/BackupExportModal';
import HomeHeader from './components/HomeHeader';
import BackupImportPasswordModal from './components/backup-import/BackupImportPasswordModal';

// Components (Lazy loaded)
const SettingsScreen = lazy(() => import('./components/SettingsScreen'));
const QRCodeModal = lazy(() => import('./components/QRCodeModal'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const ExportCSVModal = lazy(() => import('./components/ExportCSVModal'));
const CreateWalletModal = lazy(() => import('./components/CreateWalletModal'));
const MoveToFolderModal = lazy(() => import('./components/MoveToFolderModal'));
const DonateModal = lazy(() => import('./components/DonateModal'));
const BulkNetworkModal = lazy(() => import('./components/BulkNetworkModal'));
const AssetBalanceModal = lazy(() => import('./components/AssetBalanceModal'));
const KeyHealthModal = lazy(() => import('./components/KeyHealthModal'));

// Utils & Hooks
import {
  loadWallets,
  saveWallets,
  isBiometricAvailable,
  getEncryptionKeyBiometric,
  getEncryptionKeyFallback,
  hasFallbackEncryptionKey,
  persistFallbackEncryptionKey,
  persistBiometricEncryptionKey,
} from './utils/storage';
import { exportPortableBackup } from './utils/backupUtils';
import { hapticTap, hapticSuccess, initFeedbackSettings } from './utils/haptics';
import useAutoLock from './hooks/useAutoLock';
import useAutoBackup from './hooks/useAutoBackup';
import useWallets from './hooks/useWallets';
import useFileImport from './hooks/useFileImport';
import useBackButton from './hooks/useBackButton';
import useShakeToLock from './hooks/useShakeToLock';
import useBatchSelect from './hooks/useBatchSelect';
import useLiteMode from './hooks/useLiteMode';
import useAppVersion from './hooks/useAppVersion';
import useGlobalInputFocus from './hooks/useGlobalInputFocus';
import useHomeHeaderHeight from './hooks/useHomeHeaderHeight';
import useBackupVerificationReport from './hooks/useBackupVerificationReport';
import useExternalBackupOpen from './hooks/useExternalBackupOpen';
import useAssetBalanceSettings from './hooks/useAssetBalanceSettings';
import useStartupIntegrity from './hooks/useStartupIntegrity';
import { useT } from './contexts/LanguageContext';
import { useToast } from './contexts/ToastContext';
import { useConfirm } from './contexts/ConfirmContext';
import { useTheme } from './contexts/ThemeContext';
import { getDeviceIntegrityRisk, isDeviceIntegrityGuardEnabled } from './utils/deviceIntegrity';
import { appendAuditLog } from './utils/auditLog';
import { cleanupInternalTextFiles } from './utils/internalTextStore';
import { runWalletProofCheck, selectProofWallets, shouldShowProofOfKeysReminder, summarizeKeyHealth, type ProofCheckReport, type ProofScope } from './utils/keyHealth';
import { INTERNAL_TEXT_MAX_AGE_MS, REPLACE_SNAPSHOT_KEY } from './app/constants';
import type { PinSuccessOptions, WalletSaveInput } from './app/types';
import type { QrModalData, Wallet } from './types';

export default function App() {
  // Auth state
  const [aesKey, setAesKey] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [isDecoyMode, setIsDecoyMode] = useState(false);

  // Navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Modals
  const [qrModalData, setQrModalData] = useState<QrModalData>({ isOpen: false, data: '', title: '', subtitle: '' });
  const [showExportCSV, setShowExportCSV] = useState(false);
  const [exportWalletsOverride, setExportWalletsOverride] = useState<Wallet[] | null>(null);
  const [showBackupExport, setShowBackupExport] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [backupFileName, setBackupFileName] = useState('');
  const [backupExporting, setBackupExporting] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showBulkNetworkModal, setShowBulkNetworkModal] = useState(false);
  const [movingWallet, setMovingWallet] = useState<Wallet | null>(null);
  const [showDonate, setShowDonate] = useState(false);
  const [showAssetBalance, setShowAssetBalance] = useState(false);
  const [showKeyHealth, setShowKeyHealth] = useState(false);
  const homeHeaderRef = useRef<HTMLElement | null>(null);
  const createWalletCloseHandlerRef = useRef<(() => void | Promise<void>) | null>(null);

  // Performance hooks
  useLiteMode();

  useEffect(() => {
    initFeedbackSettings();
  }, []);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [needsPinAuth, setNeedsPinAuth] = useState(false);
  const [healthMessages, setHealthMessages] = useState<string[]>([]);
  const useDeviceCredentialUnlock = Capacitor.isNativePlatform();

  // Folder editing
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const t = useT();
  const tRef = useRef(t);
  const { showToast } = useToast() || {};
  const showConfirm = useConfirm();
  const appVersion = useAppVersion();
  const { brandReminders } = useTheme();

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const {
    showSplash,
    setSplashAnimationDone,
    integrityStatus,
    integrityFailed,
    setIntegrityFailed,
  } = useStartupIntegrity({ t, setAuthError, setVaultLoading });

  // ─── Custom Hooks ───
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
  const keyHealthSummary = useMemo(() => summarizeKeyHealth(wallets), [wallets]);
  const showProofOfKeysReminder = shouldShowProofOfKeysReminder();
  const keyHealthAttentionCount = keyHealthSummary.attentionCount + (showProofOfKeysReminder ? 1 : 0);

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

  const getWalletIdentity = useCallback((wallet: Wallet) => (
    wallet._id || `${wallet.address || ''}|${wallet.name || ''}|${wallet.groupId || ''}|${wallet.createdAt || ''}`
  ), []);

  const handleRunProofOfKeysCheck = useCallback(async (scope: ProofScope): Promise<ProofCheckReport> => {
    const now = Date.now();
    if (!aesKey || wallets.length === 0) {
      return { total: 0, passed: 0, failed: 0, skipped: 0, checkedAt: now, scope, results: [] };
    }
    const targetWallets = selectProofWallets(wallets, scope, filteredWallets, now);
    if (targetWallets.length === 0) {
      return { total: 0, passed: 0, failed: 0, skipped: 0, checkedAt: now, scope, results: [] };
    }
    const randomNonce = crypto.getRandomValues(new Uint8Array(16));
    const nonce = Array.from(randomNonce, byte => byte.toString(16).padStart(2, '0')).join('');
    const checkedTargets = await Promise.all(targetWallets.map(wallet => runWalletProofCheck(wallet, nonce, now)));
    const checkedById = new Map(checkedTargets.map(wallet => [getWalletIdentity(wallet), wallet]));
    const checked = wallets.map(wallet => checkedById.get(getWalletIdentity(wallet)) || wallet);
    setWallets(checked);
    await saveWallets(checked, aesKey, isDecoyMode);
    const passed = checkedTargets.filter(wallet => wallet.lastProofOfKeysStatus === 'passed').length;
    const failed = checkedTargets.filter(wallet => wallet.lastProofOfKeysStatus === 'failed').length;
    const skipped = checkedTargets.filter(wallet => wallet.lastProofOfKeysStatus === 'skipped').length;
    const report: ProofCheckReport = {
      total: checkedTargets.length,
      passed,
      failed,
      skipped,
      checkedAt: now,
      scope,
      results: checkedTargets.map(wallet => ({
        name: wallet.name || t('walletCard.unnamed'),
        address: wallet.address || '',
        status: wallet.lastProofOfKeysStatus || 'skipped',
        message: wallet.lastProofOfKeysMessage || '',
      })),
    };
    appendAuditLog('wallet.proof_of_keys_check', { total: checkedTargets.length, passed, failed, skipped, scope }).catch(() => {});
    showToast?.(t('keyHealth.proofResult', { passed, total: checkedTargets.length, failed, skipped }), failed > 0 ? 'warning' : 'success');
    return report;
  }, [aesKey, wallets, filteredWallets, getWalletIdentity, setWallets, isDecoyMode, showToast, t]);

  const patchKeyHealthWallets = useCallback(async (targetWallets: Wallet[], patch: Partial<Wallet>) => {
    if (!aesKey || targetWallets.length === 0) return;
    const targetIds = new Set(targetWallets.map(getWalletIdentity));
    const updated = wallets.map(wallet => targetIds.has(getWalletIdentity(wallet)) ? { ...wallet, ...patch } : wallet);
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  }, [aesKey, wallets, getWalletIdentity, setWallets, isDecoyMode]);

  const startCreateFolder = useCallback(() => {
    setEditingFolder(null);
    setNewFolderName('');
    setCreatingFolder(true);
  }, []);

  const finishCreateFolder = useCallback(async (name: string) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      setCreatingFolder(false);
      setNewFolderName('');
      return;
    }
    const created = await handleCreateFolder(trimmed);
    if (created) {
      setCreatingFolder(false);
      setNewFolderName('');
    }
  }, [handleCreateFolder]);

  useHomeHeaderHeight(homeHeaderRef, location.pathname === '/');

  const {
    loading, fileOperationKey,
    showPasswordPrompt, backupPreview, backupAnalysis, backupImportMode, setBackupImportMode, updateMissingSensitive, setUpdateMissingSensitive, importPassword, setImportPassword,
    handleFileUpload, handleExternalBackupFile, handleImportWithPassword, previewBackupWithPassword, dismissPasswordPrompt,
  } = useFileImport(wallets, setWallets, aesKey, isDecoyMode);

  const {
    copyVerificationReport: handleCopyVerificationReport,
    copyBackupPreviewValue: handleCopyBackupPreviewValue,
    verifyBackupOnly,
  } = useBackupVerificationReport({ backupPreview, t, showToast });

  const externalBackupWaiting = useExternalBackupOpen(aesKey, handleExternalBackupFile);

  useEffect(() => {
    if (!aesKey) return;
    let active = true;
    (async () => {
      const messages: string[] = [];
      const [snapshot, cleaned] = await Promise.all([
        Preferences.get({ key: REPLACE_SNAPSHOT_KEY }).then(({ value }) => value).catch(() => ''),
        cleanupInternalTextFiles(['xkey-replace-snapshot', 'xkey-vanity-session'], INTERNAL_TEXT_MAX_AGE_MS),
      ]);
      if (snapshot) messages.push(tRef.current('health.replaceSnapshotPending'));
      if (externalBackupWaiting) messages.push(tRef.current('health.externalBackupPending'));
      if (cleaned > 0) messages.push(tRef.current('health.cleanedTempFiles', { count: cleaned }));
      if (active) setHealthMessages(messages);
    })();
    return () => {
      active = false;
    };
  }, [aesKey, externalBackupWaiting]);

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

  useGlobalInputFocus();

  // On Unlock, load data
  useEffect(() => {
    if (showSplash) return;

    const authenticate = async () => {
      try {
        if (useDeviceCredentialUnlock && await isDeviceIntegrityGuardEnabled()) {
          const riskInfo = await getDeviceIntegrityRisk();
          if (riskInfo?.risky) {
            await appendAuditLog('device_integrity.blocked', { reasons: riskInfo.reasons || [] }).catch(() => {});
            setAuthError(tRef.current('integrity.deviceRiskBlocked'));
            setVaultLoading(false);
            return;
          }
        }

        const { value: onboarded } = await Preferences.get({ key: ONBOARDED_KEY });
        if (!onboarded) { setShowOnboarding(true); }

        const hasBio = await isBiometricAvailable();
        if (hasBio) {
          if (useDeviceCredentialUnlock) {
            setNeedsPinAuth(true);
          } else {
            try {
              const key = await getEncryptionKeyBiometric();
              setAesKey(key);
              const savedWallets = await loadWallets(key);
              if (savedWallets && savedWallets.length > 0) {
                setWallets(savedWallets);
              }
            } catch (bioErr) {
              const [{ value: pinHash }, hasFallbackKey] = await Promise.all([
                Preferences.get({ key: PIN_HASH_KEY }),
                hasFallbackEncryptionKey(),
              ]);
              if (pinHash && hasFallbackKey) {
                setNeedsPinAuth(true);
              } else {
                throw bioErr;
              }
            }
          }
        } else {
          setNeedsPinAuth(true);
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : tRef.current('deviceUnlock.unlockFailed'));
      }
      setVaultLoading(false);
    };
    authenticate();
  }, [showSplash, setWallets, useDeviceCredentialUnlock]);

  // Called after PIN verification succeeds
  const handlePinSuccess = async (isDecoy = false, options: PinSuccessOptions = {}) => {
    try {
      setIsDecoyMode(isDecoy);
      const key = aesKey || await getEncryptionKeyFallback({ createIfMissing: !!options.createdPin });
      if (aesKey) {
        await persistFallbackEncryptionKey(aesKey);
      }
      if (!isDecoy) {
        persistBiometricEncryptionKey(key).catch(() => {});
      }
      setAesKey(key);
      const savedWallets = await loadWallets(key, isDecoy);
      if (savedWallets && savedWallets.length > 0) {
        setWallets(savedWallets);
      } else {
        setWallets([]);
      }
      setNeedsPinAuth(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : tRef.current('deviceUnlock.unlockFailed'));
    }
  };

  const handleDeviceUnlock = useCallback(async () => {
    setIsDecoyMode(false);
    const key = await getEncryptionKeyBiometric();
    setAesKey(key);
    const savedWallets = await loadWallets(key);
    setWallets(savedWallets && savedWallets.length > 0 ? savedWallets : []);
    setNeedsPinAuth(false);
  }, [setWallets]);

  // Self-destruct
  const handleSelfDestruct = async () => {
    const { wipeAllData } = await import('./utils/storage');
    await wipeAllData();
    await Preferences.clear();
    window.location.reload();
  };

  // Wipe vault
  const handleWipe = () => {
    setWallets([]);
    setAesKey(null);
    navigate('/');
    setNeedsPinAuth(true);
  };

  const closeBackupExport = () => {
    setShowBackupExport(false);
    setBackupPassword('');
    setBackupPasswordConfirm('');
    setBackupFileName('');
  };

  const handleVerifyBackupOnly = useCallback(() => {
    verifyBackupOnly(dismissPasswordPrompt);
  }, [dismissPasswordPrompt, verifyBackupOnly]);

  const handleExportBackup = async () => {
    if (!backupPassword || backupPassword.length < 6) {
      showToast?.(t('settings.passwordMinError'), 'warning');
      return;
    }
    if (backupPassword !== backupPasswordConfirm) {
      showToast?.(t('settings.passwordMismatch'), 'error');
      return;
    }

    setBackupExporting(true);
    try {
      const currentWallets = await loadWallets(aesKey, isDecoyMode);
      const success = await exportPortableBackup(currentWallets || [], null, backupPassword, backupFileName);
      if (success) {
        hapticSuccess();
        showToast?.(t('settings.exportSuccess'), 'success');
        closeBackupExport();
      } else {
        showToast?.(t('settings.exportFailed'), 'error');
      }
    } catch {
      showToast?.(t('settings.exportError'), 'error');
    } finally {
      setBackupExporting(false);
    }
  };

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

  // ─── View Router ───
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
    // ─── Home View ───
    mainContent = (
      <>
      <div className={`app-scaled-icons min-h-screen bg-surface-950 text-surface-50 font-sans selection:bg-brand-500/30 ${!isAppActive ? 'blur-xl pointer-events-none' : ''}`}>

        <HomeHeader
          headerRef={homeHeaderRef}
          version={appVersion.version}
          brandReminders={brandReminders}
          keyHealthAttentionCount={keyHealthAttentionCount}
          t={t}
          onOpenKeyHealth={() => setShowKeyHealth(true)}
          onOpenDonate={() => setShowDonate(true)}
          onOpenSettings={() => navigate('/settings')}
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
                    onStartEdit={(f) => { setEditingFolder(f); setEditFolderName(f); }}
                    onEditChange={setEditFolderName}
                    onFinishEdit={(oldName, newName) => { handleRenameFolder(oldName, newName); setEditingFolder(null); }}
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
              {folders.length <= 1 && !creatingFolder && (
                <div className="glass-card p-3">
                  <button
                    type="button"
                    onClick={() => { hapticTap(); startCreateFolder(); }}
                    className="btn-glow flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-surface-700 bg-surface-900 px-4 py-3 text-sm font-semibold text-surface-300 transition-colors hover:border-brand-400/60 hover:bg-brand-500/10 hover:text-brand-200"
                  >
                    <FolderPlus size={18} />
                    {t('home.createFolder')}
                  </button>
                </div>
              )}
              <div
                onClick={() => { hapticTap(); handleFileUpload(activeFolder !== 'All' ? activeFolder : undefined); }}
                className="btn-glow glass-card border-dashed border-2 border-surface-200/20 hover:border-brand-500/50 cursor-pointer p-8 flex flex-col items-center justify-center transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UploadCloud size={32} className="text-brand-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('home.importCSV')}</h3>
                <p className="text-surface-400 text-sm text-center">
                  {t('home.importDesc')}
                </p>
              </div>
              <button
                onClick={() => { hapticTap(); setShowCreateWallet(true); }}
                className="btn-glow w-full glass-card border-dashed border-2 border-surface-200/20 hover:border-brand-500/50 cursor-pointer p-6 flex items-center justify-center gap-3 transition-all group"
              >
                <Plus size={24} className="text-brand-400 group-hover:scale-110 transition-transform" />
                <span className="text-white font-medium">{t('home.addWallet')}</span>
              </button>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
              <aside className="hidden lg:block">
                <div className="sticky top-[calc(var(--home-header-height)+1rem)] space-y-3">
                  <div className="glass-card p-3">
                    <div className="flex items-center justify-between gap-3 px-2 pb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500">
                        {t('home.folders') || 'Folders'}
                      </span>
                      <button
                        type="button"
                        onClick={() => { hapticTap(); setShowAssetBalance(true); }}
                        className="rounded-full bg-surface-800 px-2.5 py-1 text-xs font-semibold text-surface-100 hover:bg-surface-700"
                        title={t('assetBalance.title')}
                      >
                        {totalBalanceText}
                      </button>
                    </div>
                    <FolderTabs
                      variant="sidebar"
                      folders={folders} activeFolder={activeFolder} wallets={wallets}
                      editingFolder={editingFolder} editFolderName={editFolderName}
                      pinnedFolders={pinnedFolders}
                      defaultFolder={defaultFolder}
                      creatingFolder={creatingFolder} newFolderName={newFolderName}
                      onSelectFolder={(f) => { setActiveFolder(f); }}
                      onStartEdit={(f) => { setEditingFolder(f); setEditFolderName(f); }}
                      onEditChange={setEditFolderName}
                      onFinishEdit={(oldName, newName) => { handleRenameFolder(oldName, newName); setEditingFolder(null); }}
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
                        onStartEdit={(f) => { setEditingFolder(f); setEditFolderName(f); }}
                        onEditChange={setEditFolderName}
                        onFinishEdit={(oldName, newName) => { handleRenameFolder(oldName, newName); setEditingFolder(null); }}
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
                    <button
                      type="button"
                      onClick={() => { hapticTap(); setShowAssetBalance(true); }}
                      className="w-auto max-w-[38vw] self-center flex-shrink-0 rounded-xl border border-brand-500/30 bg-surface-900 px-2.5 py-1.5 text-right shadow-sm hover:bg-surface-800"
                    >
                      <span className="block text-[8px] font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">{t('home.totalAssets')}</span>
                      <span className="block truncate text-xs font-extrabold leading-none text-brand-700 dark:text-brand-200">{totalBalanceText}</span>
                    </button>
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
            backupImportMode={backupImportMode}
            updateMissingSensitive={updateMissingSensitive}
            importPassword={importPassword}
            brandReminders={brandReminders}
            t={t}
            onPasswordChange={setImportPassword}
            onCancel={dismissPasswordPrompt}
            onPreview={previewBackupWithPassword}
            onImport={handleImportWithPassword}
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

        {showBackupExport && (
          <BackupExportModal
            fileName={backupFileName}
            password={backupPassword}
            passwordConfirm={backupPasswordConfirm}
            exporting={backupExporting}
            brandReminders={brandReminders}
            t={t}
            onFileNameChange={setBackupFileName}
            onPasswordChange={setBackupPassword}
            onPasswordConfirmChange={setBackupPasswordConfirm}
            onClose={closeBackupExport}
            onExport={handleExportBackup}
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
