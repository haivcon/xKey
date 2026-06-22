import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Hook that manages Android hardware back button navigation.
 * Closes modals in order, then navigates back via router, then exits app.
 */
type Setter<T> = (value: T) => void;

type BackButtonModalStates = {
  showPasswordPrompt: boolean;
  setShowPasswordPrompt: Setter<boolean>;
  showDuplicates: boolean;
  setShowDuplicates: Setter<boolean>;
  showCreateWallet: boolean;
  setShowCreateWallet: Setter<boolean>;
  closeCreateWallet?: () => void | Promise<void>;
  showExportCSV: boolean;
  setShowExportCSV: Setter<boolean>;
  showBackupExport: boolean;
  setShowBackupExport: Setter<boolean>;
  showAdvancedTools: boolean;
  setShowAdvancedTools: Setter<boolean>;
  showBulkNetworkModal: boolean;
  setShowBulkNetworkModal: Setter<boolean>;
  showAssetBalance: boolean;
  setShowAssetBalance: Setter<boolean>;
  movingWallet: unknown;
  setMovingWallet: Setter<null>;
  showDonate: boolean;
  setShowDonate: Setter<boolean>;
  qrModalOpen: boolean;
  closeQrModal: () => void;
};

export default function useBackButton(modalStates: BackButtonModalStates): void {
  const {
    showPasswordPrompt, setShowPasswordPrompt,
    showDuplicates, setShowDuplicates,
    showCreateWallet, setShowCreateWallet, closeCreateWallet,
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
      if (showCreateWallet) {
        if (closeCreateWallet) void closeCreateWallet();
        else setShowCreateWallet(false);
        return;
      }
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
    setShowCreateWallet, closeCreateWallet, setShowExportCSV, setShowBackupExport, setShowAdvancedTools,
    setShowBulkNetworkModal, setShowAssetBalance, setMovingWallet, setShowDonate,
    closeQrModal, navigate,
  ]);
}
