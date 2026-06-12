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
      if (qrModalOpen) { closeQrModal(); return; }
      if (location.pathname !== '/') { navigate('/'); return; }
      CapacitorApp.exitApp();
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [
    showPasswordPrompt, showDuplicates, showCreateWallet, showExportCSV,
    qrModalOpen, location.pathname, setShowPasswordPrompt, setShowDuplicates,
    setShowCreateWallet, setShowExportCSV, closeQrModal, navigate,
  ]);
}
