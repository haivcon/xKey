import CryptoJS from 'crypto-js';
import type { Wallet } from '../../types';

export type BackupVaultDiffSeverity = 'info' | 'warning' | 'critical';

export type BackupVaultDiffField =
  | 'name'
  | 'address'
  | 'network'
  | 'notes'
  | 'groupId'
  | 'tags'
  | 'privateKey'
  | 'seedPhrase';

export type BackupVaultDiffChange = {
  field: BackupVaultDiffField;
  currentLabel: string;
  backupLabel: string;
  severity: BackupVaultDiffSeverity;
};

export type BackupVaultDiffItemStatus = 'new_in_backup' | 'missing_from_backup' | 'unchanged' | 'changed';

export type BackupVaultDiffItem = {
  id: string;
  address?: string;
  name?: string;
  status: BackupVaultDiffItemStatus;
  changes: BackupVaultDiffChange[];
};

export type BackupSecretConflict = {
  kind: 'privateKey' | 'seedPhrase';
  fingerprint: string;
  currentWalletNames: string[];
  backupWalletNames: string[];
  severity: BackupVaultDiffSeverity;
};

export type BackupVaultDiff = {
  summary: {
    currentWallets: number;
    backupWallets: number;
    newInBackup: number;
    missingFromBackup: number;
    unchanged: number;
    changed: number;
    tagChanged: number;
    folderChanged: number;
    duplicateSecrets: number;
    addressDuplicates: number;
    criticalConflicts: number;
  };
  items: BackupVaultDiffItem[];
  secretConflicts: BackupSecretConflict[];
};

const normalizeAddress = (address?: string): string => (address || '').trim().toLowerCase();

const normalizePrivateKey = (privateKey?: string): string => {
  const value = (privateKey || '').trim().toLowerCase();
  return value.startsWith('0x') ? value.slice(2) : value;
};

const normalizeSeedPhrase = (seedPhrase?: string): string => (seedPhrase || '').trim().toLowerCase().replace(/\s+/g, ' ');

const hashSecret = (kind: 'privateKey' | 'seedPhrase', secret: string): string =>
  CryptoJS.SHA256(`xkey-secret-fingerprint-v1|${kind}|${secret}`).toString().slice(0, 16);

const walletLabel = (wallet: Wallet): string => wallet.name || wallet.address || wallet._id || 'Unnamed wallet';

const tagsLabel = (tags?: string[]): string => Array.isArray(tags) ? [...tags].map(String).sort((a, b) => a.localeCompare(b)).join(', ') : '';

const valueLabel = (value?: string): string => value?.trim() || '—';

const maskedSecretLabel = (value?: string): string => value ? 'present' : 'missing';

const walletKey = (wallet: Wallet, index: number): string => {
  const address = normalizeAddress(wallet.address);
  if (address) return `address:${address}`;
  const privateKey = normalizePrivateKey(wallet.privateKey);
  if (privateKey) return `privateKey:${hashSecret('privateKey', privateKey)}`;
  const seedPhrase = normalizeSeedPhrase(wallet.seedPhrase);
  if (seedPhrase) return `seedPhrase:${hashSecret('seedPhrase', seedPhrase)}`;
  return `index:${index}:${walletLabel(wallet)}`;
};

const buildAddressDuplicateCount = (wallets: Wallet[]): number => {
  const counts = new Map<string, number>();
  wallets.forEach(wallet => {
    const address = normalizeAddress(wallet.address);
    if (!address) return;
    counts.set(address, (counts.get(address) || 0) + 1);
  });
  return [...counts.values()].filter(count => count > 1).reduce((total, count) => total + count - 1, 0);
};

const addChange = (
  changes: BackupVaultDiffChange[],
  field: BackupVaultDiffField,
  currentLabel: string,
  backupLabel: string,
  severity: BackupVaultDiffSeverity,
): void => {
  if (currentLabel === backupLabel) return;
  changes.push({ field, currentLabel, backupLabel, severity });
};

const compareWallets = (current: Wallet, backup: Wallet): BackupVaultDiffChange[] => {
  const changes: BackupVaultDiffChange[] = [];

  addChange(changes, 'name', valueLabel(current.name), valueLabel(backup.name), 'info');
  addChange(changes, 'network', valueLabel(current.network), valueLabel(backup.network), 'info');
  addChange(changes, 'notes', valueLabel(current.notes), valueLabel(backup.notes), 'info');
  addChange(changes, 'groupId', valueLabel(current.groupId), valueLabel(backup.groupId), 'warning');
  addChange(changes, 'tags', tagsLabel(current.tags), tagsLabel(backup.tags), 'info');

  const currentPrivateKey = normalizePrivateKey(current.privateKey);
  const backupPrivateKey = normalizePrivateKey(backup.privateKey);
  if (currentPrivateKey !== backupPrivateKey) {
    addChange(changes, 'privateKey', maskedSecretLabel(currentPrivateKey), maskedSecretLabel(backupPrivateKey), 'critical');
  }

  const currentSeedPhrase = normalizeSeedPhrase(current.seedPhrase);
  const backupSeedPhrase = normalizeSeedPhrase(backup.seedPhrase);
  if (currentSeedPhrase !== backupSeedPhrase) {
    addChange(changes, 'seedPhrase', maskedSecretLabel(currentSeedPhrase), maskedSecretLabel(backupSeedPhrase), 'critical');
  }

  return changes;
};

const collectSecretConflicts = (currentWallets: Wallet[], backupWallets: Wallet[]): BackupSecretConflict[] => {
  const byFingerprint = new Map<string, { kind: 'privateKey' | 'seedPhrase'; current: string[]; backup: string[] }>();

  const add = (source: 'current' | 'backup', wallet: Wallet, kind: 'privateKey' | 'seedPhrase', normalizedSecret: string) => {
    if (!normalizedSecret) return;
    const fingerprint = hashSecret(kind, normalizedSecret);
    const entry = byFingerprint.get(fingerprint) || { kind, current: [], backup: [] };
    entry[source].push(walletLabel(wallet));
    byFingerprint.set(fingerprint, entry);
  };

  currentWallets.forEach(wallet => {
    add('current', wallet, 'privateKey', normalizePrivateKey(wallet.privateKey));
    add('current', wallet, 'seedPhrase', normalizeSeedPhrase(wallet.seedPhrase));
  });

  backupWallets.forEach(wallet => {
    add('backup', wallet, 'privateKey', normalizePrivateKey(wallet.privateKey));
    add('backup', wallet, 'seedPhrase', normalizeSeedPhrase(wallet.seedPhrase));
  });

  return [...byFingerprint.entries()]
    .filter(([, entry]) => entry.backup.length > 1 || (entry.current.length > 0 && entry.backup.length > 0))
    .map(([fingerprint, entry]) => ({
      kind: entry.kind,
      fingerprint,
      currentWalletNames: entry.current,
      backupWalletNames: entry.backup,
      severity: entry.backup.length > 1 ? 'critical' : 'warning',
    }));
};

export function analyzeBackupVaultDiff(currentWallets: Wallet[], backupWallets: Wallet[]): BackupVaultDiff {
  const currentByKey = new Map<string, Wallet>();
  const backupByKey = new Map<string, Wallet>();

  currentWallets.forEach((wallet, index) => currentByKey.set(walletKey(wallet, index), wallet));
  backupWallets.forEach((wallet, index) => backupByKey.set(walletKey(wallet, index), wallet));

  const items: BackupVaultDiffItem[] = [];
  let tagChanged = 0;
  let folderChanged = 0;
  let criticalConflicts = 0;

  backupByKey.forEach((backup, key) => {
    const current = currentByKey.get(key);
    if (!current) {
      items.push({
        id: key,
        address: backup.address,
        name: backup.name,
        status: 'new_in_backup',
        changes: [],
      });
      return;
    }

    const changes = compareWallets(current, backup);
    if (changes.some(change => change.field === 'tags')) tagChanged += 1;
    if (changes.some(change => change.field === 'groupId')) folderChanged += 1;
    if (changes.some(change => change.severity === 'critical')) criticalConflicts += 1;

    items.push({
      id: key,
      address: backup.address || current.address,
      name: backup.name || current.name,
      status: changes.length > 0 ? 'changed' : 'unchanged',
      changes,
    });
  });

  currentByKey.forEach((current, key) => {
    if (backupByKey.has(key)) return;
    items.push({
      id: key,
      address: current.address,
      name: current.name,
      status: 'missing_from_backup',
      changes: [],
    });
  });

  const secretConflicts = collectSecretConflicts(currentWallets, backupWallets);
  criticalConflicts += secretConflicts.filter(conflict => conflict.severity === 'critical').length;

  return {
    summary: {
      currentWallets: currentWallets.length,
      backupWallets: backupWallets.length,
      newInBackup: items.filter(item => item.status === 'new_in_backup').length,
      missingFromBackup: items.filter(item => item.status === 'missing_from_backup').length,
      unchanged: items.filter(item => item.status === 'unchanged').length,
      changed: items.filter(item => item.status === 'changed').length,
      tagChanged,
      folderChanged,
      duplicateSecrets: secretConflicts.length,
      addressDuplicates: buildAddressDuplicateCount([...currentWallets, ...backupWallets]),
      criticalConflicts,
    },
    items,
    secretConflicts,
  };
}