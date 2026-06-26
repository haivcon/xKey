import { Preferences } from '@capacitor/preferences';

const BACKUP_HISTORY_KEY = 'xkey_backup_history_v1';
const MAX_BACKUP_HISTORY_ENTRIES = 20;

export type BackupHistoryEntry = {
  fileName: string;
  createdAt: string;
  walletCount: number;
  backupId: string;
  verified?: boolean;
  savedUri?: string;
  fileHash?: string;
};

export const recordBackupExport = async (entry: BackupHistoryEntry): Promise<void> => {
  try {
    const { value } = await Preferences.get({ key: BACKUP_HISTORY_KEY });
    const current = value ? JSON.parse(value) : [];
    const history = Array.isArray(current) ? current : [];
    await Preferences.set({
      key: BACKUP_HISTORY_KEY,
      value: JSON.stringify([entry, ...history].slice(0, MAX_BACKUP_HISTORY_ENTRIES)),
    });
  } catch {
    // Export has already succeeded; history is non-critical.
  }
};

export const getBackupHistory = async (): Promise<BackupHistoryEntry[]> => {
  try {
    const { value } = await Preferences.get({ key: BACKUP_HISTORY_KEY });
    const history = value ? JSON.parse(value) : [];
    return Array.isArray(history) ? history as BackupHistoryEntry[] : [];
  } catch {
    return [];
  }
};