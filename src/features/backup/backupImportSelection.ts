import type { Wallet } from '../../types';

export type BackupImportSelectionSummary = {
  totalWallets: number;
  selectedWallets: number;
  folders: Array<{ name: string; count: number; selectedCount: number }>;
  tags: Array<{ name: string; count: number; selectedCount: number }>;
};

export const getBackupWalletSelectionId = (wallet: Wallet, index: number): string => {
  const address = String(wallet.address || '').trim().toLowerCase();
  if (address) return `address:${address}`;
  const id = String(wallet._id || '').trim();
  if (id) return `id:${id}`;
  return `index:${index}`;
};

export const getBackupWalletFolderName = (wallet: Wallet): string => (
  String(wallet.groupId || 'Imported').trim() || 'Imported'
);

export const createAllBackupWalletSelection = (wallets: Wallet[]): string[] => (
  wallets.map((wallet, index) => getBackupWalletSelectionId(wallet, index))
);

export const filterBackupWalletsBySelection = (wallets: Wallet[], selectedIds: string[]): Wallet[] => {
  const selectedSet = new Set(selectedIds);
  return wallets.filter((wallet, index) => selectedSet.has(getBackupWalletSelectionId(wallet, index)));
};

export const buildBackupImportSelectionSummary = (
  wallets: Wallet[],
  selectedIds: string[],
): BackupImportSelectionSummary => {
  const selectedSet = new Set(selectedIds);
  const folderMap = new Map<string, { count: number; selectedCount: number }>();
  const tagMap = new Map<string, { count: number; selectedCount: number }>();

  wallets.forEach((wallet, index) => {
    const walletId = getBackupWalletSelectionId(wallet, index);
    const selected = selectedSet.has(walletId);
    const folderName = getBackupWalletFolderName(wallet);
    const folder = folderMap.get(folderName) || { count: 0, selectedCount: 0 };
    folder.count += 1;
    if (selected) folder.selectedCount += 1;
    folderMap.set(folderName, folder);

    (wallet.tags || []).forEach((rawTag) => {
      const tagName = String(rawTag).trim().toLowerCase();
      if (!tagName) return;
      const tag = tagMap.get(tagName) || { count: 0, selectedCount: 0 };
      tag.count += 1;
      if (selected) tag.selectedCount += 1;
      tagMap.set(tagName, tag);
    });
  });

  return {
    totalWallets: wallets.length,
    selectedWallets: selectedIds.length,
    folders: Array.from(folderMap.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tags: Array.from(tagMap.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
};

export const getBackupSelectionIdsByFolder = (wallets: Wallet[], folderName: string): string[] => (
  wallets
    .map((wallet, index) => ({ wallet, id: getBackupWalletSelectionId(wallet, index) }))
    .filter(({ wallet }) => getBackupWalletFolderName(wallet) === folderName)
    .map(({ id }) => id)
);

export const getBackupSelectionIdsByTag = (wallets: Wallet[], tagName: string): string[] => {
  const normalizedTag = tagName.trim().toLowerCase();
  return wallets
    .map((wallet, index) => ({ wallet, id: getBackupWalletSelectionId(wallet, index) }))
    .filter(({ wallet }) => (wallet.tags || []).map(tag => String(tag).trim().toLowerCase()).includes(normalizedTag))
    .map(({ id }) => id);
};