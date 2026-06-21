import { useState, useCallback } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import Papa from 'papaparse';
import { saveWallets } from '../utils/storage';
import { inspectBackupFile, parseVaultBackupFile } from '../utils/backupUtils';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import { appendAuditLog } from '../utils/auditLog';

/**
 * Hook encapsulating file import logic (CSV and .xkey backup files).
 */
export default function useFileImport(wallets, setWallets, aesKey, isDecoyMode) {
  const [loading, setLoading] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
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

  const handleFileUpload = useCallback(async (targetFolderName = '') => {
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
          const preview = await inspectBackupFile(file.data);
          setPendingBackupData(file.data);
          setBackupPreview({ ...preview, fileName: file.name });
          setShowPasswordPrompt(true);
          setLoading(false);
          await appendAuditLog('backup.previewed', {
            fileName: file.name,
            integrity: preview.integrity,
            walletCount: preview.metadata?.walletCount,
          });
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
        } catch {
          showToast(t('common.errorReadingFile') || 'Error reading file data.', 'error');
          setLoading(false);
          return;
        }

        const fileName = file.name || 'Imported';
        const preferredFolder = String(targetFolderName || '').trim();
        const folderName = preferredFolder || fileName.replace(/\.(csv|json|txt)$/i, '');

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
  }, [importWallets, showToast, t]);

  const handleExternalBackupFile = useCallback(async (file) => {
    if (!file?.data) return false;
    const fileName = file.name || 'opened.xkey';
    if (!fileName.toLowerCase().endsWith('.xkey')) {
      showToast(t('common.errorReadingFile') || 'Error reading file data.', 'error');
      await appendAuditLog('backup.external_file_ignored', {
        fileName,
        mimeType: file.mimeType || '',
      });
      return false;
    }

    setLoading(true);
    try {
      const preview = await inspectBackupFile(file.data);
      setPendingBackupData(file.data);
      setBackupPreview({ ...preview, fileName, openedFromExternal: true });
      setShowPasswordPrompt(true);
      await appendAuditLog('backup.opened_from_android', {
        fileName,
        mimeType: file.mimeType || '',
        size: file.size || 0,
        integrity: preview.integrity,
        walletCount: preview.metadata?.walletCount,
      });
      return true;
    } catch (err) {
      showToast(err.message || t('common.errorReadingFile') || 'Error reading file data.', 'error');
      await appendAuditLog('backup.external_open_failed', {
        fileName,
        reason: err.message || 'unknown',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

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
      await appendAuditLog('backup.imported', {
        walletCount: uniqueBackup.length,
        skipped,
        integrity: backupPreview?.integrity || 'unknown',
      });
    } catch (err) {
      showToast(err.message || t('restore.wrongPassword'), 'error');
      await appendAuditLog('backup.import_failed', {
        reason: err.message || 'unknown',
        integrity: backupPreview?.integrity || 'unknown',
      });
    }
    setShowPasswordPrompt(false);
    setPendingBackupData(null);
    setBackupPreview(null);
    setImportPassword('');
  }, [pendingBackupData, wallets, setWallets, aesKey, isDecoyMode, importPassword, showToast, t, backupPreview]);

  const dismissPasswordPrompt = useCallback(() => {
    setShowPasswordPrompt(false);
    setPendingBackupData(null);
    setBackupPreview(null);
    setImportPassword('');
  }, []);

  return {
    loading,
    showPasswordPrompt, backupPreview,
    importPassword, setImportPassword,
    handleFileUpload,
    handleExternalBackupFile,
    handleImportWithPassword,
    dismissPasswordPrompt,
  };
}
