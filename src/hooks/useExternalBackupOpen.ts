import { useEffect, useRef, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { addXKeyFileOpenListener, getPendingXKeyFile } from '../utils/nativeFileOpen';
import { withTimeout } from '../utils/asyncTimeout';
import { EXTERNAL_BACKUP_DEDUPE_MS, EXTERNAL_BACKUP_TIMEOUT_MS } from '../app/constants';

type ExternalBackupFile = {
  available?: boolean;
  data?: string;
  base64?: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

export default function useExternalBackupOpen(
  aesKey: string | null,
  handleExternalBackupFile: (file: ExternalBackupFile) => Promise<boolean>,
) {
  const [externalBackupWaiting, setExternalBackupWaiting] = useState(false);
  const lastExternalBackupRef = useRef<{ fingerprint: string; ts: number } | null>(null);

  useEffect(() => {
    if (!aesKey || !Capacitor.isNativePlatform()) return undefined;

    let cancelled = false;
    let listener: PluginListenerHandle | undefined;

    const consumePendingFile = async () => {
      try {
        const file = await withTimeout(
          getPendingXKeyFile(),
          EXTERNAL_BACKUP_TIMEOUT_MS,
          () => new Error('External file open timed out'),
        );

        if (!cancelled && file?.available) {
          const fingerprint = `${file.name || ''}|${file.size || 0}|${(file.base64 || '').slice(0, 64)}`;
          const latest = lastExternalBackupRef.current;
          if (latest?.fingerprint === fingerprint && Date.now() - latest.ts < EXTERNAL_BACKUP_DEDUPE_MS) return;

          lastExternalBackupRef.current = { fingerprint, ts: Date.now() };
          setExternalBackupWaiting(true);

          await withTimeout(
            handleExternalBackupFile(file),
            EXTERNAL_BACKUP_TIMEOUT_MS,
            () => new Error('External backup preview timed out'),
          );
        }
      } catch (err) {
        console.warn('Unable to consume pending .xkey file intent.', err);
      } finally {
        if (!cancelled) setExternalBackupWaiting(false);
      }
    };

    consumePendingFile();
    addXKeyFileOpenListener(() => {
      consumePendingFile();
    }).then((handle) => {
      listener = handle;
    }).catch(() => {});

    return () => {
      cancelled = true;
      listener?.remove?.();
    };
  }, [aesKey, handleExternalBackupFile]);

  return externalBackupWaiting;
}