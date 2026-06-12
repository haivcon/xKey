import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import {
  UploadCloud, ShieldAlert, BarChart3, Settings, FileDown, Plus, AlertTriangle, Heart
} from 'lucide-react';

// Components
import SettingsScreen from './components/SettingsScreen';
import QRCodeModal from './components/QRCodeModal';
import DashboardView from './components/DashboardView';
import WalletList from './components/WalletList';
import AuthErrorScreen from './components/AuthErrorScreen';
import FolderTabs from './components/FolderTabs';
import ActionBar from './components/ActionBar';
import ExportCSVModal from './components/ExportCSVModal';
import CreateWalletModal from './components/CreateWalletModal';
import DuplicateDetector from './components/DuplicateDetector';
import OnboardingScreen, { ONBOARDED_KEY } from './components/OnboardingScreen';
import PinLockScreen from './components/PinLockScreen';
import MoveToFolderModal from './components/MoveToFolderModal';
import DonateModal from './components/DonateModal';
import BulkNetworkModal from './components/BulkNetworkModal';
import BatchActionBar from './components/BatchActionBar';
import PasswordInput from './components/PasswordInput';
import AnimatedSplash from './components/AnimatedSplash';
import { SplashScreen } from '@capacitor/splash-screen';

// Utils & Hooks
import { loadWallets, isBiometricAvailable, getEncryptionKeyBiometric, getEncryptionKeyFallback } from './utils/storage';
import { hapticTap, hapticSuccess } from './utils/haptics';
import useAutoLock from './hooks/useAutoLock';
import useAutoBackup from './hooks/useAutoBackup';
import useWallets from './hooks/useWallets';
import useFileImport from './hooks/useFileImport';
import useBackButton from './hooks/useBackButton';
import useShakeToLock from './hooks/useShakeToLock';
import useBatchSelect from './hooks/useBatchSelect';
import { useToast } from './contexts/ToastContext';
import { useT } from './contexts/LanguageContext';

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
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showBulkNetworkModal, setShowBulkNetworkModal] = useState(false);
  const [movingWallet, setMovingWallet] = useState(null);
  const [showDonate, setShowDonate] = useState(false);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [needsPinAuth, setNeedsPinAuth] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Folder editing
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');

  const { showToast } = useToast();
  const t = useT();

  // ─── Custom Hooks ───
  const {
    wallets, setWallets,
    activeFolder, setActiveFolder,
    searchQuery, setSearchQuery,
    sortOrder, setSortOrder,
    activeFilter, setActiveFilter,
    folders, filteredWallets, totalBalance, duplicateCount, allTags,
    handleDeleteWallet, handleDeleteWalletDirect,
    handleDeleteFolder, handleRenameFolder,
    handleRenameWallet, handleEditWallet,
    handleBulkNetworkChange, handleSaveWallet,
    handleTogglePin, handleMoveWallet, handleReorderWallet,
  } = useWallets(aesKey, isDecoyMode);

  const {
    loading,
    showPasswordPrompt, importPassword, setImportPassword,
    handleFileUpload, handleImportWithPassword, dismissPasswordPrompt,
  } = useFileImport(wallets, setWallets, aesKey, isDecoyMode);

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
    qrModalOpen: qrModalData.isOpen, closeQrModal,
  });

  const isAppActive = useShakeToLock(needsPinAuth, vaultLoading, setNeedsPinAuth);

  // Auto-lock after idle
  useAutoLock(() => { setNeedsPinAuth(true); }, !!aesKey);

  // Auto-backup on app open
  useAutoBackup(aesKey);

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
          setNeedsPinAuth(true);
        }
      } catch (err) {
        setAuthError(err.message || "Failed to authenticate.");
      }
      setVaultLoading(false);
    };
    authenticate();
  }, [showSplash, setWallets]);

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
        setWallets([]);
      }
      setNeedsPinAuth(false);
    } catch (err) {
      setAuthError(err.message || "Failed to load vault.");
    }
  };

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
  } else if (location.pathname === '/settings') {
    mainContent = (
      <SettingsScreen
        aesKey={aesKey}
        onBack={() => navigate('/')}
        onWipe={handleWipe}
        onImport={(newWallets) => setWallets(newWallets)}
      />
    );
  } else if (location.pathname === '/dashboard') {
    mainContent = <DashboardView wallets={wallets} onBack={() => navigate('/')} />;
  } else {
    // ─── Home View ───
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
                  <button onClick={() => { hapticTap(); setShowExportCSV(true); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title="Export CSV">
                    <FileDown size={18} />
                  </button>
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
              <button onClick={() => { hapticTap(); navigate('/dashboard'); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title="Analytics">
                <BarChart3 size={18} />
              </button>
              <button onClick={() => { hapticTap(); setShowDonate(true); }} className="p-2 bg-gradient-to-br from-fuchsia-500/20 to-brand-500/20 hover:from-fuchsia-500/30 hover:to-brand-500/30 border border-fuchsia-500/30 rounded-full transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(217,70,239,0.4)] animate-pulse" title="Donate">
                <Heart size={20} className="text-fuchsia-400 fill-fuchsia-400/50 group-hover:fill-fuchsia-400 group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
              </button>
              <button onClick={() => { hapticTap(); navigate('/settings'); }} className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors" title="Settings">
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
                onFinishEdit={(oldName, newName) => { handleRenameFolder(oldName, newName); setEditingFolder(null); }}
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
                allTags={allTags}
                selectionMode={selectionMode}
                onToggleSelectionMode={toggleSelectionMode}
              />

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
              />
            </>
          )}
        </main>

        {/* Modals */}
        <QRCodeModal
          {...qrModalData}
          onClose={closeQrModal}
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
            onSave={(network) => { handleBulkNetworkChange(network); setShowBulkNetworkModal(false); }}
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
                <button onClick={() => { hapticTap(); dismissPasswordPrompt(); }}
                  className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 py-2.5 rounded-lg font-medium transition-colors">{t('common.cancel')}</button>
                <button onClick={() => { hapticSuccess(); handleImportWithPassword(); }}
                  className="btn-glow btn-glow-success flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg font-medium transition-colors">{t('restore.button')}</button>
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
