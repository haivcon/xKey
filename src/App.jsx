import { useState, useEffect, useMemo } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as CapacitorApp } from '@capacitor/app';
import Papa from 'papaparse';
import {
  UploadCloud, ShieldAlert, BarChart3, Settings, FileDown, Plus, AlertTriangle, Heart
} from 'lucide-react';
import { FilePicker } from '@capawesome/capacitor-file-picker';

// Components
import SettingsScreen from './components/SettingsScreen';
import QRCodeModal from './components/QRCodeModal';
import DashboardView from './components/DashboardView';
import WalletCard from './components/WalletCard';
import AuthErrorScreen from './components/AuthErrorScreen';
import FolderTabs from './components/FolderTabs';
import ActionBar from './components/ActionBar';
import ExportCSVModal from './components/ExportCSVModal';
import CreateWalletModal from './components/CreateWalletModal';
import DuplicateDetector from './components/DuplicateDetector';
import OnboardingScreen, { ONBOARDED_KEY } from './components/OnboardingScreen';
import SkeletonCard from './components/SkeletonCard';
import PinLockScreen from './components/PinLockScreen';
import MoveToFolderModal from './components/MoveToFolderModal';
import DonateModal from './components/DonateModal';
import BulkNetworkModal from './components/BulkNetworkModal';
import PasswordInput from './components/PasswordInput';
import AnimatedSplash from './components/AnimatedSplash';
import { SplashScreen } from '@capacitor/splash-screen';

// Utils & Hooks
import { saveWallets, loadWallets, isBiometricAvailable, getEncryptionKeyBiometric, getEncryptionKeyFallback } from './utils/storage';
import { parseVaultBackupFile } from './utils/backupUtils';
import { hapticTap, hapticSuccess } from './utils/haptics';
import useAutoLock from './hooks/useAutoLock';
import useAutoBackup from './hooks/useAutoBackup';
import { useToast } from './contexts/ToastContext';
import { useConfirm } from './contexts/ConfirmContext';
import { useT } from './contexts/LanguageContext';

export default function App() {
  // Auth state
  const [aesKey, setAesKey] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isDecoyMode, setIsDecoyMode] = useState(false);

  // Navigation
  const [currentView, setCurrentView] = useState('home');

  // Vault state
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDonate, setShowDonate] = useState(false);
  const [activeFolder, setActiveFolder] = useState('All');
  const [sortOrder, setSortOrder] = useState('none');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals
  const [qrModalData, setQrModalData] = useState({ isOpen: false, data: '', title: '', subtitle: '' });
  const [showExportCSV, setShowExportCSV] = useState(false);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showBulkNetworkModal, setShowBulkNetworkModal] = useState(false);
  const [movingWallet, setMovingWallet] = useState(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [needsPinAuth, setNeedsPinAuth] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Folder editing
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');

  // Backup import password prompt
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState(null);
  const [importPassword, setImportPassword] = useState('');
  const [isAppActive, setIsAppActive] = useState(true);

  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();

  // Auto-lock after 5min idle
  useAutoLock(() => {
    setNeedsPinAuth(true);
  }, !!aesKey);

  // Auto-backup on app open
  useAutoBackup(aesKey);

  // Hardware Back Button listener
  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      if (showPasswordPrompt) {
        setShowPasswordPrompt(false);
        return;
      }
      if (showDuplicates) {
        setShowDuplicates(false);
        return;
      }
      if (showCreateWallet) {
        setShowCreateWallet(false);
        return;
      }
      if (showExportCSV) {
        setShowExportCSV(false);
        return;
      }
      if (qrModalData.isOpen) {
        setQrModalData({ ...qrModalData, isOpen: false });
        return;
      }
      if (currentView !== 'home') {
        setCurrentView('home');
        return;
      }
      // If we are at home, we could exit app
      CapacitorApp.exitApp();
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [
    showPasswordPrompt, showDuplicates, showCreateWallet, showExportCSV, 
    qrModalData.isOpen, currentView
  ]);

  // Hide native splash immediately, show our custom animated one
  useEffect(() => {
    SplashScreen.hide().catch(() => {});
  }, []);

  // Global Keyboard & Focus Handler
  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const scrollContainer = target.closest('.overflow-y-auto') || target.closest('.overflow-auto') || document.getElementById('root') || document.body;
        // Force large padding at the bottom of the scrolling container
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
    if (showSplash) return; // Wait for custom splash to finish before prompting bio/pin

    const authenticate = async () => {
      try {
        // Check onboarding
        const { value: onboarded } = await Preferences.get({ key: ONBOARDED_KEY });
        if (!onboarded) { setShowOnboarding(true); }

        const hasBio = await isBiometricAvailable();
        if (hasBio) {
          const key = await getEncryptionKeyBiometric();
          setAesKey(key);
          const savedWallets = await loadWallets(key);
          if (savedWallets && savedWallets.length > 0) {
            setWallets(savedWallets);
          }
        } else {
          // No biometric hardware — show in-app PIN screen
          setNeedsPinAuth(true);
        }
      } catch (err) {
        setAuthError(err.message || "Failed to authenticate.");
      }
      setVaultLoading(false);
    };
    authenticate();
  }, [showSplash]);

  // Called after PIN verification succeeds
  const handlePinSuccess = async (isDecoy = false) => {
    try {
      setIsDecoyMode(isDecoy);
      const key = await getEncryptionKeyFallback();
      setAesKey(key);
      const savedWallets = await loadWallets(key, isDecoy);
      if (savedWallets && savedWallets.length > 0) {
        setWallets(savedWallets);
      } else {
        setWallets([]); // clear just in case it's a new decoy vault
      }
      setNeedsPinAuth(false);
    } catch (err) {
      setAuthError(err.message || "Failed to load vault.");
    }
  };

  // App Switcher Privacy & Shake to Lock
  useEffect(() => {
    // 1. App Switcher Privacy
    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      setIsAppActive(isActive);
    });

    // 2. Shake to Lock
    let lastX = null, lastY = null, lastZ = null;
    let shakeEnabled = false;
    let threshold = 15;

    const checkShakeSettings = async () => {
      const { value: en } = await Preferences.get({ key: 'xkey_shake_to_lock' });
      shakeEnabled = en === 'true';
      const { value: sens } = await Preferences.get({ key: 'xkey_shake_sensitivity' });
      if (sens) threshold = Number(sens);
    };

    checkShakeSettings();
    // Re-check when app becomes active
    const shakeStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkShakeSettings();
    });

    const handleMotion = (e) => {
      if (!shakeEnabled || needsPinAuth || vaultLoading || !e.accelerationIncludingGravity) return;
      const { x, y, z } = e.accelerationIncludingGravity;
      if (lastX !== null) {
        const deltaX = Math.abs(lastX - x);
        const deltaY = Math.abs(lastY - y);
        const deltaZ = Math.abs(lastZ - z);
        if (deltaX + deltaY + deltaZ > threshold) {
          // Trigger Lock
          setNeedsPinAuth(true);
          hapticSuccess();
        }
      }
      lastX = x;
      lastY = y;
      lastZ = z;
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      stateListener.then(l => l.remove());
      shakeStateListener.then(l => l.remove());
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [needsPinAuth, vaultLoading]);

  // ─── File Upload (CSV / .xkey) ───
  const handleFileUpload = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ['text/csv', 'text/comma-separated-values', 'application/csv', '.csv', 'application/octet-stream', '.xkey', '*/*'],
        multiple: false,
        readData: true
      });

      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        setLoading(true);

        // Handle .xkey Backup File — always prompt for password
        if (file.name && file.name.toLowerCase().endsWith('.xkey')) {
          setPendingBackupData(file.data);
          setShowPasswordPrompt(true);
          setLoading(false);
          return;
        }

        // Handle CSV File
        let csvString = '';
        try {
          const binString = atob(file.data);
          const bytes = new Uint8Array(binString.length);
          for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
          }
          csvString = new TextDecoder().decode(bytes);
        } catch (e) {
          showToast(t('common.errorReadingFile') || 'Error reading file data.', 'error');
          setLoading(false);
          return;
        }

        Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const { data } = results;
            const folderName = file.name ? file.name.replace(/\.csv$/i, '') : 'Imported';

            const normalizedData = data.map(row => {
              const normalizedRow = { _raw: row, groupId: folderName, createdAt: Date.now() };
              for (const [key, value] of Object.entries(row)) {
                const lowerKey = key.toLowerCase().trim();
                if (lowerKey.includes('name')) normalizedRow.name = value;
                else if (lowerKey.includes('address')) normalizedRow.address = value;
                else if (lowerKey.includes('private') || lowerKey === 'pk') normalizedRow.privateKey = value;
                else if (lowerKey.includes('seed') || lowerKey.includes('phrase')) normalizedRow.seedPhrase = value;
                else if (lowerKey.includes('balance') || lowerKey.includes('amount')) normalizedRow.balance = value;
              }
              return normalizedRow;
            });

            // Filter duplicates: skip wallets whose address already exists in vault
            const existingAddrs = new Set(wallets.map(w => w.address?.toLowerCase()).filter(Boolean));
            const uniqueNew = normalizedData.filter(w => {
              if (!w.address) return true;
              const lower = w.address.toLowerCase();
              if (existingAddrs.has(lower)) return false;
              existingAddrs.add(lower);
              return true;
            });
            const skippedCount = normalizedData.length - uniqueNew.length;

            const newWallets = [...wallets, ...uniqueNew];
            setWallets(newWallets);
            await saveWallets(newWallets, aesKey, isDecoyMode);
            let msg = t('home.importSuccess', { count: uniqueNew.length, folder: folderName });
            if (skippedCount > 0) msg += t('home.duplicatesSkipped', { count: skippedCount });
            showToast(msg, 'success');
            setLoading(false);
          },
          error: (err) => {
            showToast((t('common.csvParseError') || 'CSV parse error: ') + err.message, 'error');
            setLoading(false);
          }
        });
      }
    } catch (error) {
      console.error('FilePicker Error:', error);
      setLoading(false);
    }
  };

  // ─── Wallet Operations ───
  const handleWipe = () => {
    setWallets([]);
    setAesKey(null);
    setCurrentView('home');
    setNeedsPinAuth(true);
  };

  const handleDeleteWallet = async (walletToDelete) => {
    const ok = await showConfirm(t('home.deleteWalletConfirm', { name: walletToDelete.name || walletToDelete.address?.substring(0, 10) }));
    if (!ok) return;
    const updated = wallets.filter(w => {
      if (walletToDelete._id && w._id) return w._id !== walletToDelete._id;
      return !(w.address === walletToDelete.address && w.name === walletToDelete.name && w.groupId === walletToDelete.groupId);
    });
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    showToast(t('home.walletDeleted'), 'info');
  };

  // Direct delete from DuplicateDetector (already confirmed there)
  const handleDeleteWalletDirect = async (walletToDelete) => {
    const updated = wallets.filter(w => {
      if (walletToDelete._id && w._id) return w._id !== walletToDelete._id;
      return !(w.address === walletToDelete.address && w.name === walletToDelete.name && w.groupId === walletToDelete.groupId);
    });
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    showToast(t('home.walletDeleted'), 'info');
  };

  const handleDeleteFolder = async (folderName) => {
    const ok = await showConfirm(t('home.deleteFolderConfirm', { name: folderName }), { danger: true });
    if (!ok) return;
    const updated = wallets.filter(w => (w.groupId || 'Imported') !== folderName);
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    setActiveFolder('All');
    showToast(t('home.folderDeleted', { name: folderName }), 'info');
  };

  const handleRenameFolder = async (oldName, newName) => {
    if (!newName || newName === oldName) { setEditingFolder(null); return; }
    const updated = wallets.map(w => (w.groupId || 'Imported') === oldName ? { ...w, groupId: newName } : w);
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    setEditingFolder(null);
    if (activeFolder === oldName) setActiveFolder(newName);
  };

  const handleRenameWallet = async (wallet, newName) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, name: newName } : w;
      return (w.address === wallet.address && w.groupId === wallet.groupId) ? { ...w, name: newName } : w;
    });
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  };

  // Edit wallet fields (name, address, PK, seed, balance, notes)
  const handleEditWallet = async (wallet, updatedFields) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, ...updatedFields } : w;
      return (w === wallet) ? { ...w, ...updatedFields } : w;
    });
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    showToast(t('walletCard.saved'), 'success');
  };

  const handleBulkNetworkChange = async (newNetwork) => {
    const filterSet = new Set(filteredWallets);
    const updated = wallets.map(w => filterSet.has(w) ? { ...w, network: newNetwork } : w);
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    showToast(t('common.updatedNetwork', { count: filteredWallets.length }) || `Updated network for ${filteredWallets.length} wallets`, 'success');
    setShowBulkNetworkModal(false);
  };

  // Save newly created wallet
  const handleSaveWallet = async (newWalletData) => {
    const newWalletsArr = Array.isArray(newWalletData) ? newWalletData : [newWalletData];
    const folder = activeFolder !== 'All' ? activeFolder : 'Created';
    const processed = newWalletsArr.map(w => ({ 
        ...w, 
        groupId: w.groupId || folder, 
        network: w.network || 'ETH', 
        pinned: false,
        createdAt: w.createdAt || Date.now()
    }));
    const updated = [...processed, ...wallets];
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  };

  // Toggle pin
  const handleTogglePin = async (wallet) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, pinned: !w.pinned } : w;
      return (w === wallet) ? { ...w, pinned: !w.pinned } : w;
    });
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    hapticTap();
  };

  // Move wallet to a different folder
  const handleMoveWallet = async (wallet, newFolder) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, groupId: newFolder } : w;
      return (w === wallet) ? { ...w, groupId: newFolder } : w;
    });
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    showToast(t('home.movedToFolder', { folder: newFolder }), 'success');
  };

  // Self-destruct: wipe all data after too many failed PIN attempts
  const handleSelfDestruct = async () => {
    const { wipeAllData } = await import('./utils/storage');
    await wipeAllData();
    await Preferences.clear();
    window.location.reload();
  };

  // Handle portable backup password submission
  const handleImportWithPassword = async () => {
    if (!pendingBackupData) return;
    try {
      const backup = await parseVaultBackupFile(pendingBackupData, aesKey, importPassword || null);
      // Dedup
      const existingAddrs = new Set(wallets.map(w => w.address?.toLowerCase()).filter(Boolean));
      const uniqueBackup = backup.wallets.filter(w => {
        if (!w.address) return true;
        const lower = w.address.toLowerCase();
        if (existingAddrs.has(lower)) return false;
        existingAddrs.add(lower);
        return true;
      });
      const skipped = backup.wallets.length - uniqueBackup.length;

      const newWallets = [...wallets, ...uniqueBackup];
      setWallets(newWallets);
      await saveWallets(newWallets, aesKey, isDecoyMode);
      let msg = t('home.backupImported', { count: uniqueBackup.length });
      if (skipped > 0) msg += t('home.duplicatesSkipped', { count: skipped });
      showToast(msg, 'success');
    } catch (err) {
      showToast(err.message || t('restore.wrongPassword'), 'error');
    }
    setShowPasswordPrompt(false);
    setPendingBackupData(null);
    setImportPassword('');
  };

  // ─── Duplicate count badge ───
  const duplicateCount = useMemo(() => {
    const map = new Map();
    wallets.forEach(w => {
      if (!w.address) return;
      const key = w.address.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    let groups = 0;
    for (const count of map.values()) {
      if (count > 1) groups++;
    }
    return groups;
  }, [wallets]);

  // ─── View Router ───
  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (authError) return <AuthErrorScreen error={authError} />;

  let mainContent = null;

  if (!aesKey) {
    mainContent = (
      <div className={`min-h-screen bg-surface-950 text-white font-sans overflow-hidden flex flex-col ${!isAppActive ? 'blur-xl pointer-events-none' : ''} items-center justify-center`}>
        <div className="text-[56px] font-bold text-white tracking-[2px]" style={{ textShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}>
          xKey
        </div>
      </div>
    );
  } else if (currentView === 'settings') {
    mainContent = (
      <SettingsScreen
        aesKey={aesKey}
        onBack={() => setCurrentView('home')}
        onWipe={handleWipe}
        onImport={(newWallets) => setWallets(newWallets)}
      />
    );
  } else if (currentView === 'dashboard') {
    mainContent = <DashboardView wallets={wallets} onBack={() => setCurrentView('home')} />;
  } else {
    // ─── Home View ───
  const folders = ['All', ...new Set(wallets.map(w => w.groupId || 'Imported'))];

  const filteredWallets = wallets.filter(w => {
    // Folder filter
    if (activeFolder !== 'All' && (w.groupId || 'Imported') !== activeFolder) return false;
    // Search filter — now includes notes
    const q = searchQuery.toLowerCase();
    const matchSearch = (w.name && w.name.toLowerCase().includes(q)) ||
      (w.address && w.address.toLowerCase().includes(q)) ||
      (w.notes && w.notes.toLowerCase().includes(q));
    if (!matchSearch) return false;
    // Advanced filter
    if (activeFilter === 'hasPk') return !!w.privateKey;
    if (activeFilter === 'hasSeed') return !!w.seedPhrase;
    if (activeFilter === 'hasBalance') return (parseFloat(w.balance || 0) || 0) > 0;
    if (activeFilter === 'empty') return (parseFloat(w.balance || 0) || 0) === 0;
    if (activeFilter === 'pinned') return !!w.pinned;
    if (activeFilter.startsWith('net:')) return (w.network || 'ETH') === activeFilter.slice(4);
    return true;
  }).sort((a, b) => {
    // Pinned wallets always first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    switch (sortOrder) {
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '');
      case 'date-desc':
        return (b.createdAt || 0) - (a.createdAt || 0);
      case 'date-asc':
        return (a.createdAt || 0) - (b.createdAt || 0);
      case 'balance-desc': {
        const va = parseFloat(a.balance || 0) || 0;
        const vb = parseFloat(b.balance || 0) || 0;
        return vb - va;
      }
      case 'balance-asc': {
        const va = parseFloat(a.balance || 0) || 0;
        const vb = parseFloat(b.balance || 0) || 0;
        return va - vb;
      }
      case 'address-asc':
        return (a.address || '').localeCompare(b.address || '');
      default:
        return 0;
    }
  });

  const totalBalance = filteredWallets.reduce((acc, w) => {
    const val = parseFloat(w.balance || 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  mainContent = (
    <>
    <div className={`min-h-screen bg-surface-950 text-surface-50 font-sans selection:bg-brand-500/30 ${!isAppActive ? 'blur-xl pointer-events-none' : ''}`}>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-900/80 backdrop-blur-md border-b border-surface-800 px-4 py-4 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="xKey" className="w-9 h-9 rounded-lg logo-animated" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400 pr-1">
              {t('home.title')}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {wallets.length > 0 && (
              <>
                {/* Export CSV */}
                <button onClick={() => { hapticTap(); setShowExportCSV(true); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title="Export CSV">
                  <FileDown size={18} />
                </button>
                {/* Duplicate Detector */}
                <button
                  onClick={() => { hapticTap(); setShowDuplicates(true); }}
                  className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors relative"
                  title="Duplicate Detector"
                >
                  <AlertTriangle size={18} />
                  {duplicateCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                      {duplicateCount}
                    </span>
                  )}
                </button>
              </>
            )}
            <button onClick={() => { hapticTap(); setCurrentView('dashboard'); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title="Analytics">
              <BarChart3 size={18} />
            </button>
            <button onClick={() => { hapticTap(); setShowDonate(true); }} className="p-2 bg-gradient-to-br from-fuchsia-500/20 to-brand-500/20 hover:from-fuchsia-500/30 hover:to-brand-500/30 border border-fuchsia-500/30 rounded-full transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(217,70,239,0.4)] animate-pulse" title="Donate">
              <Heart size={20} className="text-fuchsia-400 fill-fuchsia-400/50 group-hover:fill-fuchsia-400 group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
            </button>
            <button onClick={() => { hapticTap(); setCurrentView('settings'); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title="Settings">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {wallets.length > 0 && (
          <div className="glass-card px-4 py-2 flex justify-between items-center mb-0 mt-1">
            <div className="flex flex-col">
              <span className="text-surface-400 text-[10px] font-semibold tracking-wider uppercase">{t('home.totalAssets')}</span>
              <span className="text-lg font-bold text-white leading-tight">
                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
              <ShieldAlert size={12} />
              {t('home.offlineVault')}
            </div>
          </div>
        )}
      </header>

      <main className="p-4 max-w-2xl mx-auto pb-20">

        {wallets.length === 0 ? (
          <div className="space-y-4 mt-10">
            <div
              onClick={() => { hapticTap(); handleFileUpload(); }}
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
          <>
            <FolderTabs
              folders={folders} activeFolder={activeFolder} wallets={wallets}
              editingFolder={editingFolder} editFolderName={editFolderName}
              onSelectFolder={(f) => { setActiveFolder(f); }}
              onStartEdit={(f) => { setEditingFolder(f); setEditFolderName(f); }}
              onEditChange={setEditFolderName}
              onFinishEdit={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
            />

            <ActionBar
              searchQuery={searchQuery} onSearchChange={setSearchQuery}
              sortOrder={sortOrder} onSortChange={setSortOrder}
              activeFilter={activeFilter} onFilterChange={setActiveFilter}
              onAddWallet={() => { hapticTap(); setShowCreateWallet(true); }}
              onBulkNetwork={() => { hapticTap(); setShowBulkNetworkModal(true); }}
              onUpload={() => { hapticTap(); handleFileUpload(); }}
              loading={loading}
            />

            <div className="space-y-3">
              {vaultLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : filteredWallets.length === 0 ? (
                <div className="text-center py-10 text-surface-500">
                  {t('home.noWallets')}
                </div>
              ) : (
                filteredWallets.map((w, i) => (
                  <WalletCard
                    key={w._id || (w.address ? `${w.address}-${w.groupId}-${i}` : i)}
                    wallet={w}
                    onShowQR={(data, title, subtitle) => setQrModalData({ isOpen: true, data, title, subtitle })}
                    onDelete={() => handleDeleteWallet(w)}
                    onRename={(newName) => handleRenameWallet(w, newName)}
                    onEdit={(updatedFields) => handleEditWallet(w, updatedFields)}
                    onPin={() => handleTogglePin(w)}
                    onMove={(wallet) => setMovingWallet(wallet)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <QRCodeModal
        {...qrModalData}
        onClose={() => setQrModalData({ ...qrModalData, isOpen: false })}
      />

      {showExportCSV && (
        <ExportCSVModal
          wallets={filteredWallets}
          onClose={() => setShowExportCSV(false)}
        />
      )}

      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}

      {showCreateWallet && (
        <CreateWalletModal
          onClose={() => setShowCreateWallet(false)}
          onSave={handleSaveWallet}
          onShowQR={(data, title, subtitle) => setQrModalData({ isOpen: true, data, title, subtitle })}
          existingWallets={wallets}
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
          folders={['All', ...new Set(wallets.map(w => w.groupId || 'Imported'))]}
          onMove={handleMoveWallet}
          onClose={() => setMovingWallet(null)}
        />
      )}

      {showBulkNetworkModal && (
        <BulkNetworkModal 
          wallets={wallets} 
          onClose={() => setShowBulkNetworkModal(false)} 
          onSave={handleBulkNetworkChange} 
        />
      )}

      {/* Password prompt for backup import */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={22} className="text-brand-400" />
            </div>
            <h3 className="text-white font-bold text-center mb-1">{t('restore.title')}</h3>
            <p className="text-surface-400 text-sm text-center mb-5">{t('restore.desc')}</p>
            <PasswordInput
              autoFocus
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImportWithPassword()}
              placeholder={t('restore.placeholder')}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white mb-4 focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
            />
            <div className="flex gap-3">
              <button onClick={() => { hapticTap(); setShowPasswordPrompt(false); setPendingBackupData(null); setImportPassword(''); }}
                className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 py-2.5 rounded-lg font-medium transition-colors">{t('common.cancel')}</button>
              <button onClick={() => { hapticSuccess(); handleImportWithPassword(); }}
                className="btn-glow btn-glow-success flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg font-medium transition-colors">{t('restore.button')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
  }

  return (
    <>
      {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
      <div style={{ display: (needsPinAuth && !vaultLoading) ? 'none' : 'block' }}>
        {mainContent}
      </div>
      {needsPinAuth && !vaultLoading && (
        <div className="fixed inset-0 z-[10000] bg-surface-950">
          <PinLockScreen onSuccess={handlePinSuccess} onSelfDestruct={handleSelfDestruct} />
          {!isAppActive && (
            <div className="fixed inset-0 z-[10001] bg-surface-950/80 backdrop-blur-xl flex items-center justify-center">
              <div className="text-[40px] font-bold text-white/30 tracking-[2px]">xKey</div>
            </div>
          )}
        </div>
      )}
      {!isAppActive && !needsPinAuth && (
        <div className="fixed inset-0 z-[9999] bg-surface-950/80 backdrop-blur-xl flex items-center justify-center">
          <div className="text-[40px] font-bold text-white/30 tracking-[2px] animate-pulse">xKey</div>
        </div>
      )}
    </>
  );
}
