import { useState, useCallback } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import Papa from 'papaparse';
import { saveWallets } from '../utils/storage';
import { parseVaultBackupFile } from '../utils/backupUtils';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';

/**
 * Hook encapsulating file import logic (CSV and .xkey backup files).
 */
export default function useFileImport(wallets, setWallets, aesKey, isDecoyMode) {
  const [loading, setLoading] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState(null);
  const [importPassword, setImportPassword] = useState('');

  const { showToast } = useToast();
  const t = useT();

  // Shared import helper: dedup + persist + toast
  const importWallets = useCallback(async (newData, folderName) => {
    const existingAddrs = new Set(wallets.map(w => w.address?.toLowerCase()).filter(Boolean));
    const uniqueNew = newData.filter(w => {
      if (!w.address) return true;
      const lower = w.address.toLowerCase();
      if (existingAddrs.has(lower)) return false;
      existingAddrs.add(lower);
      return true;
    });
    const skippedCount = newData.length - uniqueNew.length;
    const updated = [...wallets, ...uniqueNew];
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
    let msg = t('home.importSuccess', { count: uniqueNew.length, folder: folderName });
    if (skippedCount > 0) msg += t('home.duplicatesSkipped', { count: skippedCount });
    showToast(msg, 'success');
  }, [wallets, setWallets, aesKey, isDecoyMode, showToast, t]);

  const handleFileUpload = useCallback(async () => {
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
        let rawString = '';
        try {
          const binString = atob(file.data);
          const bytes = new Uint8Array(binString.length);
          for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
          }
          rawString = new TextDecoder().decode(bytes);
        } catch (e) {
          showToast(t('common.errorReadingFile') || 'Error reading file data.', 'error');
          setLoading(false);
          return;
        }

        const fileName = file.name || 'Imported';
        const folderName = fileName.replace(/\.(csv|json|txt)$/i, '');

        // --- Detect format ---
        const trimmed = rawString.trim();

        // JSON format: array of wallet objects
        if ((fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('[')) && trimmed.startsWith('[')) {
          try {
            const jsonData = JSON.parse(trimmed);
            if (!Array.isArray(jsonData)) throw new Error('Expected JSON array');
            const normalized = jsonData.map(row => ({
              name: row.name || row.Name || '',
              address: row.address || row.Address || row.wallet || '',
              privateKey: row.privateKey || row.private_key || row.pk || '',
              seedPhrase: row.seedPhrase || row.seed_phrase || row.seed || row.mnemonic || '',
              balance: row.balance || row.Balance || '',
              network: row.network || row.Network || 'ETH',
              notes: row.notes || row.Notes || '',
              tags: row.tags || [],
              groupId: folderName,
              createdAt: row.createdAt || Date.now(),
            }));
            await importWallets(normalized, folderName);
          } catch (err) {
            showToast((t('common.jsonParseError') || 'JSON parse error: ') + err.message, 'error');
          }
          setLoading(false);
          return;
        }

        // Plain text: one address per line
        if (fileName.toLowerCase().endsWith('.txt') || (!trimmed.includes(',') && trimmed.split('\n').length > 1)) {
          const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
          const normalized = lines.map((line, i) => ({
            name: `Wallet ${i + 1}`,
            address: line,
            groupId: folderName,
            createdAt: Date.now(),
            network: 'ETH',
          }));
          await importWallets(normalized, folderName);
          setLoading(false);
          return;
        }

        // CSV format (default)
        Papa.parse(rawString, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const { data } = results;

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

            await importWallets(normalizedData, folderName);
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
  }, [wallets, setWallets, aesKey, isDecoyMode, showToast, t]);

  const handleImportWithPassword = useCallback(async () => {
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
  }, [pendingBackupData, wallets, setWallets, aesKey, isDecoyMode, importPassword, showToast, t]);

  const dismissPasswordPrompt = useCallback(() => {
    setShowPasswordPrompt(false);
    setPendingBackupData(null);
    setImportPassword('');
  }, []);

  return {
    loading,
    showPasswordPrompt,
    importPassword, setImportPassword,
    handleFileUpload,
    handleImportWithPassword,
    dismissPasswordPrompt,
  };
}
