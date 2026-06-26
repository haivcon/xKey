import { useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { loadWallets, decryptSetting } from '../../utils/storage';
import { exportPortableBackup } from '../../utils/backup/backupUtils';
import type { Wallet } from '../../types';

const INTERVAL_KEY = 'xkey_autobackup_interval';
const PASSWORD_KEY = 'xkey_autobackup_password';
const LAST_KEY = 'xkey_autobackup_last';

const INTERVALS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

type AutoBackupInterval = keyof typeof INTERVALS;

/**
 * Hook that runs auto-backup on app open if the configured interval has elapsed.
 * Silently creates an encrypted .xkey backup file.
 */
export default function useAutoBackup(aesKey: string | null): void {
  useEffect(() => {
    if (!aesKey) return;

    (async () => {
      try {
        const { value: interval } = await Preferences.get({ key: INTERVAL_KEY });
        if (!interval || interval === 'off') return;

        const { value: encryptedPassword } = await Preferences.get({ key: PASSWORD_KEY });
        if (!encryptedPassword) return; // No password set, skip

        const password = decryptSetting(encryptedPassword, aesKey);
        if (!password) return;

        const { value: lastStr } = await Preferences.get({ key: LAST_KEY });
        const lastBackup = lastStr ? parseInt(lastStr) : 0;
        const intervalMs = INTERVALS[interval as AutoBackupInterval];
        if (!intervalMs) return;

        if (Date.now() - lastBackup < intervalMs) return; // Not due yet

        const wallets = await loadWallets(aesKey) as Wallet[];
        if (!wallets || wallets.length === 0) return;

        await exportPortableBackup(wallets, null, password);
        await Preferences.set({ key: LAST_KEY, value: String(Date.now()) });
        console.log('[AutoBackup] Backup created successfully');
      } catch (err) {
        console.warn('[AutoBackup] Failed:', err instanceof Error ? err.message : err);
      }
    })();
  }, [aesKey]);
}
