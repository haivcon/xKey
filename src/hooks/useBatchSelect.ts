import { useState, useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Wallet } from '../types';
import { hapticTap, hapticSuccess, hapticWarning } from '../utils/haptics';
import { saveWallets } from '../utils/storage';
import { createEncryptedVaultSnapshot } from '../utils/vaultSnapshot';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useT } from '../contexts/LanguageContext';

/**
 * Hook for managing batch selection and bulk actions on wallets.
 */
type WalletId = string;

type UseBatchSelectResult = {
  selectionMode: boolean;
  toggleSelectionMode: () => void;
  selectedIds: Set<WalletId>;
  selectedCount: number;
  selectedWallets: Wallet[];
  toggleSelect: (wallet: Wallet) => void;
  selectAll: () => void;
  deselectAll: () => void;
  isSelected: (wallet: Wallet) => boolean;
  bulkDelete: () => Promise<void>;
  bulkMove: (targetFolder: string) => Promise<void>;
  bulkTag: (tag: string) => Promise<void>;
  bulkPin: () => Promise<void>;
};

const getWalletId = (wallet: Wallet): WalletId => wallet._id || wallet.address || JSON.stringify(wallet);

export default function useBatchSelect(
  wallets: Wallet[],
  setWallets: Dispatch<SetStateAction<Wallet[]>>,
  filteredWallets: Wallet[],
  aesKey: string | null,
  isDecoyMode: boolean,
): UseBatchSelectResult {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<WalletId>>(new Set());
  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) setSelectedIds(new Set()); // Clear on exit
      return !prev;
    });
    hapticTap();
  }, []);

  const toggleSelect = useCallback((wallet: Wallet) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const id = getWalletId(wallet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    hapticTap();
  }, []);

  const selectAll = useCallback(() => {
    const ids = new Set(filteredWallets.map(getWalletId));
    setSelectedIds(ids);
    hapticTap();
  }, [filteredWallets]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    hapticTap();
  }, []);

  const isSelected = useCallback((wallet: Wallet) => {
    const id = getWalletId(wallet);
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectedCount = selectedIds.size;

  const selectedWallets = useMemo(() => {
    return filteredWallets.filter(w => {
      const id = getWalletId(w);
      return selectedIds.has(id);
    });
  }, [filteredWallets, selectedIds]);

  // --- Bulk Actions ---

  const persist = useCallback(async (updated: Wallet[]) => {
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  }, [setWallets, aesKey, isDecoyMode]);

  const bulkDelete = useCallback(async () => {
    const ok = await showConfirm(
      t('batch.deleteConfirm', { count: selectedCount }),
      { danger: true }
    );
    if (!ok) return;
    hapticWarning();
    const updated = wallets.filter(w => !isSelected(w));
    await createEncryptedVaultSnapshot(wallets, aesKey, {
      operation: 'batch-delete',
      reason: `batch_delete:${selectedCount}`,
    });
    await persist(updated);
    showToast({ key: 'batch.deleted', vars: { count: selectedCount }, category: 'data' }, 'info');
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [wallets, selectedCount, isSelected, persist, showConfirm, showToast, t, aesKey]);

  const bulkMove = useCallback(async (targetFolder: string) => {
    const updated = wallets.map(w => isSelected(w) ? { ...w, groupId: targetFolder } : w);
    await persist(updated);
    hapticSuccess();
    showToast({ key: 'batch.moved', vars: { count: selectedCount, folder: targetFolder }, category: 'data' }, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [wallets, selectedCount, isSelected, persist, showToast]);

  const bulkTag = useCallback(async (tag: string) => {
    const updated = wallets.map(w => {
      if (!isSelected(w)) return w;
      const existing = w.tags || [];
      if (existing.includes(tag)) return w;
      return { ...w, tags: [...existing, tag] };
    });
    await persist(updated);
    hapticSuccess();
    showToast({ key: 'batch.tagged', vars: { count: selectedCount, tag }, category: 'data' }, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [wallets, selectedCount, isSelected, persist, showToast]);

  const bulkPin = useCallback(async () => {
    const updated = wallets.map(w => isSelected(w) ? { ...w, pinned: true } : w);
    await persist(updated);
    hapticSuccess();
    showToast({ key: 'batch.pinned', vars: { count: selectedCount }, category: 'data' }, 'success');
    setSelectedIds(new Set());
  }, [wallets, selectedCount, isSelected, persist, showToast]);

  return {
    selectionMode, toggleSelectionMode,
    selectedIds, selectedCount, selectedWallets,
    toggleSelect, selectAll, deselectAll, isSelected,
    bulkDelete, bulkMove, bulkTag, bulkPin,
  };
}
