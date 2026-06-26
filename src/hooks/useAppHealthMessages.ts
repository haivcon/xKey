import { useEffect, useState, type MutableRefObject } from 'react';
import { Preferences } from '@capacitor/preferences';
import { cleanupInternalTextFiles } from '../utils/internalTextStore';
import { INTERNAL_TEXT_MAX_AGE_MS, REPLACE_SNAPSHOT_KEY } from '../app/constants';
import type { TranslationFn } from '../contexts/LanguageContext';

type UseAppHealthMessagesParams = {
  aesKey: string | null;
  externalBackupWaiting: boolean;
  tRef: MutableRefObject<TranslationFn>;
};

export default function useAppHealthMessages({
  aesKey,
  externalBackupWaiting,
  tRef,
}: UseAppHealthMessagesParams) {
  const [healthMessages, setHealthMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!aesKey) {
      setHealthMessages([]);
      return;
    }

    let active = true;

    (async () => {
      const messages: string[] = [];
      const [snapshot, cleaned] = await Promise.all([
        Preferences.get({ key: REPLACE_SNAPSHOT_KEY }).then(({ value }) => value).catch(() => ''),
        cleanupInternalTextFiles(['xkey-replace-snapshot', 'xkey-vanity-session'], INTERNAL_TEXT_MAX_AGE_MS),
      ]);

      if (snapshot) messages.push(tRef.current('health.replaceSnapshotPending'));
      if (externalBackupWaiting) messages.push(tRef.current('health.externalBackupPending'));
      if (cleaned > 0) messages.push(tRef.current('health.cleanedTempFiles', { count: cleaned }));
      if (active) setHealthMessages(messages);
    })();

    return () => {
      active = false;
    };
  }, [aesKey, externalBackupWaiting, tRef]);

  return healthMessages;
}