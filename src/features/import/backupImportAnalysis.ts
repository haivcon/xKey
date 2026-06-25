import type { Wallet } from '../../types';

export type BackupImportAnalysis = {
  total: number;
  newWallets: number;
  duplicates: number;
  changed: number;
  missingSensitive: number;
  sensitive: number;
};

export function fingerprintBackupWallet(wallet: Wallet): string {
  return JSON.stringify({
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
}

export function analyzeBackupImport(existingWallets: Wallet[], backupWallets: Wallet[]): BackupImportAnalysis {
  const existing = new Map(
    existingWallets
      .map(wallet => [wallet.address?.toLowerCase(), fingerprintBackupWallet(wallet)])
      .filter(([address]) => Boolean(address)) as [string, string][],
  );

  const duplicates = backupWallets.filter(wallet => !!wallet.address && existing.has(wallet.address.toLowerCase())).length;
  const changed = backupWallets.filter(wallet => {
    if (!wallet.address) return false;
    const current = existing.get(wallet.address.toLowerCase());
    return Boolean(current && current !== fingerprintBackupWallet(wallet));
  }).length;
  const missingSensitive = backupWallets.filter(wallet => !wallet.privateKey && !wallet.seedPhrase).length;
  const sensitive = backupWallets.filter(wallet => !!wallet.privateKey || !!wallet.seedPhrase).length;

  return {
    total: backupWallets.length,
    duplicates,
    changed,
    missingSensitive,
    newWallets: backupWallets.length - duplicates,
    sensitive,
  };
}