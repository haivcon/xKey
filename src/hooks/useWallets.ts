import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Preferences } from '@capacitor/preferences';
import { decryptSetting, encryptSetting, saveWallets } from '../utils/storage';
import { hapticTap } from '../utils/haptics';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useT } from '../contexts/LanguageContext';
import { parseAmount } from '../utils/amountFormat';
import type { Wallet } from '../types';

const CUSTOM_FOLDERS_KEY = 'xkey_custom_folders';
const DECOY_CUSTOM_FOLDERS_KEY = 'xkey_decoy_custom_folders';
const PINNED_FOLDERS_KEY = 'xkey_pinned_folders';
const DECOY_PINNED_FOLDERS_KEY = 'xkey_decoy_pinned_folders';
const DEFAULT_FOLDER_KEY = 'xkey_default_folder';
const DECOY_DEFAULT_FOLDER_KEY = 'xkey_decoy_default_folder';
const NEW_WALLET_BADGE_MS = 24 * 60 * 60 * 1000;

type XKeyWallet = Wallet & {
  isNew?: boolean;
  newUntil?: number;
};

type ToastType = 'info' | 'success' | 'warning' | 'error' | string;

type UseWalletsResult = {
  wallets: XKeyWallet[];
  setWallets: Dispatch<SetStateAction<XKeyWallet[]>>;
  activeFolder: string;
  setActiveFolder: Dispatch<SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  sortOrder: string;
  setSortOrder: Dispatch<SetStateAction<string>>;
  activeFilter: string;
  setActiveFilter: Dispatch<SetStateAction<string>>;
  folders: string[];
  pinnedFolders: string[];
  defaultFolder: string;
  filteredWallets: XKeyWallet[];
  totalBalance: number;
  duplicateCount: number;
  allTags: string[];
  handleDeleteWallet: (wallet: XKeyWallet) => Promise<void>;
  handleDeleteWalletDirect: (wallet: XKeyWallet) => Promise<void>;
  handleDeleteFolder: (folderName: string) => Promise<void>;
  handleRemoveFolderOnly: (folderName: string) => Promise<void>;
  handleRenameFolder: (oldName: string, newName: string) => Promise<void>;
  handleRenameWallet: (wallet: XKeyWallet, newName: string) => Promise<void>;
  handleEditWallet: (wallet: XKeyWallet, updatedFields: Partial<XKeyWallet>) => Promise<void>;
  handleBulkNetworkChange: (newNetwork: string) => Promise<void>;
  handleCreateFolder: (folderName: string) => Promise<boolean>;
  handleSaveWallet: (newWalletData: Partial<XKeyWallet> | Array<Partial<XKeyWallet>>) => Promise<XKeyWallet[]>;
  handleToggleFolderPin: (folderName: string) => Promise<void>;
  handleSetDefaultFolder: (folderName: string) => Promise<void>;
  handleReorderFolder: (fromFolder: string, toFolder: string) => Promise<void>;
  handleTogglePin: (wallet: XKeyWallet) => Promise<void>;
  handleMoveWallet: (wallet: XKeyWallet, newFolder: string) => Promise<void>;
  handleReorderWallet: (oldIndex: number, newIndex: number) => Promise<void>;
};

/**
 * Hook encapsulating all wallet CRUD operations.
 * Manages wallet state, folders, filtering, sorting, and mutations.
 */
export default function useWallets(aesKey: string | null, isDecoyMode: boolean): UseWalletsResult {
  const [wallets, setWallets] = useState<XKeyWallet[]>([]);
  const [activeFolder, setActiveFolder] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('none');
  const [activeFilter, setActiveFilter] = useState('all');
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);
  const [defaultFolder, setDefaultFolder] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();

  useEffect(() => {
    const storageKey = isDecoyMode ? DECOY_CUSTOM_FOLDERS_KEY : CUSTOM_FOLDERS_KEY;
    const pinnedKey = isDecoyMode ? DECOY_PINNED_FOLDERS_KEY : PINNED_FOLDERS_KEY;
    const defaultKey = isDecoyMode ? DECOY_DEFAULT_FOLDER_KEY : DEFAULT_FOLDER_KEY;
    if (!aesKey) return;
    setCustomFolders([]);
    setPinnedFolders([]);
    setDefaultFolder('');

    Promise.all([
      Preferences.get({ key: storageKey }),
      Preferences.get({ key: pinnedKey }),
      Preferences.get({ key: defaultKey }),
    ])
      .then(([{ value }, { value: pinnedValue }, { value: defaultValue }]) => {
        if (!value) {
          setCustomFolders([]);
        } else {
          const decoded = decryptSetting(value, aesKey);
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed)) {
            setCustomFolders(parsed.filter(Boolean).map(String));
          }
        }

        if (pinnedValue) {
          const decodedPinned = decryptSetting(pinnedValue, aesKey);
          const parsedPinned = JSON.parse(decodedPinned);
          if (Array.isArray(parsedPinned)) {
            setPinnedFolders(parsedPinned.filter(Boolean).map(String));
          }
        }

        setDefaultFolder(decryptSetting(defaultValue, aesKey) || '');
      })
      .catch(() => {
        setCustomFolders([]);
        setPinnedFolders([]);
        setDefaultFolder('');
      });
  }, [aesKey, isDecoyMode]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const persistCustomFolders = useCallback(async (nextFolders: string[]) => {
    const normalized = [...new Set(nextFolders.map(f => String(f || '').trim()).filter(Boolean))];
    setCustomFolders(normalized);
    const storageKey = isDecoyMode ? DECOY_CUSTOM_FOLDERS_KEY : CUSTOM_FOLDERS_KEY;
    await Preferences.set({ key: storageKey, value: encryptSetting(JSON.stringify(normalized), aesKey) });
    return normalized;
  }, [aesKey, isDecoyMode]);

  const persistPinnedFolders = useCallback(async (nextFolders: string[]) => {
    const normalized = [...new Set(nextFolders.map(f => String(f || '').trim()).filter(f => f && f !== 'All'))];
    setPinnedFolders(normalized);
    const storageKey = isDecoyMode ? DECOY_PINNED_FOLDERS_KEY : PINNED_FOLDERS_KEY;
    await Preferences.set({ key: storageKey, value: encryptSetting(JSON.stringify(normalized), aesKey) });
    return normalized;
  }, [aesKey, isDecoyMode]);

  const persistDefaultFolder = useCallback(async (folderName: string) => {
    const next = String(folderName || '').trim();
    setDefaultFolder(next);
    const storageKey = isDecoyMode ? DECOY_DEFAULT_FOLDER_KEY : DEFAULT_FOLDER_KEY;
    if (!next) {
      await Preferences.remove({ key: storageKey });
      return '';
    }
    await Preferences.set({ key: storageKey, value: encryptSetting(next, aesKey) });
    return next;
  }, [aesKey, isDecoyMode]);

  // Derived: folder list
  const folders = useMemo(() => {
    const names = [...new Set([...customFolders, ...wallets.map(w => w.groupId || 'Imported')])];
    const pinned = pinnedFolders.filter(f => names.includes(f));
    const rest = names.filter(f => !pinned.includes(f));
    return ['All', ...pinned, ...rest];
  }, [wallets, customFolders, pinnedFolders]);

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
    if (activeFilter === 'new') return !!w.newUntil && w.newUntil > nowTick;
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
  }), [wallets, activeFolder, searchQuery, activeFilter, sortOrder, nowTick]);

  // Derived: total balance of filtered wallets
  const totalBalance = useMemo(() => filteredWallets.reduce((acc, w) => {
    return acc + parseAmount(w.balance);
  }, 0), [filteredWallets]);

  // Derived: all unique tags across wallets
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
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

  const persist = useCallback(async (updated: XKeyWallet[]) => {
    setWallets(updated);
    await saveWallets(updated, aesKey, isDecoyMode);
  }, [aesKey, isDecoyMode]);

  const showUndoToast = useCallback((message: string, previousWallets: XKeyWallet[], type: ToastType = 'info') => {
    showToast(message, type, 8000, {
      label: t('common.undo'),
      onClick: async () => {
        await persist(previousWallets);
        showToast(t('home.undoRestored'), 'success');
      }
    });
  }, [persist, showToast, t]);

  const handleDeleteWallet = useCallback(async (walletToDelete: XKeyWallet) => {
    const ok = await showConfirm(t('home.deleteWalletConfirm', { name: walletToDelete.name || walletToDelete.address?.substring(0, 10) }));
    if (!ok) return;
    const previousWallets = wallets;
    const updated = wallets.filter(w => {
      if (walletToDelete._id && w._id) return w._id !== walletToDelete._id;
      return !(w.address === walletToDelete.address && w.name === walletToDelete.name && w.groupId === walletToDelete.groupId);
    });
    await persist(updated);
    showUndoToast(t('home.walletDeleted'), previousWallets);
  }, [wallets, persist, showConfirm, showUndoToast, t]);

  const handleDeleteWalletDirect = useCallback(async (walletToDelete: XKeyWallet) => {
    const previousWallets = wallets;
    const updated = wallets.filter(w => {
      if (walletToDelete._id && w._id) return w._id !== walletToDelete._id;
      return !(w.address === walletToDelete.address && w.name === walletToDelete.name && w.groupId === walletToDelete.groupId);
    });
    await persist(updated);
    showUndoToast(t('home.walletDeleted'), previousWallets);
  }, [wallets, persist, showUndoToast, t]);

  const handleDeleteFolder = useCallback(async (folderName: string) => {
    const count = wallets.filter(w => (w.groupId || 'Imported') === folderName).length;
    const ok = await showConfirm(t('home.deleteFolderConfirm', { name: folderName, count }), { danger: true });
    if (!ok) return;
    const updated = wallets.filter(w => (w.groupId || 'Imported') !== folderName);
    await Promise.all([
      persist(updated),
      persistCustomFolders(customFolders.filter(f => f !== folderName)),
      persistPinnedFolders(pinnedFolders.filter(f => f !== folderName)),
      defaultFolder === folderName ? persistDefaultFolder('') : Promise.resolve()
    ]);
    setActiveFolder('All');
    showToast(t('home.folderDeleted', { name: folderName }), 'info');
  }, [wallets, persist, persistCustomFolders, persistPinnedFolders, persistDefaultFolder, customFolders, pinnedFolders, defaultFolder, showConfirm, showToast, t]);

  const handleRemoveFolderOnly = useCallback(async (folderName: string) => {
    const count = wallets.filter(w => (w.groupId || 'Imported') === folderName).length;
    const ok = await showConfirm(t('home.removeFolderOnlyConfirm', { name: folderName, count }));
    if (!ok) return;
    const updated = wallets.map(w => (w.groupId || 'Imported') === folderName ? { ...w, groupId: 'Created' } : w);
    await Promise.all([
      persist(updated),
      persistCustomFolders(customFolders.filter(f => f !== folderName)),
      persistPinnedFolders(pinnedFolders.filter(f => f !== folderName)),
      defaultFolder === folderName ? persistDefaultFolder('') : Promise.resolve()
    ]);
    setActiveFolder('Created');
    showToast(t('home.folderRemovedOnly', { name: folderName }), 'success');
  }, [wallets, persist, persistCustomFolders, persistPinnedFolders, persistDefaultFolder, customFolders, pinnedFolders, defaultFolder, showConfirm, showToast, t]);

  const handleRenameFolder = useCallback(async (oldName: string, newName: string) => {
    const trimmed = String(newName || '').trim();
    if (!trimmed || trimmed === oldName || trimmed === 'All') return;
    if (folders.some(f => f !== oldName && f.toLowerCase() === trimmed.toLowerCase())) {
      showToast(t('home.folderExists', { name: trimmed }), 'warning');
      return;
    }
    const updated = wallets.map(w => (w.groupId || 'Imported') === oldName ? { ...w, groupId: trimmed } : w);
    const renamedCustomFolders = customFolders.map(f => f === oldName ? trimmed : f);
    if (!renamedCustomFolders.includes(trimmed) && wallets.every(w => (w.groupId || 'Imported') !== oldName)) {
      renamedCustomFolders.push(trimmed);
    }
    await Promise.all([
      persist(updated),
      persistCustomFolders(renamedCustomFolders)
    ]);
    await persistPinnedFolders(pinnedFolders.map(f => f === oldName ? trimmed : f));
    if (defaultFolder === oldName) await persistDefaultFolder(trimmed);
    if (activeFolder === oldName) setActiveFolder(trimmed);
  }, [wallets, persist, persistCustomFolders, persistPinnedFolders, persistDefaultFolder, customFolders, pinnedFolders, defaultFolder, activeFolder, folders, showToast, t]);

  const handleCreateFolder = useCallback(async (folderName: string) => {
    const trimmed = String(folderName || '').trim();
    if (!trimmed || trimmed === 'All') {
      showToast(t('home.folderInvalid'), 'warning');
      return false;
    }
    if (folders.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      showToast(t('home.folderExists', { name: trimmed }), 'warning');
      return false;
    }
    await persistCustomFolders([...customFolders, trimmed]);
    setActiveFolder(trimmed);
    showToast(t('home.folderCreated', { name: trimmed }), 'success');
    return true;
  }, [folders, customFolders, persistCustomFolders, showToast, t]);

  const handleToggleFolderPin = useCallback(async (folderName: string) => {
    if (!folderName || folderName === 'All') return;
    const next = pinnedFolders.includes(folderName)
      ? pinnedFolders.filter(f => f !== folderName)
      : [...pinnedFolders, folderName];
    await persistPinnedFolders(next);
  }, [pinnedFolders, persistPinnedFolders]);

  const handleSetDefaultFolder = useCallback(async (folderName: string) => {
    if (!folderName || folderName === 'All') {
      await persistDefaultFolder('');
      showToast(t('home.defaultFolderCleared'), 'info');
      return;
    }
    await persistDefaultFolder(folderName);
    showToast(t('home.defaultFolderSet', { name: folderName }), 'success');
  }, [persistDefaultFolder, showToast, t]);

  const handleReorderFolder = useCallback(async (fromFolder: string, toFolder: string) => {
    if (!fromFolder || !toFolder || fromFolder === toFolder || fromFolder === 'All' || toFolder === 'All') return;
    const ordered = folders.filter(f => f !== 'All');
    const fromIndex = ordered.indexOf(fromFolder);
    const toIndex = ordered.indexOf(toFolder);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    await persistCustomFolders(next);
  }, [folders, persistCustomFolders]);

  const handleRenameWallet = useCallback(async (wallet: XKeyWallet, newName: string) => {
    const previousWallets = wallets;
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, name: newName } : w;
      return (w.address === wallet.address && w.groupId === wallet.groupId) ? { ...w, name: newName } : w;
    });
    await persist(updated);
    showUndoToast(t('walletCard.saved'), previousWallets, 'success');
  }, [wallets, persist, showUndoToast, t]);

  const handleEditWallet = useCallback(async (wallet: XKeyWallet, updatedFields: Partial<XKeyWallet>) => {
    const previousWallets = wallets;
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, ...updatedFields } : w;
      return (w === wallet) ? { ...w, ...updatedFields } : w;
    });
    await persist(updated);
    showUndoToast(t('walletCard.saved'), previousWallets, 'success');
  }, [wallets, persist, showUndoToast, t]);

  const handleBulkNetworkChange = useCallback(async (newNetwork: string) => {
    const previousWallets = wallets;
    const filterSet = new Set(filteredWallets);
    const updated = wallets.map(w => filterSet.has(w) ? { ...w, network: newNetwork } : w);
    await persist(updated);
    showUndoToast(t('common.updatedNetwork', { count: filteredWallets.length }) || `Updated network for ${filteredWallets.length} wallets`, previousWallets, 'success');
  }, [wallets, filteredWallets, persist, showUndoToast, t]);

  const handleSaveWallet = useCallback(async (newWalletData: Partial<XKeyWallet> | Array<Partial<XKeyWallet>>) => {
    const newWalletsArr = Array.isArray(newWalletData) ? newWalletData : [newWalletData];
    const folder = activeFolder !== 'All' ? activeFolder : (defaultFolder || 'Created');
    const now = Date.now();
    const processed: XKeyWallet[] = newWalletsArr.map(w => ({
      ...w,
      groupId: w.groupId || folder,
      network: w.network || 'ETH',
      pinned: false,
      createdAt: w.createdAt || now,
      isNew: true,
      newUntil: now + NEW_WALLET_BADGE_MS
    }));
    const updated = [...processed, ...wallets];
    await persist(updated);
    return processed;
  }, [wallets, persist, activeFolder, defaultFolder]);

  const handleTogglePin = useCallback(async (wallet: XKeyWallet) => {
    const previousWallets = wallets;
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, pinned: !w.pinned } : w;
      return (w === wallet) ? { ...w, pinned: !w.pinned } : w;
    });
    await persist(updated);
    showUndoToast(t('walletCard.saved'), previousWallets, 'success');
    hapticTap();
  }, [wallets, persist, showUndoToast, t]);

  const handleMoveWallet = useCallback(async (wallet: XKeyWallet, newFolder: string) => {
    const targetFolder = String(newFolder || '').trim();
    if (!targetFolder) return;
    const previousWallets = wallets;
    const updated = wallets.map(w => {
      if (wallet._id && w._id) return w._id === wallet._id ? { ...w, groupId: targetFolder } : w;
      return (w === wallet) ? { ...w, groupId: targetFolder } : w;
    });
    const shouldRememberFolder = !folders.some(f => f.toLowerCase() === targetFolder.toLowerCase());
    await Promise.all([
      persist(updated),
      shouldRememberFolder ? persistCustomFolders([...customFolders, targetFolder]) : Promise.resolve()
    ]);
    showUndoToast(t('home.movedToFolder', { folder: targetFolder }), previousWallets, 'success');
  }, [wallets, persist, folders, customFolders, persistCustomFolders, showUndoToast, t]);

  const handleReorderWallet = useCallback(async (oldIndex: number, newIndex: number) => {
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
    folders, pinnedFolders, defaultFolder, filteredWallets, totalBalance, duplicateCount, allTags,
    handleDeleteWallet, handleDeleteWalletDirect,
    handleDeleteFolder, handleRemoveFolderOnly, handleRenameFolder,
    handleRenameWallet, handleEditWallet,
    handleBulkNetworkChange, handleCreateFolder, handleSaveWallet,
    handleToggleFolderPin, handleSetDefaultFolder, handleReorderFolder,
    handleTogglePin, handleMoveWallet, handleReorderWallet,
  };
}
