import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import Papa from 'papaparse';
import { saveWallets } from '../utils/storage';
import { inspectBackupFile, parseVaultBackupFile } from '../utils/backupUtils';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import { appendAuditLog } from '../utils/auditLog';
import type { Wallet } from '../types';

type BackupPreview = {
  fileName?: string;
  openedFromExternal?: boolean;
  integrity?: string;
  metadata?: {
    walletCount?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
type BackupImportAnalysis = { total: number; newWallets: number; duplicates: number; changed: number; missingSensitive: number; sensitive: number };
type BackupImportMode = 'merge' | 'replace';

type ExternalBackupFile = {
  data?: string;
  base64?: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

type UseFileImportResult = {
  loading: boolean;
  showPasswordPrompt: boolean;
  backupPreview: BackupPreview | null;
  importPassword: string;
  backupAnalysis: BackupImportAnalysis | null;
  backupImportMode: BackupImportMode;
  setBackupImportMode: Dispatch<SetStateAction<BackupImportMode>>;
  setImportPassword: Dispatch<SetStateAction<string>>;
  handleFileUpload: (targetFolderName?: string) => Promise<void>;
  handleExternalBackupFile: (file: ExternalBackupFile) => Promise<boolean>;
  handleImportWithPassword: () => Promise<void>;
  previewBackupWithPassword: () => Promise<void>;
  dismissPasswordPrompt: () => void;
};

/**
 * Hook encapsulating file import logic (CSV and .xkey backup files).
 */
export default function useFileImport(
  wallets: Wallet[],
  setWallets: Dispatch<SetStateAction<Wallet[]>>,
  aesKey: string | null,
  isDecoyMode: boolean,
): UseFileImportResult {
  const [loading, setLoading] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<string | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [backupAnalysis, setBackupAnalysis] = useState<BackupImportAnalysis | null>(null);
  const [backupImportMode, setBackupImportMode] = useState<BackupImportMode>('merge');

  const { showToast } = useToast();
  const t = useT();

  // Shared import helper: dedup + persist + toast
  const importWallets = useCallback(async (newData: Wallet[], folderName: string) => {
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
      } as Parameters<typeof FilePicker.pickFiles>[0] & { multiple: boolean });

      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        const fileData = String(file.data || '');
        setLoading(true);

        // Handle .xkey Backup File — always prompt for password
        if (file.name && file.name.toLowerCase().endsWith('.xkey')) {
          const preview = await inspectBackupFile(fileData) as BackupPreview;
          setPendingBackupData(fileData);
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
          const binString = atob(fileData);
          const bytes = new Uint8Array(binString.length);
          for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
          }
          rawString = new TextDecoder().decode(bytes);
        } catch {
          showToast({ key: 'common.errorReadingFile', category: 'warning' }, 'error');
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
            const jsonData = JSON.parse(trimmed) as Array<Record<string, unknown>>;
            if (!Array.isArray(jsonData)) throw new Error('Expected JSON array');
            const normalized: Wallet[] = jsonData.map(row => ({
              name: String(row.name || row.Name || ''),
              address: String(row.address || row.Address || row.wallet || ''),
              privateKey: String(row.privateKey || row.private_key || row.pk || ''),
              seedPhrase: String(row.seedPhrase || row.seed_phrase || row.seed || row.mnemonic || ''),
              balance: String(row.balance || row.Balance || ''),
              network: String(row.network || row.Network || 'ETH'),
              notes: String(row.notes || row.Notes || ''),
              tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
              groupId: folderName,
              createdAt: Number(row.createdAt || Date.now()),
            }));
            await importWallets(normalized, folderName);
          } catch (err: unknown) {
            showToast(`${t('common.jsonParseError')}: ${err instanceof Error ? err.message : String(err)}`, 'error');
          }
          setLoading(false);
          return;
        }

        // Plain text: one address per line
        if (fileName.toLowerCase().endsWith('.txt') || (!trimmed.includes(',') && trimmed.split('\n').length > 1)) {
          const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
          const normalized: Wallet[] = lines.map((line, i) => ({
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
          complete: async (results: Papa.ParseResult<Record<string, unknown>>) => {
            const { data } = results;

            const normalizedData: Wallet[] = data.map(row => {
              const normalizedRow: Wallet = { _raw: Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])), groupId: folderName, createdAt: Date.now() };
              for (const [key, value] of Object.entries(row)) {
                const lowerKey = key.toLowerCase().trim();
                const stringValue = String(value ?? '');
                if (lowerKey.includes('name')) normalizedRow.name = stringValue;
                else if (lowerKey.includes('address')) normalizedRow.address = stringValue;
                else if (lowerKey.includes('private') || lowerKey === 'pk') normalizedRow.privateKey = stringValue;
                else if (lowerKey.includes('seed') || lowerKey.includes('phrase')) normalizedRow.seedPhrase = stringValue;
                else if (lowerKey.includes('balance') || lowerKey.includes('amount')) normalizedRow.balance = stringValue;
              }
              return normalizedRow;
            });

            await importWallets(normalizedData, folderName);
            setLoading(false);
          },
          error: (err: Error) => {
            showToast(`${t('common.csvParseError')}: ${err.message}`, 'error');
            setLoading(false);
          }
        });
      }
    } catch (error: unknown) {
      console.error('FilePicker Error:', error);
      setLoading(false);
    }
  }, [importWallets, showToast, t]);

  const handleExternalBackupFile = useCallback(async (file: ExternalBackupFile) => {
    const fileData = file?.data || file?.base64 || '';
    if (!fileData) return false;
    const fileName = file.name || 'opened.xkey';
    if (!fileName.toLowerCase().endsWith('.xkey')) {
      showToast({ key: 'common.errorReadingFile', category: 'warning' }, 'error');
      await appendAuditLog('backup.external_file_ignored', {
        fileName,
        mimeType: file.mimeType || '',
      });
      return false;
    }

    setLoading(true);
    try {
      const preview = await inspectBackupFile(fileData) as BackupPreview;
      setPendingBackupData(fileData);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown';
      showToast(message || { key: 'common.errorReadingFile', category: 'warning' }, 'error');
      await appendAuditLog('backup.external_open_failed', {
        fileName,
        reason: message,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleImportWithPassword = useCallback(async () => {
    if (!pendingBackupData) return;
    try {
      const backup = await parseVaultBackupFile(pendingBackupData, aesKey || '', importPassword || null) as { wallets: Wallet[] };
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

      const newWallets = backupImportMode === 'replace' ? backup.wallets : [...wallets, ...uniqueBackup];
      setWallets(newWallets);
      await saveWallets(newWallets, aesKey, isDecoyMode);
      let msg = t('home.backupImported', { count: backupImportMode === 'replace' ? backup.wallets.length : uniqueBackup.length });
      if (backupImportMode === 'merge' && skipped > 0) msg += t('home.duplicatesSkipped', { count: skipped });
      showToast(msg, 'success');
      await appendAuditLog('backup.imported', {
        walletCount: backupImportMode === 'replace' ? backup.wallets.length : uniqueBackup.length,
        skipped,
        mode: backupImportMode,
        integrity: backupPreview?.integrity || 'unknown',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      showToast(message || { key: 'restore.wrongPassword', category: 'backup' }, 'error');
      await appendAuditLog('backup.import_failed', {
        reason: message || 'unknown',
        integrity: backupPreview?.integrity || 'unknown',
      });
    }
    setShowPasswordPrompt(false);
    setPendingBackupData(null);
    setBackupPreview(null);
    setImportPassword('');
  }, [pendingBackupData, wallets, setWallets, aesKey, isDecoyMode, importPassword, showToast, t, backupPreview, backupImportMode]);

  const previewBackupWithPassword = useCallback(async () => {
    if (!pendingBackupData) return;
    try {
      const backup = await parseVaultBackupFile(pendingBackupData, aesKey || '', importPassword || null) as { wallets: Wallet[] };
      const fingerprint = (wallet: Wallet) => JSON.stringify({
        name: wallet.name || '',
        address: (wallet.address || '').toLowerCase(),
        privateKey: wallet.privateKey || '',
        seedPhrase: wallet.seedPhrase || '',
        balance: wallet.balance || '',
        network: wallet.network || '',
        notes: wallet.notes || '',
        groupId: wallet.groupId || '',
        tags: Array.isArray(wallet.tags) ? [...wallet.tags].sort() : [],
      });
      const existing = new Map(wallets.map(wallet => [wallet.address?.toLowerCase(), fingerprint(wallet)]).filter(([address]) => Boolean(address)) as [string, string][]);
      const duplicates = backup.wallets.filter(wallet => !!wallet.address && existing.has(wallet.address.toLowerCase())).length;
      const changed = backup.wallets.filter(wallet => {
        if (!wallet.address) return false;
        const current = existing.get(wallet.address.toLowerCase());
        return Boolean(current && current !== fingerprint(wallet));
      }).length;
      const missingSensitive = backup.wallets.filter(wallet => !wallet.privateKey && !wallet.seedPhrase).length;
      const sensitive = backup.wallets.filter(wallet => !!wallet.privateKey || !!wallet.seedPhrase).length;
      setBackupAnalysis({ total: backup.wallets.length, duplicates, changed, missingSensitive, newWallets: backup.wallets.length - duplicates, sensitive });
      await appendAuditLog('backup.decrypted_previewed', { walletCount: backup.wallets.length, duplicates, changed, missingSensitive });
    } catch {
      showToast({ key: 'restore.wrongPassword', category: 'backup' }, 'error');
    }
  }, [pendingBackupData, aesKey, importPassword, wallets, showToast]);

  const dismissPasswordPrompt = useCallback(() => {
    setShowPasswordPrompt(false);
    setPendingBackupData(null);
    setBackupPreview(null);
    setImportPassword('');
    setBackupAnalysis(null);
    setBackupImportMode('merge');
  }, []);

  return {
    loading,
    showPasswordPrompt, backupPreview, backupAnalysis, backupImportMode, setBackupImportMode,
    importPassword, setImportPassword,
    handleFileUpload,
    handleExternalBackupFile,
    handleImportWithPassword,
    previewBackupWithPassword,
    dismissPasswordPrompt,
  };
}
