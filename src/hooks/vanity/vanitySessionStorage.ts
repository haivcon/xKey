import { Preferences } from '@capacitor/preferences';
import type { GeneratedWallet, VanitySessionState } from '../../components/create-wallet/types';
import {
  deleteInternalText,
  parseInternalTextRef,
  readInternalText,
  serializeInternalTextRef,
  writeInternalText,
} from '../../utils/internalTextStore';
import { VANITY_SESSION_KEY } from '../../components/create-wallet/constants';

export const hasStoredVanitySession = async (): Promise<boolean> => {
  const { value } = await Preferences.get({ key: VANITY_SESSION_KEY });
  return !!value;
};

export const clearStoredVanitySession = async (): Promise<void> => {
  const { value } = await Preferences.get({ key: VANITY_SESSION_KEY });
  const storedRef = parseInternalTextRef(value);
  await Preferences.remove({ key: VANITY_SESSION_KEY });
  if (storedRef) await deleteInternalText(storedRef);
};

export const writeVanitySessionBackup = async ({
  wallets,
  state,
  aesKey,
}: {
  wallets: GeneratedWallet[];
  state: VanitySessionState;
  aesKey: string;
}): Promise<void> => {
  const { createPortableBackupText } = await import('../../utils/backup/backupUtils');
  const container = await createPortableBackupText(
    wallets,
    { scope: 'vanity-session', state },
    aesKey
  );
  const { value: previousValue } = await Preferences.get({ key: VANITY_SESSION_KEY });
  const previousRef = parseInternalTextRef(previousValue);
  const sessionRef = await writeInternalText('xkey-vanity-session', container);
  await Preferences.set({ key: VANITY_SESSION_KEY, value: serializeInternalTextRef(sessionRef) });
  if (previousRef) await deleteInternalText(previousRef);
};

export const readVanitySessionBackup = async ({
  aesKey,
}: {
  aesKey: string;
}): Promise<{
  wallets?: GeneratedWallet[];
  config?: { state?: VanitySessionState };
}> => {
  const { value } = await Preferences.get({ key: VANITY_SESSION_KEY });
  if (!value) return {};
  const storedRef = parseInternalTextRef(value);
  const sessionText = storedRef ? await readInternalText(storedRef) : value;
  const { parseVaultBackupFile } = await import('../../utils/backup/backupUtils');
  return (await parseVaultBackupFile(sessionText, aesKey, aesKey)) as {
    wallets?: GeneratedWallet[];
    config?: { state?: VanitySessionState };
  };
};