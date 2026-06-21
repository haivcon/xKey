import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Folder, FolderMinus, FolderPlus, MoreHorizontal, Pencil, Search, Star, Trash2, X } from 'lucide-react';
import type { DragEvent, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import type { Wallet } from '../types';
import type { TranslationFn } from '../contexts/LanguageContext';

type FolderTabsVariant = 'tabs' | 'sidebar';
type OpenFolderMenuState = {
  folder: string;
  anchor: HTMLButtonElement;
  left: number;
  top: number;
};
type FolderTabsProps = {
  folders: string[];
  activeFolder: string;
  wallets: Wallet[];
  editingFolder?: string | null;
  editFolderName?: string;
  onSelectFolder: (folder: string) => void;
  onStartEdit: (folder: string) => void;
  onEditChange: (value: string) => void;
  onFinishEdit: (oldName: string, newName: string) => void;
  onDeleteFolder: (folder: string) => void;
  onRemoveFolderOnly?: (folder: string) => void;
  onTogglePinFolder?: (folder: string) => void;
  onSetDefaultFolder?: (folder: string) => void;
  onExportFolder?: (folder: string) => void;
  onReorderFolder?: (from: string, to: string) => void;
  pinnedFolders?: string[];
  defaultFolder?: string;
  creatingFolder?: boolean;
  newFolderName?: string;
  onStartCreate?: () => void;
  onCreateChange: (value: string) => void;
  onFinishCreate: (name: string) => void;
  createFolderLabel?: string;
  t?: TranslationFn;
  variant?: FolderTabsVariant;
};

export default function FolderTabs({
  folders, activeFolder, wallets,
  editingFolder, editFolderName,
  onSelectFolder, onStartEdit, onEditChange, onFinishEdit, onDeleteFolder,
  onRemoveFolderOnly, onTogglePinFolder, onSetDefaultFolder, onExportFolder, onReorderFolder,
  pinnedFolders = [], defaultFolder = '',
  creatingFolder, newFolderName, onStartCreate, onCreateChange, onFinishCreate,
  createFolderLabel = 'Create folder',
  t = (key: string) => key,
  variant = 'tabs'
}: FolderTabsProps) {
  const [openMenu, setOpenMenu] = useState<OpenFolderMenuState | null>(null);
  const [folderQuery, setFolderQuery] = useState('');
  const [dragFolder, setDragFolder] = useState<string | null>(null);
  const isSidebar = variant === 'sidebar';
  const draftCreateName = newFolderName || '';
  const draftEditName = editFolderName || '';
  const finishCreate = () => {
    if (!creatingFolder) return;
    onFinishCreate(draftCreateName);
  };
  const cancelCreate = () => onFinishCreate('');
  const canCreate = String(newFolderName || '').trim().length > 0;
  const inputClass = isSidebar
    ? 'min-w-0 flex-1 bg-surface-800 border border-brand-500 text-white text-sm px-3 py-2 rounded-lg outline-none'
    : 'min-w-0 flex-1 bg-surface-800 border border-brand-500 text-white text-sm px-3 py-2 rounded-full outline-none';
  const showFolderSearch = folders.length > 6;
  const visibleFolders = useMemo(() => {
    const q = folderQuery.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(folder => folder === 'All' || folder.toLowerCase().includes(q));
  }, [folders, folderQuery]);
  const folderAccent = (name: string) => {
    const accents = [
      'text-cyan-300 bg-cyan-500/10',
      'text-emerald-300 bg-emerald-500/10',
      'text-fuchsia-300 bg-fuchsia-500/10',
      'text-amber-300 bg-amber-500/10',
      'text-sky-300 bg-sky-500/10',
      'text-violet-300 bg-violet-500/10',
    ];
    const sum = Array.from(name || '').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return accents[sum % accents.length];
  };
  const countWallets = (folder: string) => folder === 'All' ? wallets.length : wallets.filter(w => (w.groupId || 'Imported') === folder).length;
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const calculateMenuPosition = useCallback((anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 260;
    const gap = 8;
    const padding = 8;
    const left = Math.min(window.innerWidth - menuWidth - padding, Math.max(padding, rect.right - menuWidth));
    const preferredTop = rect.bottom + gap;
    const top = preferredTop + menuHeight > window.innerHeight
      ? Math.max(padding, rect.top - menuHeight - gap)
      : preferredTop;
    return { left, top };
  }, []);
  const openFolderMenu = (event: MouseEvent<HTMLButtonElement>, folder: string) => {
    event.preventDefault();
    event.stopPropagation();
    const anchor = event.currentTarget;
    const position = calculateMenuPosition(anchor);
    setOpenMenu(prev => prev?.folder === folder ? null : { folder, anchor, ...position });
  };

  useEffect(() => {
    if (!openMenu) return undefined;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const updateMenuPosition = () => {
      setOpenMenu(current => {
        if (!current?.anchor?.isConnected) return null;
        return { ...current, ...calculateMenuPosition(current.anchor) };
      });
    };
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [openMenu, closeMenu, calculateMenuPosition]);

  return (
    <div className={isSidebar ? 'space-y-2' : 'space-y-2'}>
      {showFolderSearch && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            value={folderQuery}
            onChange={(e) => setFolderQuery(e.target.value)}
            placeholder={t('home.searchFolders')}
            className="h-9 w-full rounded-lg border border-surface-800 bg-surface-900 pl-9 pr-3 text-xs text-white outline-none placeholder:text-surface-600 focus:border-brand-500"
          />
        </div>
      )}
      <div className={isSidebar ? 'space-y-1' : 'flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide items-center'}>
      {creatingFolder && (
        <div className={isSidebar ? 'flex items-center gap-1' : 'flex min-w-[230px] flex-shrink-0 items-center gap-1'}>
          <input
            className={inputClass}
            value={newFolderName}
            onChange={(e) => onCreateChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') finishCreate();
              if (e.key === 'Escape') cancelCreate();
            }}
            placeholder={createFolderLabel}
          />
          <button
            type="button"
            disabled={!canCreate}
            onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
            onClick={finishCreate}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('common.save')}
            title={t('common.save')}
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
            onClick={cancelCreate}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-surface-700 bg-surface-800 text-surface-400 transition-colors hover:bg-surface-700 hover:text-white"
            aria-label={t('common.cancel')}
            title={t('common.cancel')}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {visibleFolders.map(f => {
        const count = countWallets(f);
        const isPinned = pinnedFolders.includes(f);
        const isDefault = defaultFolder === f;
        const isMenuOpen = openMenu?.folder === f;

        if (editingFolder === f) {
          return (
            <div key={f} className={isSidebar ? 'flex items-center gap-1' : 'flex min-w-[230px] flex-shrink-0 items-center gap-1'}>
              <input
                className={inputClass}
                value={draftEditName}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') onFinishEdit(f, draftEditName);
                  if (e.key === 'Escape') onFinishEdit(f, f);
                }}
              />
              <button
                type="button"
                disabled={!String(draftEditName || '').trim()}
                onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                onClick={() => onFinishEdit(f, draftEditName)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t('common.save')}
                title={t('common.save')}
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
                onClick={() => onFinishEdit(f, f)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-surface-700 bg-surface-800 text-surface-400 transition-colors hover:bg-surface-700 hover:text-white"
                aria-label={t('common.cancel')}
                title={t('common.cancel')}
              >
                <X size={15} />
              </button>
            </div>
          );
        }

        return (
          <div
            key={f}
            draggable={f !== 'All'}
            onDragStart={() => setDragFolder(f)}
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              if (dragFolder && f !== 'All') e.preventDefault();
            }}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              if (dragFolder && f !== 'All') onReorderFolder?.(dragFolder, f);
              setDragFolder(null);
            }}
            onDragEnd={() => setDragFolder(null)}
            className={isSidebar ? 'relative flex items-center gap-1' : 'relative flex items-center gap-1 flex-shrink-0'}
          >
            <button
              onClick={() => onSelectFolder(f)}
              onDoubleClick={() => f !== 'All' && onStartEdit(f)}
              className={isSidebar
                ? `w-full min-w-0 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeFolder === f ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-white hover:bg-surface-800'}`
                : `whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFolder === f ? 'bg-brand-500 text-white' : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'}`}
            >
              {isSidebar ? (
                <>
                  <span className="min-w-0 flex items-center gap-2 truncate">
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${activeFolder === f ? 'bg-white/15 text-white' : folderAccent(f)}`}>
                      <Folder size={14} />
                    </span>
                    <span className="truncate">{f}</span>
                    {isPinned && <Star size={11} className="flex-shrink-0 fill-amber-300 text-amber-300" />}
                    {isDefault && <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">{t('home.defaultFolderBadge')}</span>}
                  </span>
                  <span className="opacity-60 flex-shrink-0">{count}</span>
                </>
              ) : (
                <>
                  {isPinned && <Star size={11} className="mr-1 inline fill-amber-300 text-amber-300" />}
                  {f} <span className="opacity-60 ml-1">({count})</span>
                  {isDefault && <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">{t('home.defaultFolderBadge')}</span>}
                </>
              )}
            </button>
            {f !== 'All' && activeFolder === f && (
              <>
                <button
                  type="button"
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onStartEdit(f);
                  }}
                  className={isSidebar ? 'p-2 text-surface-400/70 hover:text-brand-300 transition-colors' : 'flex h-9 w-9 items-center justify-center rounded-full border border-surface-700/70 bg-surface-900 text-surface-400 transition-colors hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-brand-300'}
                  aria-label={t('home.renameFolder')}
                  title={t('home.renameFolder')}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => openFolderMenu(e, f)}
                  className={isSidebar
                    ? `flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${isMenuOpen ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-surface-700/70 bg-surface-900 text-surface-300 hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-white'}`
                    : `flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${isMenuOpen ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-surface-700/70 bg-surface-900 text-surface-300 hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-white'}`}
                  aria-label={t('home.folderActions')}
                  title={t('home.folderActions')}
                >
                  <MoreHorizontal size={18} />
                </button>
              </>
            )}
            {isMenuOpen && typeof document !== 'undefined' && createPortal(
              <div className="app-scaled-icons fixed inset-0 z-[9000]">
                <button className="absolute inset-0 cursor-default bg-transparent" onClick={closeMenu} aria-label={t('common.close')} />
                <div
                  onPointerDown={(e: PointerEvent<HTMLDivElement>) => e.stopPropagation()}
                  onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                  className="absolute min-w-56 rounded-xl border border-surface-700 bg-surface-900 p-1.5 shadow-2xl shadow-black/40"
                  style={{ left: `${openMenu.left}px`, top: `${openMenu.top}px` }}
                >
                  <button onClick={() => { closeMenu(); onStartEdit(f); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-surface-200 hover:bg-surface-800">
                    <Pencil size={14} /> {t('home.renameFolder')}
                  </button>
                  <button onClick={() => { closeMenu(); onTogglePinFolder?.(f); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-surface-200 hover:bg-surface-800">
                    <Star size={14} className={isPinned ? 'fill-amber-300 text-amber-300' : ''} /> {isPinned ? t('home.unpinFolder') : t('home.pinFolder')}
                  </button>
                  <button onClick={() => { closeMenu(); onSetDefaultFolder?.(isDefault ? '' : f); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-surface-200 hover:bg-surface-800">
                    <Check size={14} /> {isDefault ? t('home.clearDefaultFolder') : t('home.setDefaultFolder')}
                  </button>
                  <button onClick={() => { closeMenu(); onExportFolder?.(f); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-surface-200 hover:bg-surface-800">
                    <Download size={14} /> {t('home.exportFolder')}
                  </button>
                  {count > 0 && (
                    <button onClick={() => { closeMenu(); onRemoveFolderOnly?.(f); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-300 hover:bg-amber-500/10">
                      <FolderMinus size={14} /> {t('home.removeFolderOnly')}
                    </button>
                  )}
                  <button onClick={() => { closeMenu(); onDeleteFolder(f); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-300 hover:bg-red-500/10">
                    <Trash2 size={14} /> {t('home.deleteFolder')}
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        );
      })}
      {!creatingFolder && (
        <button
          type="button"
          onClick={onStartCreate}
          className={isSidebar
            ? 'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-400 hover:text-brand-300 hover:bg-surface-800 transition-colors'
            : 'flex-shrink-0 inline-flex items-center justify-center gap-1 rounded-full border border-dashed border-surface-700 bg-surface-900 px-3 py-2 text-sm font-medium text-surface-400 hover:border-brand-400/60 hover:text-brand-300 hover:bg-brand-500/10 transition-colors'}
          title={createFolderLabel}
          aria-label={createFolderLabel}
        >
          <FolderPlus size={14} />
          {isSidebar && <span>{createFolderLabel}</span>}
        </button>
      )}
      </div>
    </div>
  );
}
