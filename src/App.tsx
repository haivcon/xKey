import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import {
  UploadCloud, ShieldAlert, BarChart3, Settings, Plus, Heart, FolderPlus, Copy, Bell
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
import BrandSlogan from './components/BrandSlogan';

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
import { useTheme } from './contexts/ThemeContext';
import { runRuntimeIntegrityChecks } from './utils/runtimeIntegrity';
import { getDeviceIntegrityRisk, isDeviceIntegrityGuardEnabled } from './utils/deviceIntegrity';
import { appendAuditLog } from './utils/auditLog';
import { addXKeyFileOpenListener, getPendingXKeyFile } from './utils/nativeFileOpen';
import { secureCopy } from './utils/clipboard';
import { XKEY_SLOGAN } from './utils/branding';
import { cleanupInternalTextFiles } from './utils/internalTextStore';
import { withTimeout } from './utils/asyncTimeout';
import { runWalletProofCheck, selectProofWallets, shouldShowProofOfKeysReminder, summarizeKeyHealth, type ProofCheckReport, type ProofScope } from './utils/keyHealth';
import type { QrModalData, Wallet } from './types';

const ASSET_UNIT_KEY = 'xkey_asset_unit';
const REPLACE_SNAPSHOT_KEY = 'xkey_replace_snapshot_v1';
const INTERNAL_TEXT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const HEADER_SLOGAN_LETTERS = Array.from(XKEY_SLOGAN);
const STARTUP_WATCHDOG_MS = 18000;
const EXTERNAL_BACKUP_TIMEOUT_MS = 10000;
const EXTERNAL_BACKUP_DEDUPE_MS = 3000;

type AssetBalanceChange = {
  wallet: Wallet;
  balance: string;
};

type AssetBalanceOptions = {
  silent?: boolean;
};

type PinSuccessOptions = {
  createdPin?: boolean;
};

type WalletSaveInput = Wallet | Wallet[];

const asText = (value: unknown): string => (
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''
);

const asNumber = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0
);

const asStringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.map(item => String(item)) : []
);

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
  const [assetUnit, setAssetUnit] = useState('$');
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
  const [showSplash, setShowSplash] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  const [integrityReady, setIntegrityReady] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState('');
  const [integrityFailed, setIntegrityFailed] = useState(false);
  const [externalBackupWaiting, setExternalBackupWaiting] = useState(false);
  const [healthMessages, setHealthMessages] = useState<string[]>([]);
  // A shared promise survives React Strict Mode's development-only effect replay.
  // Without it, the first replayed effect is cancelled while the second one is
  // prevented from subscribing, leaving the splash screen visible forever.
  const integrityCheckRef = useRef<Promise<void> | null>(null);
  const lastExternalBackupRef = useRef<{ fingerprint: string; ts: number } | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    const statusByStep = {
      crypto: t('integrity.cryptoChecking'),
      app: t('integrity.appChecking'),
      done: t('integrity.ready'),
    };

    if (!integrityCheckRef.current) {
      integrityCheckRef.current = runRuntimeIntegrityChecks((step) => {
        setIntegrityStatus(statusByStep[step] || '');
      });
    }

    integrityCheckRef.current
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

  useEffect(() => {
    if (!showSplash || integrityReady || integrityFailed) return undefined;
    const timer = window.setTimeout(() => {
      setIntegrityStatus('');
      setIntegrityFailed(true);
      setAuthError(tRef.current('integrity.failureBody'));
      setVaultLoading(false);
      setShowSplash(false);
    }, STARTUP_WATCHDOG_MS);
    return () => window.clearTimeout(timer);
  }, [integrityFailed, integrityReady, showSplash]);

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
  const keyHealthSummary = useMemo(() => summarizeKeyHealth(wallets), [wallets]);
  const showProofOfKeysReminder = shouldShowProofOfKeysReminder();
  const keyHealthAttentionCount = keyHealthSummary.attentionCount + (showProofOfKeysReminder ? 1 : 0);

  useEffect(() => {
    Preferences.get({ key: ASSET_UNIT_KEY }).then(({ value }) => {
      if (value) setAssetUnit(value);
    }).catch(() => {});
  }, []);

  const updateAssetUnit = useCallback((unit: string) => {
    const nextUnit = unit || '$';
    setAssetUnit(nextUnit);
    Preferences.set({ key: ASSET_UNIT_KEY, value: nextUnit }).catch(() => {});
  }, []);

  const handleSaveAssetBalances = useCallback(async (changes: AssetBalanceChange[], options: AssetBalanceOptions = {}) => {
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
    loading, fileOperationKey,
    showPasswordPrompt, backupPreview, backupAnalysis, backupImportMode, setBackupImportMode, updateMissingSensitive, setUpdateMissingSensitive, importPassword, setImportPassword,
    handleFileUpload, handleExternalBackupFile, handleImportWithPassword, previewBackupWithPassword, dismissPasswordPrompt,
  } = useFileImport(wallets, setWallets, aesKey, isDecoyMode);

  useEffect(() => {
    if (!aesKey || !Capacitor.isNativePlatform()) return undefined;
    let cancelled = false;
    let listener: PluginListenerHandle | undefined;

    const consumePendingFile = async () => {
      try {
        const file = await withTimeout(
          getPendingXKeyFile(),
          EXTERNAL_BACKUP_TIMEOUT_MS,
          () => new Error('External file open timed out'),
        );
        if (!cancelled && file?.available) {
          const fingerprint = `${file.name || ''}|${file.size || 0}|${(file.base64 || '').slice(0, 64)}`;
          const latest = lastExternalBackupRef.current;
          if (latest?.fingerprint === fingerprint && Date.now() - latest.ts < EXTERNAL_BACKUP_DEDUPE_MS) return;
          lastExternalBackupRef.current = { fingerprint, ts: Date.now() };
          setExternalBackupWaiting(true);
          await withTimeout(
            handleExternalBackupFile(file),
            EXTERNAL_BACKUP_TIMEOUT_MS,
            () => new Error('External backup preview timed out'),
          );
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

  // Global Keyboard & Focus Handler
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const scrollContainer = (target.closest('.overflow-y-auto') || target.closest('.overflow-auto') || document.getElementById('root') || document.body) as HTMLElement;
        scrollContainer.style.setProperty('padding-bottom', '60vh', 'important');
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const scrollContainer = (target.closest('.overflow-y-auto') || target.closest('.overflow-auto') || document.getElementById('root') || document.body) as HTMLElement;
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

  const createVerificationReport = useCallback(() => {
    if (!backupPreview) return '';
    const metadata = backupPreview.metadata || {};
    const yesNo = (value: boolean) => value ? t('common.yes') : t('common.no');
    const statusLabel = backupPreview.status ? t(`restore.status_${backupPreview.status}`) : t('restore.integrity_unknown');
    return [
      t('restore.reportTitle'),
      `${t('restore.backupFile')}: ${backupPreview.fileName || ''}`,
      `${t('restore.openedExternal')}: ${yesNo(!!backupPreview.openedFromExternal)}`,
      `${t('restore.reportFormat')}: ${backupPreview.format || t('restore.integrity_unknown')}`,
      `${t('restore.backupId')}: ${backupPreview.backupId || asText(metadata.backupId) || ''}`,
      `${t('restore.containerHash')}: ${backupPreview.containerHash || asText(metadata.containerHash) || ''}`,
      `${t('audit.integrity')}: ${t(`restore.integrity_${backupPreview.integrity || 'unknown'}`)}`,
      `${t('restore.reportStatus')}: ${statusLabel}`,
      `${t('restore.createdAt')}: ${asText(metadata.createdAt)}`,
      `${t('restore.createdOn')}: ${asText(metadata.platform)}`,
      `${t('restore.walletCount')}: ${asText(metadata.walletCount)}`,
      `${t('restore.folderCount')}: ${asText(metadata.folderCount)}`,
      `${t('restore.networkCount')}: ${asText(metadata.networkCount)}`,
      `${t('restore.source')}: ${asText(metadata.source)}`,
      `${t('restore.reportRecovered')}: ${yesNo(!!backupPreview.recovered)}`,
      t('restore.recoveredBytes', { count: asNumber(backupPreview.recoveredBytes) }),
      `${t('restore.reportRecoveredShards')}: ${asStringArray(backupPreview.recoveredShards).join(', ')}`,
      `${t('restore.footerRecovered')}: ${yesNo(!!backupPreview.footerRecovered)}`,
    ].join('\n');
  }, [backupPreview, t]);

  const handleCopyVerificationReport = useCallback(async () => {
    const copied = await secureCopy(createVerificationReport(), 120000);
    showToast?.({ key: copied ? 'restore.reportCopied' : 'common.error', category: copied ? 'copy' : 'warning' }, copied ? 'success' : 'error');
    appendAuditLog('backup.verification_report_copied', {
      fileName: backupPreview?.fileName || '',
      integrity: backupPreview?.integrity || 'unknown',
      backupId: backupPreview?.backupId || backupPreview?.metadata?.backupId || '',
    }).catch(() => {});
  }, [backupPreview, createVerificationReport, showToast]);

  const handleCopyBackupPreviewValue = useCallback(async (label: string, value: string) => {
    if (!value) return;
    const copied = await secureCopy(value, 120000);
    showToast?.({ key: copied ? 'common.copied' : 'common.error', category: copied ? 'copy' : 'warning' }, copied ? 'success' : 'error');
    appendAuditLog('backup.metadata_copied', {
      fileName: backupPreview?.fileName || '',
      field: label,
      integrity: backupPreview?.integrity || 'unknown',
    }).catch(() => {});
  }, [backupPreview, showToast]);

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

        {/* Header */}
        <header ref={homeHeaderRef} className="sticky top-0 z-30 bg-surface-900/95 backdrop-blur-md border-b border-surface-800 px-4 py-4 shadow-xl">
          <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <img src="/logo.png" alt="xKey" className="w-9 h-9 rounded-lg logo-animated" />
              <div className="flex min-w-0 items-baseline gap-1">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400 leading-tight">
                  xKey
                </h1>
                <span className="shrink-0 text-[5px] font-semibold leading-none text-surface-400">
                  {appVersion.version}
                </span>
              </div>
            </div>
            <div className="pointer-events-none min-w-0 justify-self-center text-center" aria-label={XKEY_SLOGAN}>
              {brandReminders && (
                <div className="home-header-slogan whitespace-nowrap text-center">
                  {HEADER_SLOGAN_LETTERS.map((letter, index) => (
                    <span
                      key={`${letter}-${index}`}
                      className={letter === ' ' ? 'home-header-slogan-space' : 'home-header-slogan-letter'}
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      {letter === ' ' ? '\u00A0' : letter}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-self-end gap-1">
              <button
                onClick={() => { hapticTap(); setShowKeyHealth(true); }}
                className="btn-icon-glow relative rounded-full bg-surface-800 p-2 text-surface-400 transition-colors hover:bg-surface-700 hover:text-white"
                title={t('keyHealth.title')}
                aria-label={t('keyHealth.title')}
              >
                <Bell size={20} />
                {keyHealthAttentionCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-surface-900 bg-red-500 px-1 text-[9px] font-black leading-none text-white">
                    {Math.min(9, keyHealthAttentionCount)}
                  </span>
                )}
              </button>
              <button onClick={() => { hapticTap(); setShowDonate(true); }} className="p-2 bg-gradient-to-br from-fuchsia-500/20 to-brand-500/20 hover:from-fuchsia-500/30 hover:to-brand-500/30 border border-fuchsia-500/30 rounded-full transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(217,70,239,0.4)] animate-pulse" title={t('donate.button')} aria-label={t('donate.button')}>
                <Heart size={20} className="text-fuchsia-400 fill-fuchsia-400/50 group-hover:fill-fuchsia-400 group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
              </button>
              <button onClick={() => { hapticTap(); navigate('/settings'); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title={t('settings.title')} aria-label={t('settings.title')}>
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
                <div className="sticky top-[var(--home-header-height)] z-20 -mx-4 px-4 pt-3 pb-2 bg-white/95 text-surface-950 backdrop-blur-md border-b border-surface-200/80 dark:bg-surface-950/95 dark:text-white dark:border-surface-900/80">
                  <div className="lg:hidden grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:items-center">
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
                      className="w-auto max-w-[38vw] self-center flex-shrink-0 rounded-xl border border-surface-200 bg-white px-2.5 py-1.5 text-right shadow-sm hover:bg-surface-50 dark:border-surface-800 dark:bg-surface-900 dark:hover:bg-surface-800"
                    >
                      <span className="block text-[8px] font-semibold uppercase tracking-wider text-surface-600 dark:text-surface-500">{t('home.totalAssets')}</span>
                      <span className="block truncate text-xs font-bold leading-none text-surface-950 dark:text-white">{totalBalanceText}</span>
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="restore-backup-title"
              onClick={(event) => event.stopPropagation()}
              className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-3 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:w-full sm:p-6"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                backupPreview?.status === 'tampered' ? 'bg-red-500/10' : backupPreview?.integrity === 'repaired' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
              }`}>
                <ShieldAlert size={22} className={
                  backupPreview?.status === 'tampered' ? 'text-red-400' : backupPreview?.integrity === 'repaired' ? 'text-amber-400' : 'text-emerald-400'
                } />
              </div>
              <h3 id="restore-backup-title" className="text-white font-bold text-center mb-1">{t('restore.title')}</h3>
              <p className="text-surface-400 text-sm text-center mb-4">{t('restore.desc')}</p>
              {brandReminders && <BrandSlogan note={t('brand.restoreNote')} tone="brand" className="mb-4 text-center" />}
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
                    <span className="rounded-full bg-black/20 px-2 py-0.5 font-semibold uppercase">{t(`restore.integrity_${asText(backupPreview.integrity)}`)}</span>
                  </div>
                  {backupPreview.openedFromExternal && (
                    <div className="mb-2 rounded-lg border border-sky-400/25 bg-sky-400/10 px-2.5 py-2 text-sky-100">
                      <div className="text-[11px] font-bold uppercase">{t('restore.openedExternal')}</div>
                      <div className="mt-0.5 leading-relaxed">{t('restore.openedExternalWarning')}</div>
                    </div>
                  )}
                  {backupPreview.metadata ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-surface-200">
                      <span>{t('restore.createdAt')}</span><span className="text-right">{asText(backupPreview.metadata.createdAt) ? new Date(asText(backupPreview.metadata.createdAt)).toLocaleString() : ''}</span>
                      <span>{t('restore.createdOn')}</span><span className="text-right">{asText(backupPreview.metadata.platform)}</span>
                      <span>{t('restore.walletCount')}</span><span className="text-right">{asText(backupPreview.metadata.walletCount)}</span>
                      <span>{t('restore.folderCount')}</span><span className="text-right">{asText(backupPreview.metadata.folderCount)}</span>
                      <span>{t('restore.networkCount')}</span><span className="text-right">{asText(backupPreview.metadata.networkCount)}</span>
                      <span>{t('restore.source')}</span><span className="text-right truncate">{asText(backupPreview.metadata.source)}</span>
                      {(() => {
                        const backupId = asText(backupPreview.backupId) || asText(backupPreview.metadata.backupId);
                        const fileHash = asText(backupPreview.containerHash) || asText(backupPreview.metadata.containerHash);
                        return (
                          <>
                            <div className="col-span-2 mt-1 rounded-lg border border-emerald-500/15 bg-black/10 p-2">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="font-semibold">{t('restore.backupId')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyBackupPreviewValue('backupId', backupId)}
                                  className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-[11px] font-semibold hover:bg-black/30"
                                >
                                  <Copy size={12} />{t('common.copy')}
                                </button>
                              </div>
                              <code className="block break-all font-mono text-[11px] leading-relaxed text-emerald-50">{backupId || '-'}</code>
                            </div>
                            <div className="col-span-2 rounded-lg border border-emerald-500/15 bg-black/10 p-2">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="font-semibold">{t('restore.containerHash')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyBackupPreviewValue('containerHash', fileHash)}
                                  className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-[11px] font-semibold hover:bg-black/30"
                                >
                                  <Copy size={12} />{t('common.copy')}
                                </button>
                              </div>
                              <code className="block break-all font-mono text-[11px] leading-relaxed text-emerald-50">{fileHash || '-'}</code>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="leading-relaxed">{backupPreview.messageKey ? t(asText(backupPreview.messageKey)) : asText(backupPreview.message)}</p>
                  )}
                  {Boolean(backupPreview.footerRecovered) && (
                    <p className="mt-2 font-semibold">{t('restore.footerRecovered')}</p>
                  )}
                  {Boolean(backupPreview.recovered) && (
                    <p className="mt-2 font-semibold">{t('restore.recoveredBytes', { count: asNumber(backupPreview.recoveredBytes) })}</p>
                  )}
                  {backupPreview.status === 'tampered' && (
                    <p className="mt-2 font-semibold">{t('restore.modifiedWarning')}</p>
                  )}
                </div>
              )}
              <PasswordInput
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== 'Enter') return;
                  if (backupImportMode === 'replace' && !backupAnalysis) {
                    await previewBackupWithPassword();
                    return;
                  }
                  if (backupImportMode === 'replace' && !await showConfirm(t('restore.replaceConfirm'), { danger: true })) return;
                  handleImportWithPassword();
                }}
                placeholder={t('restore.placeholder')}
                disabled={backupPreview?.status === 'tampered'}
                wrapperClassName="mb-4 w-full"
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
              />
              {backupAnalysis && (
                <div className="mb-4 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-surface-200">
                  <p>{t('restore.previewSummary', backupAnalysis)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => setBackupImportMode('merge')} className={`min-h-20 rounded-lg border px-3 py-2 text-left transition-colors ${backupImportMode === 'merge' ? 'border-brand-400 bg-brand-500/15 text-brand-100' : 'border-surface-700 text-surface-300 hover:border-surface-500'}`}>
                      <span className="block font-semibold">{t('restore.merge')}</span>
                      <span className="mt-1 block leading-relaxed text-surface-400">{t('restore.mergeHelp')}</span>
                    </button>
                    <button onClick={() => setBackupImportMode('replace')} className={`min-h-20 rounded-lg border px-3 py-2 text-left transition-colors ${backupImportMode === 'replace' ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-surface-700 text-surface-300 hover:border-surface-500'}`}>
                      <span className="block font-semibold">{t('restore.replace')}</span>
                      <span className="mt-1 block leading-relaxed text-surface-400">{t('restore.replaceHelp')}</span>
                    </button>
                  </div>
                  {backupImportMode === 'merge' && (
                    <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-brand-500/20 bg-surface-900/50 p-2.5 text-xs text-surface-300">
                      <input
                        type="checkbox"
                        checked={updateMissingSensitive}
                        onChange={async (event) => {
                          const enabled = event.target.checked;
                          if (enabled && !await showConfirm(t('restore.updateMissingSensitiveConfirm'))) return;
                          setUpdateMissingSensitive(enabled);
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                      />
                      <span><span className="block font-semibold text-brand-200">{t('restore.updateMissingSensitive')}</span><span className="mt-0.5 block leading-relaxed text-surface-400">{t('restore.updateMissingSensitiveHelp')}</span></span>
                    </label>
                  )}
                </div>
              )}
              {(loading || fileOperationKey) && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-100">
                  <Settings size={14} className={loading ? 'animate-spin' : ''} />
                  {t(fileOperationKey || 'fileStatus.processing')}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => { hapticTap(); dismissPasswordPrompt(); }}
                  className="shrink-0 px-2 py-2.5 font-semibold text-red-300 transition-colors hover:text-red-200 focus:outline-none focus-visible:underline">{t('common.cancel')}</button>
                {backupPreview?.openedFromExternal && (
                  <button onClick={() => { hapticTap(); handleVerifyBackupOnly(); }} disabled={loading}
                    className="btn-glow min-w-28 flex-1 whitespace-normal rounded-lg bg-surface-800 py-2.5 font-medium text-sky-200 transition-colors hover:bg-surface-700 disabled:opacity-50">{t('restore.verifyOnly')}</button>
                )}
                <button onClick={() => { hapticTap(); previewBackupWithPassword(); }} disabled={loading || backupPreview?.status === 'tampered'} className="btn-glow min-w-28 flex-1 whitespace-normal rounded-lg bg-surface-800 py-2.5 font-medium text-brand-300 transition-colors hover:bg-surface-700 disabled:opacity-50">{t('restore.previewOnly')}</button>
                {backupPreview?.openedFromExternal && (
                  <button onClick={() => { hapticTap(); handleCopyVerificationReport(); }} disabled={loading}
                    className="btn-glow min-w-28 flex-1 whitespace-normal rounded-lg bg-surface-800 py-2.5 font-medium text-surface-200 transition-colors hover:bg-surface-700 disabled:opacity-50">{t('restore.copyVerificationReport')}</button>
                )}
                <button onClick={async () => { if (backupImportMode === 'replace' && !await showConfirm(t('restore.replaceConfirm'), { danger: true })) return; hapticSuccess(); handleImportWithPassword(); }}
                  disabled={loading || backupPreview?.status === 'tampered' || (backupImportMode === 'replace' && !backupAnalysis)}
                  className="btn-glow btn-glow-success min-w-28 flex-1 whitespace-normal rounded-lg bg-brand-600 py-2.5 font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50">{t('restore.button')}</button>
              </div>
            </div>
          </div>
        )}

        {showBackupExport && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
            <div className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <UploadCloud size={22} className="text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-center mb-1">{t('actionBar.exportBackup')}</h3>
              <p className="text-surface-400 text-sm text-center mb-5">{t('settings.backupSubtitle')}</p>
              {brandReminders && <BrandSlogan note={t('brand.backupExportNote')} tone="success" className="mb-4 text-center" />}
              <div className="space-y-3">
                <input
                  value={backupFileName}
                  onChange={(e) => setBackupFileName(e.target.value)}
                  placeholder={t('settings.backupFileName')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-surface-600"
                />
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
