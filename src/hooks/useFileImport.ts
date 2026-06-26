import { useState, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Preferences } from '@capacitor/preferences';
import { saveWallets } from '../utils/storage';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import { appendAuditLog } from '../utils/auditLog';
import { saveTextFile } from '../utils/fileSaver';
import { deleteInternalText, parseInternalTextRef, readInternalText, serializeInternalTextRef, writeInternalText } from '../utils/internalTextStore';
import { withTimeout } from '../utils/asyncTimeout';
import type { Wallet } from '../types';
import { analyzeBackupImport, type BackupImportAnalysis } from '../features/import/backupImportAnalysis';
import { decodeBase64Text, dedupeWallets, detectImportFormat, getImportFolderName, parseCsvWallets, parseJsonWallets, parseTextWallets } from '../features/import/fileImportParsers';

export type BackupPreview = {
  fileName?: string;
  openedFromExternal?: boolean;
  integrity?: string;
  metadata?: {
    walletCount?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
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
    const { parseVaultBackupFile } = await import('../utils/backup/backupUtils');
    const snapshot = await parseVaultBackupFile(snapshotText, aesKey || '', aesKey || '') as { wallets: Wallet[] };
    setWallets(snapshot.wallets);
    await saveWallets(snapshot.wallets, aesKey, isDecoyMode);
    await Preferences.remove({ key: REPLACE_SNAPSHOT_KEY });
    if (storedRef) await deleteInternalText(storedRef);
    showToast(t('common.undoRestored'), 'success');
  }, [aesKey, isDecoyMode, setWallets, showToast, t]);

  // Shared import helper: dedup + persist + toast
  const importWallets = useCallback(async (newData: Wallet[], folderName: string) => {
    const { uniqueWallets: uniqueNew, skippedCount } = dedupeWallets(wallets, newData);
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
          const { inspectBackupFile } = await import('../utils/backup/backupUtils');
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

        setFileOperationKey('fileStatus.parsing');

        let rawString = '';
        try {
          rawString = decodeBase64Text(fileData);
        } catch {
          showToast({ key: 'common.errorReadingFile', category: 'warning' }, 'error');
          return;
        }

        const fileName = file.name || 'Imported';
        const folderName = getImportFolderName(fileName, targetFolderName);
        const format = detectImportFormat(fileName, rawString);

        try {
          const normalizedData = format === 'json'
            ? parseJsonWallets(rawString, folderName)
            : format === 'text'
              ? parseTextWallets(rawString, folderName)
              : await parseCsvWallets(rawString, folderName);

          await importWallets(normalizedData, folderName);
        } catch (err: unknown) {
          if (format === 'json') {
            showToast(`${t('common.jsonParseError')}: ${err instanceof Error ? err.message : String(err)}`, 'error');
          } else if (format === 'csv') {
            showToast(`${t('common.csvParseError')}: ${err instanceof Error ? err.message : String(err)}`, 'error');
          } else {
            showToast({ key: 'common.errorReadingFile', category: 'warning' }, 'error');
          }
        } finally {
          setLoading(false);
          setFileOperationKey('');
        }
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
      const { inspectBackupFile } = await import('../utils/backup/backupUtils');
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
      const { parseVaultBackupFile } = await import('../utils/backup/backupUtils');
      const backup = await withTimeout(
        parseVaultBackupFile(pendingBackupData, aesKey || '', importPassword || null) as Promise<{ wallets: Wallet[] }>,
        FILE_IMPORT_TIMEOUT_MS,
        () => new Error(t('restore.wrongPassword')),
      );
      const { uniqueWallets: uniqueBackup, skippedCount: skipped } = dedupeWallets(wallets, backup.wallets);

      let sensitiveUpdated = 0;
      if (backupImportMode === 'replace') {
        const { createPortableBackupText } = await import('../utils/backup/backupUtils');
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
      const { parseVaultBackupFile } = await import('../utils/backup/backupUtils');
      const backup = await withTimeout(
        parseVaultBackupFile(pendingBackupData, aesKey || '', importPassword || null) as Promise<{ wallets: Wallet[] }>,
        FILE_IMPORT_TIMEOUT_MS,
        () => new Error(t('restore.wrongPassword')),
      );
      const analysis = analyzeBackupImport(wallets, backup.wallets);
      setBackupAnalysis(analysis);
      await appendAuditLog('backup.decrypted_previewed', {
        walletCount: backup.wallets.length,
        duplicates: analysis.duplicates,
        changed: analysis.changed,
        missingSensitive: analysis.missingSensitive,
      });
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
