import { useState, useMemo, useCallback } from 'react';
import { saveWallets } from '../utils/storage';
import { hapticTap } from '../utils/haptics';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useT } from '../contexts/LanguageContext';
import { parseAmount } from '../utils/amountFormat';

/**
 * Hook encapsulating all wallet CRUD operations.
 * Manages wallet state, folders, filtering, sorting, and mutations.
 */
export default function useWallets(aesKey, isDecoyMode) {
  const [wallets, setWallets] = useState([]);
  const [activeFolder, setActiveFolder] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('none');
  const [activeFilter, setActiveFilter] = useState('all');

  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();

  // Derived: folder list
  const folders = useMemo(
    () => ['All', ...new Set(wallets.map(w => w.groupId || 'Imported'))],
    [wallets]
  );

  // Derived: filtered & sorted wallets
  const filteredWallets = useMemo(() => wallets.filter(w => {
    if (activeFolder !== 'All' && (w.groupId || 'Imported') !== activeFolder) return false;
    const q = searchQuery.toLowerCase();
    const matchSearch = (w.name && w.name.toLowerCase().includes(q)) ||
      (w.address && w.address.toLowerCase().includes(q)) ||
      (w.notes && w.notes.toLowerCase().includes(q));
    if (!matchSearch) return false;
    if (activeFilter === 'hasPk') return !!w.privateKey;
    if (activeFilter === 'hasSeed') return !!w.seedPhrase;
    if (activeFilter === 'hasBalance') return parseAmount(w.balance) > 0;
    if (activeFilter === 'empty') return parseAmount(w.balance) === 0;
    if (activeFilter === 'pinned') return !!w.pinned;
    if (activeFilter.startsWith('net:')) return (w.network || 'ETH') === activeFilter.slice(4);
    if (activeFilter.startsWith('tag:')) return (w.tags || []).includes(activeFilter.slice(4));
    return true;
  }).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    switch (sortOrder) {
      case 'name-asc': return (a.name || '').localeCompare(b.name || '');
      case 'name-desc': return (b.name || '').localeCompare(a.name || '');
      case 'date-desc': return (b.createdAt || 0) - (a.createdAt || 0);
      case 'date-asc': return (a.createdAt || 0) - (b.createdAt || 0);
      case 'balance-desc': return parseAmount(b.balance) - parseAmount(a.balance);
      case 'balance-asc': return parseAmount(a.balance) - parseAmount(b.balance);
      case 'address-asc': return (a.address || '').localeCompare(b.address || '');
      case 'custom': return 0; // preserve array order for manual drag
      default: return 0;
    }
  }), [wallets, activeFolder, searchQuery, activeFilter, sortOrder]);

  // Derived: total balance of filtered wallets
  const totalBalance = useMemo(() => filteredWallets.reduce((acc, w) => {
    return acc + parseAmount(w.balance);
  }, 0), [filteredWallets]);

  // Derived: all unique tags across wallets
  const allTags = useMemo(() => {
    const tagSet = new Set();
    wallets.forEach(w => (w.tags || []).forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }, [wallets]);

  // Derived: duplicate address count
  const duplicateCount = useMemo(() => {
    const map = new Map();
    wallets.forEach(w => {
      if (!w.address) return;
      const key = w.address.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    let groups = 0;
    for (const count of map.values()) {
      if (count > 1) groups++;
    }
    return groups;
  }, [wallets]);

  // --- Mutations ---

  const persist = useCallback(async (updated) => {
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  }, [aesKey, isDecoyMode]);

  const handleDeleteWallet = useCallback(async (walletToDelete) => {
    const ok = await showConfirm(t('home.deleteWalletConfirm', { name: walletToDelete.name || walletToDelete.address?.substring(0, 10) }));
    if (!ok) return;
    const updated = wallets.filter(w => {
      if (walletToDelete._id && w._id) return w._id !== walletToDelete._id;
      return !(w.address === walletToDelete.address && w.name === walletToDelete.name && w.groupId === walletToDelete.groupId);
    });
    await persist(updated);
    showToast(t('home.walletDeleted'), 'info');
  }, [wallets, persist, showConfirm, showToast, t]);

  const handleDeleteWalletDirect = useCallback(async (walletToDelete) => {
    const updated = wallets.filter(w => {
      if (walletToDelete._id && w._id) return w._id !== walletToDelete._id;
      return !(w.address === walletToDelete.address && w.name === walletToDelete.name && w.groupId === walletToDelete.groupId);
    });
    await persist(updated);
    showToast(t('home.walletDeleted'), 'info');
  }, [wallets, persist, showToast, t]);

  const handleDeleteFolder = useCallback(async (folderName) => {
    const ok = await showConfirm(t('home.deleteFolderConfirm', { name: folderName }), { danger: true });
    if (!ok) return;
    const updated = wallets.filter(w => (w.groupId || 'Imported') !== folderName);
    await persist(updated);
    setActiveFolder('All');
    showToast(t('home.folderDeleted', { name: folderName }), 'info');
  }, [wallets, persist, showConfirm, showToast, t]);

  const handleRenameFolder = useCallback(async (oldName, newName) => {
    if (!newName || newName === oldName) return;
    const updated = wallets.map(w => (w.groupId || 'Imported') === oldName ? { ...w, groupId: newName } : w);
    await persist(updated);
    if (activeFolder === oldName) setActiveFolder(newName);
  }, [wallets, persist, activeFolder]);

  const handleRenameWallet = useCallback(async (wallet, newName) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, name: newName } : w;
      return (w.address === wallet.address && w.groupId === wallet.groupId) ? { ...w, name: newName } : w;
    });
    await persist(updated);
  }, [wallets, persist]);

  const handleEditWallet = useCallback(async (wallet, updatedFields) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, ...updatedFields } : w;
      return (w === wallet) ? { ...w, ...updatedFields } : w;
    });
    await persist(updated);
    showToast(t('walletCard.saved'), 'success');
  }, [wallets, persist, showToast, t]);

  const handleBulkNetworkChange = useCallback(async (newNetwork) => {
    const filterSet = new Set(filteredWallets);
    const updated = wallets.map(w => filterSet.has(w) ? { ...w, network: newNetwork } : w);
    await persist(updated);
    showToast(t('common.updatedNetwork', { count: filteredWallets.length }) || `Updated network for ${filteredWallets.length} wallets`, 'success');
  }, [wallets, filteredWallets, persist, showToast, t]);

  const handleSaveWallet = useCallback(async (newWalletData) => {
    const newWalletsArr = Array.isArray(newWalletData) ? newWalletData : [newWalletData];
    const folder = activeFolder !== 'All' ? activeFolder : 'Created';
    const processed = newWalletsArr.map(w => ({
      ...w,
      groupId: w.groupId || folder,
      network: w.network || 'ETH',
      pinned: false,
      createdAt: w.createdAt || Date.now()
    }));
    const updated = [...processed, ...wallets];
    await persist(updated);
  }, [wallets, persist, activeFolder]);

  const handleTogglePin = useCallback(async (wallet) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, pinned: !w.pinned } : w;
      return (w === wallet) ? { ...w, pinned: !w.pinned } : w;
    });
    await persist(updated);
    hapticTap();
  }, [wallets, persist]);

  const handleMoveWallet = useCallback(async (wallet, newFolder) => {
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, groupId: newFolder } : w;
      return (w === wallet) ? { ...w, groupId: newFolder } : w;
    });
    await persist(updated);
    showToast(t('home.movedToFolder', { folder: newFolder }), 'success');
  }, [wallets, persist, showToast, t]);

  const handleReorderWallet = useCallback(async (oldIndex, newIndex) => {
    // Reorder within the full wallets array based on filteredWallets positions
    const movedWallet = filteredWallets[oldIndex];
    const targetWallet = filteredWallets[newIndex];
    if (!movedWallet || !targetWallet) return;

    const fullOldIdx = wallets.indexOf(movedWallet);
    const fullNewIdx = wallets.indexOf(targetWallet);
    if (fullOldIdx === -1 || fullNewIdx === -1) return;

    const updated = [...wallets];
    updated.splice(fullOldIdx, 1);
    updated.splice(fullNewIdx, 0, movedWallet);
    await persist(updated);
    hapticTap();
  }, [wallets, filteredWallets, persist]);

  return {
    wallets, setWallets,
    activeFolder, setActiveFolder,
    searchQuery, setSearchQuery,
    sortOrder, setSortOrder,
    activeFilter, setActiveFilter,
    folders, filteredWallets, totalBalance, duplicateCount, allTags,
    handleDeleteWallet, handleDeleteWalletDirect,
    handleDeleteFolder, handleRenameFolder,
    handleRenameWallet, handleEditWallet,
    handleBulkNetworkChange, handleSaveWallet,
    handleTogglePin, handleMoveWallet, handleReorderWallet,
  };
}
