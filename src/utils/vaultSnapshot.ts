import { Preferences } from '@capacitor/preferences';
import { REPLACE_SNAPSHOT_KEY } from '../app/constants';
import type { Wallet } from '../types';
import { createPortableBackupText, parseVaultBackupFile } from './backup/backupUtils';
import { appendAuditLog } from './auditLog';
import {
  deleteInternalText,
  parseInternalTextRef,
  readInternalText,
  serializeInternalTextRef,
  writeInternalText,
} from './internalTextStore';
import { saveWallets } from './storage';

export type MajorVaultOperation = 'import' | 'batch-delete' | 'merge' | 'migration' | 'replace';

export type VaultSnapshotMetadata = {
  operation: MajorVaultOperation;
  walletCount: number;
  createdAt: string;
  schemaVersion?: number;
  reason?: string;
};

export type VaultSnapshotRestoreResult = {
  wallets: Wallet[];
  metadata: VaultSnapshotMetadata | null;
};

const SNAPSHOT_TEXT_PREFIX = 'xkey-vault-snapshot';

export const createEncryptedVaultSnapshot = async (
  wallets: Wallet[],
  key: string | null,
  metadata: Omit<VaultSnapshotMetadata, 'walletCount' | 'createdAt'>,
): Promise<VaultSnapshotMetadata> => {
  const createdAt = new Date().toISOString();
  const snapshotMetadata: VaultSnapshotMetadata = {
    ...metadata,
    walletCount: wallets.length,
    createdAt,
  };
  const snapshot = await createPortableBackupText(wallets, {
    scope: `${metadata.operation}-snapshot`,
    snapshot: snapshotMetadata,
  }, key || '');
  const previousValue = await Preferences.get({ key: REPLACE_SNAPSHOT_KEY }).then(({ value }) => value).catch(() => '');
  const previousRef = parseInternalTextRef(previousValue);
  const snapshotRef = await writeInternalText(SNAPSHOT_TEXT_PREFIX, snapshot);
  await Preferences.set({ key: REPLACE_SNAPSHOT_KEY, value: serializeInternalTextRef(snapshotRef) });
  if (previousRef) await deleteInternalText(previousRef);
  await appendAuditLog('vault.snapshot_created', snapshotMetadata).catch(() => {});
  return snapshotMetadata;
};

export const restoreLatestVaultSnapshot = async (
  key: string | null,
  isDecoyMode: boolean,
): Promise<VaultSnapshotRestoreResult | null> => {
  const { value } = await Preferences.get({ key: REPLACE_SNAPSHOT_KEY });
  if (!value) return null;
  const storedRef = parseInternalTextRef(value);
  const snapshotText = storedRef ? await readInternalText(storedRef) : value;
  const snapshot = await parseVaultBackupFile(snapshotText, key || '', key || '') as {
    wallets?: Wallet[];
    metadata?: { snapshot?: VaultSnapshotMetadata };
  };
  const wallets = Array.isArray(snapshot.wallets) ? snapshot.wallets : [];
  await saveWallets(wallets, key, isDecoyMode);
  await Preferences.remove({ key: REPLACE_SNAPSHOT_KEY });
  if (storedRef) await deleteInternalText(storedRef);
  await appendAuditLog('vault.snapshot_restored', {
    walletCount: wallets.length,
    operation: snapshot.metadata?.snapshot?.operation || 'unknown',
  }).catch(() => {});
  return {
    wallets,
    metadata: snapshot.metadata?.snapshot || null,
  };
};

export const clearLatestVaultSnapshot = async (): Promise<void> => {
  const { value } = await Preferences.get({ key: REPLACE_SNAPSHOT_KEY });
  const storedRef = parseInternalTextRef(value);
  await Preferences.remove({ key: REPLACE_SNAPSHOT_KEY });
  if (storedRef) await deleteInternalText(storedRef);
};