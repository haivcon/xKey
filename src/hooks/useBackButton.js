import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Hook that manages Android hardware back button navigation.
 * Closes modals in order, then navigates back via router, then exits app.
 */
export default function useBackButton(modalStates) {
  const {
    showPasswordPrompt, setShowPasswordPrompt,
    showDuplicates, setShowDuplicates,
    showCreateWallet, setShowCreateWallet,
    showExportCSV, setShowExportCSV,
    showBackupExport, setShowBackupExport,
    showAdvancedTools, setShowAdvancedTools,
    showBulkNetworkModal, setShowBulkNetworkModal,
    showAssetBalance, setShowAssetBalance,
    movingWallet, setMovingWallet,
    showDonate, setShowDonate,
    qrModalOpen, closeQrModal,
  } = modalStates;

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      if (showPasswordPrompt) { setShowPasswordPrompt(false); return; }
      if (showDuplicates) { setShowDuplicates(false); return; }
      if (showCreateWallet) { setShowCreateWallet(false); return; }
      if (showExportCSV) { setShowExportCSV(false); return; }
      if (showBackupExport) { setShowBackupExport(false); return; }
      if (showAdvancedTools) { setShowAdvancedTools(false); return; }
      if (showBulkNetworkModal) { setShowBulkNetworkModal(false); return; }
      if (showAssetBalance) { setShowAssetBalance(false); return; }
      if (movingWallet) { setMovingWallet(null); return; }
      if (showDonate) { setShowDonate(false); return; }
      if (qrModalOpen) { closeQrModal(); return; }
      if (location.pathname !== '/') { navigate('/'); return; }
      CapacitorApp.exitApp();
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [
    showPasswordPrompt, showDuplicates, showCreateWallet, showExportCSV, showBackupExport,
    showAdvancedTools, showBulkNetworkModal, showAssetBalance, movingWallet, showDonate,
    qrModalOpen, location.pathname, setShowPasswordPrompt, setShowDuplicates,
    setShowCreateWallet, setShowExportCSV, setShowBackupExport, setShowAdvancedTools,
    setShowBulkNetworkModal, setShowAssetBalance, setMovingWallet, setShowDonate,
    closeQrModal, navigate,
  ]);
}
