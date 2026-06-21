import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import {
  UploadCloud, ShieldAlert, BarChart3, Settings, Plus, Heart, FolderPlus
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
import PasswordInput from './components/PasswordInput';
import AnimatedSplash from './components/AnimatedSplash';

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
import { formatAssetValue } from './utils/amountFormat';
import useAutoLock from './hooks/useAutoLock';
import useAutoBackup from './hooks/useAutoBackup';
import useWallets from './hooks/useWallets';
import useFileImport from './hooks/useFileImport';
import useBackButton from './hooks/useBackButton';
import useShakeToLock from './hooks/useShakeToLock';
import useBatchSelect from './hooks/useBatchSelect';
import useLiteMode from './hooks/useLiteMode';
import useAppVersion from './hooks/useAppVersion';
import { useT } from './contexts/LanguageContext';
import { useToast } from './contexts/ToastContext';
import { useConfirm } from './contexts/ConfirmContext';
import { runRuntimeIntegrityChecks } from './utils/runtimeIntegrity';
import { getDeviceIntegrityRisk, isDeviceIntegrityGuardEnabled } from './utils/deviceIntegrity';
import { appendAuditLog } from './utils/auditLog';
import { addXKeyFileOpenListener, getPendingXKeyFile } from './utils/nativeFileOpen';
import { secureCopy } from './utils/clipboard';

const ASSET_UNIT_KEY = 'xkey_asset_unit';

export default function App() {
  // Auth state
  const [aesKey, setAesKey] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isDecoyMode, setIsDecoyMode] = useState(false);

  // Navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Modals
  const [qrModalData, setQrModalData] = useState({ isOpen: false, data: '', title: '', subtitle: '' });
  const [showExportCSV, setShowExportCSV] = useState(false);
  const [exportWalletsOverride, setExportWalletsOverride] = useState(null);
  const [showBackupExport, setShowBackupExport] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [backupExporting, setBackupExporting] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showBulkNetworkModal, setShowBulkNetworkModal] = useState(false);
  const [movingWallet, setMovingWallet] = useState(null);
  const [showDonate, setShowDonate] = useState(false);
  const [showAssetBalance, setShowAssetBalance] = useState(false);
  const [assetUnit, setAssetUnit] = useState('$');
  const homeHeaderRef = useRef(null);

  // Performance hooks
  useLiteMode();

  useEffect(() => {
    initFeedbackSettings();
  }, []);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [needsPinAuth, setNeedsPinAuth] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [integrityReady, setIntegrityReady] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState('');
  const [integrityFailed, setIntegrityFailed] = useState(false);
  const [externalBackupWaiting, setExternalBackupWaiting] = useState(false);
  const integrityStartedRef = useRef(false);
  const useDeviceCredentialUnlock = Capacitor.isNativePlatform();

  // Folder editing
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const t = useT();
  const { showToast } = useToast() || {};
  const showConfirm = useConfirm();
  const appVersion = useAppVersion();

  useEffect(() => {
    if (integrityStartedRef.current) return undefined;
    integrityStartedRef.current = true;

    let cancelled = false;
    const statusByStep = {
      crypto: t('integrity.cryptoChecking'),
      app: t('integrity.appChecking'),
      done: t('integrity.ready'),
    };

    runRuntimeIntegrityChecks((step) => {
      if (!cancelled) setIntegrityStatus(statusByStep[step] || '');
    })
      .then(() => {
        if (!cancelled) setIntegrityReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setIntegrityStatus('');
        setIntegrityFailed(true);
        setAuthError(error?.message || t('integrity.failureBody'));
        setVaultLoading(false);
        setShowSplash(false);
        setIntegrityReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (splashAnimationDone && integrityReady) setShowSplash(false);
  }, [splashAnimationDone, integrityReady]);

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
  const totalBalanceText = formatAssetValue(totalBalance, assetUnit);

  useEffect(() => {
    Preferences.get({ key: ASSET_UNIT_KEY }).then(({ value }) => {
      if (value) setAssetUnit(value);
    }).catch(() => {});
  }, []);

  const updateAssetUnit = useCallback((unit) => {
    const nextUnit = unit || '$';
    setAssetUnit(nextUnit);
    Preferences.set({ key: ASSET_UNIT_KEY, value: nextUnit }).catch(() => {});
  }, []);

  const handleSaveAssetBalances = useCallback(async (changes, options = {}) => {
    const changeMap = new Map(changes.map(change => [change.wallet, change.balance]));
    const idMap = new Map(changes.filter(change => change.wallet._id).map(change => [change.wallet._id, change.balance]));
    const updated = wallets.map(wallet => {
      if (idMap.has(wallet._id)) return { ...wallet, balance: idMap.get(wallet._id) };
      if (changeMap.has(wallet)) return { ...wallet, balance: changeMap.get(wallet) };
      return wallet;
    });
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    if (!options.silent) {
      hapticSuccess();
      showToast?.(t('assetBalance.saved'), 'success');
      setShowAssetBalance(false);
    }
  }, [wallets, setWallets, aesKey, isDecoyMode, showToast, t]);

  const handleCreateWalletSave = useCallback(async (walletData) => {
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

  const startCreateFolder = useCallback(() => {
    setEditingFolder(null);
    setNewFolderName('');
    setCreatingFolder(true);
  }, []);

  const finishCreateFolder = useCallback(async (name) => {
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

  useEffect(() => {
    const header = homeHeaderRef.current;
    if (!header || location.pathname !== '/') return undefined;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--home-header-height', `${header.offsetHeight}px`);
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(header);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [location.pathname]);

  const {
    loading,
    showPasswordPrompt, backupPreview, importPassword, setImportPassword,
    handleFileUpload, handleExternalBackupFile, handleImportWithPassword, dismissPasswordPrompt,
  } = useFileImport(wallets, setWallets, aesKey, isDecoyMode);

  useEffect(() => {
    if (!aesKey || !Capacitor.isNativePlatform()) return undefined;
    let cancelled = false;
    let listener;

    const consumePendingFile = async () => {
      try {
        const file = await getPendingXKeyFile();
        if (!cancelled && file?.available) {
          setExternalBackupWaiting(true);
          await handleExternalBackupFile(file);
        }
      } catch (err) {
        console.warn('Unable to consume pending .xkey file intent.', err);
      } finally {
        if (!cancelled) setExternalBackupWaiting(false);
      }
    };

    consumePendingFile();
    addXKeyFileOpenListener(() => {
      consumePendingFile();
    }).then((handle) => {
      listener = handle;
    }).catch(() => {});

    return () => {
      cancelled = true;
      listener?.remove?.();
    };
  }, [aesKey, handleExternalBackupFile]);

  const {
    selectionMode, toggleSelectionMode,
    selectedCount, toggleSelect, selectAll, deselectAll, isSelected,
    bulkDelete, bulkMove, bulkTag, bulkPin,
  } = useBatchSelect(wallets, setWallets, filteredWallets, aesKey, isDecoyMode);

  const closeQrModal = useCallback(() => {
    setQrModalData(prev => ({ ...prev, isOpen: false }));
  }, []);

  useBackButton({
    showPasswordPrompt, setShowPasswordPrompt: dismissPasswordPrompt,
    showDuplicates, setShowDuplicates,
    showCreateWallet, setShowCreateWallet,
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

  // Global Keyboard & Focus Handler
  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const scrollContainer = target.closest('.overflow-y-auto') || target.closest('.overflow-auto') || document.getElementById('root') || document.body;
        scrollContainer.style.setProperty('padding-bottom', '60vh', 'important');
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleFocusOut = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const scrollContainer = target.closest('.overflow-y-auto') || target.closest('.overflow-auto') || document.getElementById('root') || document.body;
        scrollContainer.style.removeProperty('padding-bottom');
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // On Unlock, load data
  useEffect(() => {
    if (showSplash) return;

    const authenticate = async () => {
      try {
        if (useDeviceCredentialUnlock && await isDeviceIntegrityGuardEnabled()) {
          const riskInfo = await getDeviceIntegrityRisk();
          if (riskInfo?.risky) {
            await appendAuditLog('device_integrity.blocked', { reasons: riskInfo.reasons || [] }).catch(() => {});
            setAuthError(t('integrity.deviceRiskBlocked'));
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
        setAuthError(err.message || "Failed to authenticate.");
      }
      setVaultLoading(false);
    };
    authenticate();
  }, [showSplash, setWallets, t, useDeviceCredentialUnlock]);

  // Called after PIN verification succeeds
  const handlePinSuccess = async (isDecoy = false, options = {}) => {
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
      setAuthError(err.message || "Failed to load vault.");
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
  };

  const createVerificationReport = useCallback(() => {
    if (!backupPreview) return '';
    const metadata = backupPreview.metadata || {};
    return [
      'xKey backup verification report',
      `File: ${backupPreview.fileName || ''}`,
      `Opened from external app: ${backupPreview.openedFromExternal ? 'yes' : 'no'}`,
      `Format: ${backupPreview.format || 'unknown'}`,
      `Backup ID: ${backupPreview.backupId || metadata.backupId || ''}`,
      `File hash: ${backupPreview.containerHash || metadata.containerHash || ''}`,
      `Integrity: ${backupPreview.integrity || 'unknown'}`,
      `Status: ${backupPreview.status || 'unknown'}`,
      `Created: ${metadata.createdAt || ''}`,
      `Platform: ${metadata.platform || ''}`,
      `Wallets: ${metadata.walletCount ?? ''}`,
      `Folders: ${metadata.folderCount ?? ''}`,
      `Networks: ${metadata.networkCount ?? ''}`,
      `Source: ${metadata.source || ''}`,
      `Recovered: ${backupPreview.recovered ? 'yes' : 'no'}`,
      `Recovered bytes: ${backupPreview.recoveredBytes || 0}`,
      `Recovered shards: ${(backupPreview.recoveredShards || []).join(', ')}`,
      `Footer recovered: ${backupPreview.footerRecovered ? 'yes' : 'no'}`,
    ].join('\n');
  }, [backupPreview]);

  const handleCopyVerificationReport = useCallback(async () => {
    const copied = await secureCopy(createVerificationReport(), 120000);
    showToast?.(copied ? t('restore.reportCopied') : t('common.error'), copied ? 'success' : 'error');
    appendAuditLog('backup.verification_report_copied', {
      fileName: backupPreview?.fileName || '',
      integrity: backupPreview?.integrity || 'unknown',
      backupId: backupPreview?.backupId || backupPreview?.metadata?.backupId || '',
    }).catch(() => {});
  }, [backupPreview, createVerificationReport, showToast, t]);

  const handleVerifyBackupOnly = useCallback(() => {
    appendAuditLog('backup.verify_only', {
      fileName: backupPreview?.fileName || '',
      openedFromExternal: !!backupPreview?.openedFromExternal,
      integrity: backupPreview?.integrity || 'unknown',
      backupId: backupPreview?.backupId || backupPreview?.metadata?.backupId || '',
      walletCount: backupPreview?.metadata?.walletCount,
    }).catch(() => {});
    dismissPasswordPrompt();
  }, [backupPreview, dismissPasswordPrompt]);

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
      const success = await exportPortableBackup(currentWallets || [], null, backupPassword);
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

  const openExportCSV = async (walletsOverride = null) => {
    const { value } = await Preferences.get({ key: SENSITIVE_EXPORT_LOCK_KEY });
    if (value === 'true') {
      const ok = await showConfirm(t('advancedTools.csvLockConfirm'), { danger: true });
      if (!ok) return;
    }
    hapticTap();
    setExportWalletsOverride(walletsOverride);
    setShowExportCSV(true);
  };

  const openExportFolder = (folderName) => {
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

        {/* Header */}
        <header ref={homeHeaderRef} className="sticky top-0 z-30 bg-surface-900/95 backdrop-blur-md border-b border-surface-800 px-4 py-4 shadow-xl">
          <div className="max-w-7xl mx-auto">
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="xKey" className="w-9 h-9 rounded-lg logo-animated" />
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400 pr-1">
                {t('home.title')}
              </h1>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="whitespace-nowrap rounded-full border border-brand-500/25 bg-brand-500/10 px-[0.625rem] py-[0.25rem] text-[0.625rem] font-semibold leading-none text-brand-200 shadow-sm shadow-brand-500/10 sm:px-[0.75rem] sm:text-[0.6875rem]">
                {appVersion.version}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { hapticTap(); setShowDonate(true); }} className="p-2 bg-gradient-to-br from-fuchsia-500/20 to-brand-500/20 hover:from-fuchsia-500/30 hover:to-brand-500/30 border border-fuchsia-500/30 rounded-full transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(217,70,239,0.4)] animate-pulse" title="Donate">
                <Heart size={20} className="text-fuchsia-400 fill-fuchsia-400/50 group-hover:fill-fuchsia-400 group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
              </button>
              <button onClick={() => { hapticTap(); navigate('/settings'); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title="Settings">
                <Settings size={20} />
              </button>
            </div>
          </div>
          </div>
        </header>

        <main className="p-4 max-w-7xl mx-auto pb-20">
          {externalBackupWaiting && (
            <div className="mb-3 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-100">
              {t('restore.externalWaiting')}
            </div>
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
                <div className="sticky top-[var(--home-header-height)] z-20 -mx-4 px-4 pt-3 pb-2 bg-surface-950/95 backdrop-blur-md border-b border-surface-900/80">
                  <div className="lg:hidden flex items-center gap-3">
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
                      className="mb-4 flex-shrink-0 rounded-full border border-surface-800 bg-surface-900 px-3 py-2 text-right hover:bg-surface-800"
                    >
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-surface-500">{t('home.totalAssets')}</span>
                      <span className="block text-sm font-bold leading-none text-white">{totalBalanceText}</span>
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
            onSave={handleCreateWalletSave}
            onShowQR={(data, title, subtitle) => setQrModalData({ isOpen: true, data, title, subtitle })}
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-900 border border-surface-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                backupPreview?.status === 'tampered' ? 'bg-red-500/10' : backupPreview?.integrity === 'repaired' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
              }`}>
                <ShieldAlert size={22} className={
                  backupPreview?.status === 'tampered' ? 'text-red-400' : backupPreview?.integrity === 'repaired' ? 'text-amber-400' : 'text-emerald-400'
                } />
              </div>
              <h3 className="text-white font-bold text-center mb-1">{t('restore.title')}</h3>
              <p className="text-surface-400 text-sm text-center mb-4">{t('restore.desc')}</p>
              {backupPreview && (
                <div className={`mb-4 rounded-xl border p-3 text-xs ${
                  backupPreview.status === 'tampered'
                    ? 'border-red-500/30 bg-red-500/10 text-red-200'
                    : backupPreview.integrity === 'repaired'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                }`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-semibold">{backupPreview.fileName || t('restore.backupFile')}</span>
                    <span className="rounded-full bg-black/20 px-2 py-0.5 font-semibold uppercase">{backupPreview.integrity}</span>
                  </div>
                  {backupPreview.openedFromExternal && (
                    <div className="mb-2 rounded-lg border border-sky-400/25 bg-sky-400/10 px-2.5 py-2 text-sky-100">
                      <div className="text-[11px] font-bold uppercase">{t('restore.openedExternal')}</div>
                      <div className="mt-0.5 leading-relaxed">{t('restore.openedExternalWarning')}</div>
                    </div>
                  )}
                  {backupPreview.metadata ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-surface-200">
                      <span>{t('restore.createdAt')}</span><span className="text-right">{new Date(backupPreview.metadata.createdAt).toLocaleString()}</span>
                      <span>{t('restore.createdOn')}</span><span className="text-right">{backupPreview.metadata.platform}</span>
                      <span>{t('restore.walletCount')}</span><span className="text-right">{backupPreview.metadata.walletCount}</span>
                      <span>{t('restore.folderCount')}</span><span className="text-right">{backupPreview.metadata.folderCount}</span>
                      <span>{t('restore.networkCount')}</span><span className="text-right">{backupPreview.metadata.networkCount}</span>
                      <span>{t('restore.source')}</span><span className="text-right truncate">{backupPreview.metadata.source}</span>
                      <span>{t('restore.backupId')}</span><span className="text-right font-mono">{(backupPreview.backupId || backupPreview.metadata.backupId || '').slice(0, 20)}</span>
                      <span>{t('restore.containerHash')}</span><span className="text-right font-mono">{(backupPreview.containerHash || backupPreview.metadata.containerHash || '').slice(0, 16)}...</span>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{backupPreview.message}</p>
                  )}
                  {backupPreview.footerRecovered && (
                    <p className="mt-2 font-semibold">{t('restore.footerRecovered')}</p>
                  )}
                  {backupPreview.recovered && (
                    <p className="mt-2 font-semibold">{t('restore.recoveredBytes', { count: backupPreview.recoveredBytes })}</p>
                  )}
                  {backupPreview.status === 'tampered' && (
                    <p className="mt-2 font-semibold">{t('restore.modifiedWarning')}</p>
                  )}
                </div>
              )}
              <PasswordInput
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImportWithPassword()}
                placeholder={t('restore.placeholder')}
                disabled={backupPreview?.status === 'tampered'}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white mb-4 focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
              />
              <div className="flex gap-3">
                <button onClick={() => { hapticTap(); dismissPasswordPrompt(); }}
                  className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 py-2.5 rounded-lg font-medium transition-colors">{t('common.cancel')}</button>
                {backupPreview?.openedFromExternal && (
                  <button onClick={() => { hapticTap(); handleVerifyBackupOnly(); }}
                    className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-sky-200 py-2.5 rounded-lg font-medium transition-colors">{t('restore.verifyOnly')}</button>
                )}
                {backupPreview?.openedFromExternal && (
                  <button onClick={() => { hapticTap(); handleCopyVerificationReport(); }}
                    className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-surface-200 py-2.5 rounded-lg font-medium transition-colors">{t('restore.copyVerificationReport')}</button>
                )}
                <button onClick={() => { hapticSuccess(); handleImportWithPassword(); }}
                  disabled={backupPreview?.status === 'tampered'}
                  className="btn-glow btn-glow-success flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">{t('restore.button')}</button>
              </div>
            </div>
          </div>
        )}

        {showBackupExport && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <UploadCloud size={22} className="text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-center mb-1">{t('actionBar.exportBackup')}</h3>
              <p className="text-surface-400 text-sm text-center mb-5">{t('settings.backupSubtitle')}</p>
              <div className="space-y-3">
                <PasswordInput
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  placeholder={t('settings.backupPassword')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
                />
                <PasswordInput
                  value={backupPasswordConfirm}
                  onChange={(e) => setBackupPasswordConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExportBackup()}
                  placeholder={t('settings.confirmPassword')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
                />
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-2.5 flex gap-2">
                  <ShieldAlert size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-yellow-300/80 leading-relaxed">{t('settings.passwordWarning')}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => { hapticTap(); closeBackupExport(); }}
                  className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 py-2.5 rounded-lg font-medium transition-colors">{t('common.cancel')}</button>
                <button onClick={() => { hapticTap(); handleExportBackup(); }} disabled={backupExporting}
                  className="btn-glow btn-glow-success flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {backupExporting ? t('settings.exporting') : t('settings.exportBackup')}
                </button>
              </div>
            </div>
          </div>
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
      {showSplash && <AnimatedSplash onFinish={() => setSplashAnimationDone(true)} status={integrityStatus} />}
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
