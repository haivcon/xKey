import { useState, useCallback, useMemo } from 'react';
import { hapticTap, hapticSuccess, hapticWarning } from '../utils/haptics';
import { saveWallets } from '../utils/storage';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useT } from '../contexts/LanguageContext';

/**
 * Hook for managing batch selection and bulk actions on wallets.
 */
export default function useBatchSelect(wallets, setWallets, filteredWallets, aesKey, isDecoyMode) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
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

  const toggleSelect = useCallback((wallet) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const id = wallet._id || wallet.address || JSON.stringify(wallet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    hapticTap();
  }, []);

  const selectAll = useCallback(() => {
    const ids = new Set(filteredWallets.map(w => w._id || w.address || JSON.stringify(w)));
    setSelectedIds(ids);
    hapticTap();
  }, [filteredWallets]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    hapticTap();
  }, []);

  const isSelected = useCallback((wallet) => {
    const id = wallet._id || wallet.address || JSON.stringify(wallet);
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectedCount = selectedIds.size;

  const selectedWallets = useMemo(() => {
    return filteredWallets.filter(w => {
      const id = w._id || w.address || JSON.stringify(w);
      return selectedIds.has(id);
    });
  }, [filteredWallets, selectedIds]);

  // --- Bulk Actions ---

  const persist = useCallback(async (updated) => {
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  }, [setWallets, aesKey, isDecoyMode]);

  const bulkDelete = useCallback(async () => {
    const ok = await showConfirm(
      t('batch.deleteConfirm', { count: selectedCount }) || `Delete ${selectedCount} selected wallets?`,
      { danger: true }
    );
    if (!ok) return;
    hapticWarning();
    const updated = wallets.filter(w => !isSelected(w));
    await persist(updated);
    showToast(t('batch.deleted', { count: selectedCount }) || `${selectedCount} wallets deleted`, 'info');
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [wallets, selectedCount, isSelected, persist, showConfirm, showToast, t]);

  const bulkMove = useCallback(async (targetFolder) => {
    const updated = wallets.map(w => isSelected(w) ? { ...w, groupId: targetFolder } : w);
    await persist(updated);
    hapticSuccess();
    showToast(t('batch.moved', { count: selectedCount, folder: targetFolder }) || `${selectedCount} wallets moved to ${targetFolder}`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [wallets, selectedCount, isSelected, persist, showToast, t]);

  const bulkTag = useCallback(async (tag) => {
    const updated = wallets.map(w => {
      if (!isSelected(w)) return w;
      const existing = w.tags || [];
      if (existing.includes(tag)) return w;
      return { ...w, tags: [...existing, tag] };
    });
    await persist(updated);
    hapticSuccess();
    showToast(t('batch.tagged', { count: selectedCount, tag }) || `Tagged ${selectedCount} wallets with "${tag}"`, 'success');
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [wallets, selectedCount, isSelected, persist, showToast, t]);

  const bulkPin = useCallback(async () => {
    const updated = wallets.map(w => isSelected(w) ? { ...w, pinned: true } : w);
    await persist(updated);
    hapticSuccess();
    showToast(t('batch.pinned', { count: selectedCount }) || `${selectedCount} wallets pinned`, 'success');
    setSelectedIds(new Set());
  }, [wallets, selectedCount, isSelected, persist, showToast, t]);

  return {
    selectionMode, toggleSelectionMode,
    selectedIds, selectedCount, selectedWallets,
    toggleSelect, selectAll, deselectAll, isSelected,
    bulkDelete, bulkMove, bulkTag, bulkPin,
  };
}
