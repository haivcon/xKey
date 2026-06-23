import { useState, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Preferences } from '@capacitor/preferences';
import Papa from 'papaparse';
import { saveWallets } from '../utils/storage';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import { appendAuditLog } from '../utils/auditLog';
import { saveTextFile } from '../utils/fileSaver';
import { deleteInternalText, parseInternalTextRef, readInternalText, serializeInternalTextRef, writeInternalText } from '../utils/internalTextStore';
import { withTimeout } from '../utils/asyncTimeout';
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
const REPLACE_SNAPSHOT_KEY = 'xkey_replace_snapshot_v1';
const FILE_IMPORT_TIMEOUT_MS = 15000;
const EXTERNAL_FILE_DEDUPE_MS = 3000;

type ExternalBackupFile = {
  data?: string;
  base64?: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

type UseFileImportResult = {
  loading: boolean;
  fileOperationKey: string;
  showPasswordPrompt: boolean;
  backupPreview: BackupPreview | null;
  importPassword: string;
  backupAnalysis: BackupImportAnalysis | null;
  backupImportMode: BackupImportMode;
  setBackupImportMode: Dispatch<SetStateAction<BackupImportMode>>;
  updateMissingSensitive: boolean;
  setUpdateMissingSensitive: Dispatch<SetStateAction<boolean>>;
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
  const [fileOperationKey, setFileOperationKey] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<string | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [backupAnalysis, setBackupAnalysis] = useState<BackupImportAnalysis | null>(null);
  const [backupImportMode, setBackupImportMode] = useState<BackupImportMode>('merge');
  const [updateMissingSensitive, setUpdateMissingSensitive] = useState(false);
  const lastExternalFileRef = useRef<{ fingerprint: string; ts: number } | null>(null);

  const { showToast } = useToast();
  const t = useT();

  const restoreReplaceSnapshot = useCallback(async () => {
    const { value } = await Preferences.get({ key: REPLACE_SNAPSHOT_KEY });
    if (!value) return;
    const storedRef = parseInternalTextRef(value);
    const snapshotText = storedRef ? await readInternalText(storedRef) : value;
    const { parseVaultBackupFile } = await import('../utils/backupUtils');
    const snapshot = await parseVaultBackupFile(snapshotText, aesKey || '', aesKey || '') as { wallets: Wallet[] };
    setWallets(snapshot.wallets);
    await saveWallets(snapshot.wallets, aesKey, isDecoyMode);
    await Preferences.remove({ key: REPLACE_SNAPSHOT_KEY });
    if (storedRef) await deleteInternalText(storedRef);
    showToast(t('common.undoRestored'), 'success');
  }, [aesKey, isDecoyMode, setWallets, showToast, t]);

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
        setFileOperationKey('fileStatus.reading');

        // Handle .xkey Backup File — always prompt for password
        if (file.name && file.name.toLowerCase().endsWith('.xkey')) {
          setFileOperationKey('fileStatus.verifying');
          const { inspectBackupFile } = await import('../utils/backupUtils');
          const preview = await withTimeout(
            inspectBackupFile(fileData) as Promise<BackupPreview>,
            FILE_IMPORT_TIMEOUT_MS,
            () => new Error(t('common.errorReadingFile')),
          );
          setPendingBackupData(fileData);
          setBackupPreview({ ...preview, fileName: file.name });
          setShowPasswordPrompt(true);
          setLoading(false);
          setFileOperationKey('');
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
          setFileOperationKey('fileStatus.parsing');
          const binString = atob(fileData);
          const bytes = new Uint8Array(binString.length);
          for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
          }
          rawString = new TextDecoder().decode(bytes);
        } catch {
          showToast({ key: 'common.errorReadingFile', category: 'warning' }, 'error');
          setLoading(false);
          setFileOperationKey('');
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
          setFileOperationKey('');
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
          setFileOperationKey('');
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
            setFileOperationKey('');
          },
          error: (err: Error) => {
            showToast(`${t('common.csvParseError')}: ${err.message}`, 'error');
            setLoading(false);
            setFileOperationKey('');
          }
        });
      }
    } catch (error: unknown) {
      console.error('FilePicker Error:', error);
      setLoading(false);
      setFileOperationKey('');
    }
  }, [importWallets, showToast, t]);

  const handleExternalBackupFile = useCallback(async (file: ExternalBackupFile) => {
    const fileData = file?.data || file?.base64 || '';
    if (!fileData) return false;
    const fileName = file.name || 'opened.xkey';
    const fingerprint = `${fileName}|${file.size || 0}|${fileData.slice(0, 64)}`;
    const latest = lastExternalFileRef.current;
    if (latest?.fingerprint === fingerprint && Date.now() - latest.ts < EXTERNAL_FILE_DEDUPE_MS) return true;
    lastExternalFileRef.current = { fingerprint, ts: Date.now() };

    if (!fileName.toLowerCase().endsWith('.xkey')) {
      showToast({ key: 'common.errorReadingFile', category: 'warning' }, 'error');
      await appendAuditLog('backup.external_file_ignored', {
        fileName,
        mimeType: file.mimeType || '',
      });
      return false;
    }

    setLoading(true);
    setFileOperationKey('fileStatus.verifying');
    try {
      const { inspectBackupFile } = await import('../utils/backupUtils');
      const preview = await withTimeout(
        inspectBackupFile(fileData) as Promise<BackupPreview>,
        FILE_IMPORT_TIMEOUT_MS,
        () => new Error(t('common.errorReadingFile')),
      );
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
      setFileOperationKey('');
    }
  }, [showToast, t]);

  const handleImportWithPassword = useCallback(async () => {
    if (!pendingBackupData) return;
    try {
      setLoading(true);
      setFileOperationKey('fileStatus.decrypting');
      const { parseVaultBackupFile } = await import('../utils/backupUtils');
      const backup = await withTimeout(
        parseVaultBackupFile(pendingBackupData, aesKey || '', importPassword || null) as Promise<{ wallets: Wallet[] }>,
        FILE_IMPORT_TIMEOUT_MS,
        () => new Error(t('restore.wrongPassword')),
      );
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

      let sensitiveUpdated = 0;
      if (backupImportMode === 'replace') {
        const { createPortableBackupText } = await import('../utils/backupUtils');
        const snapshot = await createPortableBackupText(wallets, { scope: 'replace-snapshot' }, aesKey || '');
        const snapshotRef = await writeInternalText('xkey-replace-snapshot', snapshot);
        await Preferences.set({ key: REPLACE_SNAPSHOT_KEY, value: serializeInternalTextRef(snapshotRef) });
      }
      const newWallets = backupImportMode === 'replace'
        ? backup.wallets
        : (() => {
            if (!updateMissingSensitive) return [...wallets, ...uniqueBackup];
            const backupByAddress = new Map(
              backup.wallets
                .filter(wallet => !!wallet.address)
                .map(wallet => [wallet.address!.toLowerCase(), wallet])
            );
            const mergedExisting = wallets.map(current => {
              const backupWallet = current.address ? backupByAddress.get(current.address.toLowerCase()) : undefined;
              if (!backupWallet) return current;
              const privateKey = current.privateKey || backupWallet.privateKey || '';
              const seedPhrase = current.seedPhrase || backupWallet.seedPhrase || '';
              if (privateKey === (current.privateKey || '') && seedPhrase === (current.seedPhrase || '')) return current;
              sensitiveUpdated += 1;
              return { ...current, privateKey, seedPhrase };
            });
            return [...mergedExisting, ...uniqueBackup];
          })();
      setWallets(newWallets);
      setFileOperationKey('fileStatus.importing');
      await saveWallets(newWallets, aesKey, isDecoyMode);
      let msg = t('home.backupImported', { count: backupImportMode === 'replace' ? backup.wallets.length : uniqueBackup.length });
      if (backupImportMode === 'merge' && skipped > 0) msg += t('home.duplicatesSkipped', { count: skipped });
      const report = [
        'xKey backup import report',
        `Time: ${new Date().toISOString()}`,
        `Mode: ${backupImportMode}`,
        `Backup ID: ${String(backupPreview?.backupId || backupPreview?.metadata?.backupId || '')}`,
        `File hash: ${String(backupPreview?.containerHash || backupPreview?.metadata?.containerHash || '')}`,
        `Imported wallets: ${backupImportMode === 'replace' ? backup.wallets.length : uniqueBackup.length}`,
        `Skipped duplicates: ${skipped}`,
        `Sensitive fields filled: ${sensitiveUpdated}`,
        `Integrity: ${String(backupPreview?.integrity || 'unknown')}`,
      ].join('\n');
      showToast(msg, 'success', 8000, {
        label: backupImportMode === 'replace' ? t('common.undo') : t('common.save'),
        onClick: backupImportMode === 'replace'
          ? restoreReplaceSnapshot
          : async () => {
              await saveTextFile(`xkey_import_report_${Date.now()}.txt`, 'text/plain', report);
            },
      });
      await appendAuditLog('backup.imported', {
        walletCount: backupImportMode === 'replace' ? backup.wallets.length : uniqueBackup.length,
        skipped,
        sensitiveUpdated,
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
    } finally {
      setLoading(false);
      setFileOperationKey('');
      setShowPasswordPrompt(false);
      setPendingBackupData(null);
      setBackupPreview(null);
      setImportPassword('');
      setUpdateMissingSensitive(false);
    }
  }, [pendingBackupData, wallets, setWallets, aesKey, isDecoyMode, importPassword, showToast, t, backupPreview, backupImportMode, updateMissingSensitive, restoreReplaceSnapshot]);

  const previewBackupWithPassword = useCallback(async () => {
    if (!pendingBackupData) return;
    try {
      setLoading(true);
      setFileOperationKey('fileStatus.previewing');
      const { parseVaultBackupFile } = await import('../utils/backupUtils');
      const backup = await withTimeout(
        parseVaultBackupFile(pendingBackupData, aesKey || '', importPassword || null) as Promise<{ wallets: Wallet[] }>,
        FILE_IMPORT_TIMEOUT_MS,
        () => new Error(t('restore.wrongPassword')),
      );
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
    } finally {
      setLoading(false);
      setFileOperationKey('');
    }
  }, [pendingBackupData, aesKey, importPassword, wallets, showToast, t]);

  const dismissPasswordPrompt = useCallback(() => {
    setShowPasswordPrompt(false);
    setPendingBackupData(null);
    setBackupPreview(null);
    setImportPassword('');
    setBackupAnalysis(null);
    setBackupImportMode('merge');
    setUpdateMissingSensitive(false);
    setLoading(false);
    setFileOperationKey('');
  }, []);

  return {
    loading, fileOperationKey,
    showPasswordPrompt, backupPreview, backupAnalysis, backupImportMode, setBackupImportMode, updateMissingSensitive, setUpdateMissingSensitive,
    importPassword, setImportPassword,
    handleFileUpload,
    handleExternalBackupFile,
    handleImportWithPassword,
    previewBackupWithPassword,
    dismissPasswordPrompt,
  };
}
