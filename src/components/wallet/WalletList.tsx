import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KeyRound, Plus, ShieldCheck, Sparkles, UploadCloud, Wallet as WalletIcon } from 'lucide-react';
import WalletCard from './WalletCard';
import SortableWalletCard from './SortableWalletCard';
import SkeletonCard from '../shared/SkeletonCard';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useTheme } from '../../contexts/ThemeContext';
import type { TranslationFn } from '../../contexts/LanguageContext';
import type { QrModalData, SortOrder, Wallet } from '../../types';
import BrandSlogan from '../shared/BrandSlogan';

const getColumnCount = () => {
  if (typeof window === 'undefined') return 1;
  if (window.innerWidth >= 1280) return 3;
  if (window.innerWidth >= 768) return 2;
  return 1;
};

type WalletListProps = {
  vaultLoading: boolean;
  filteredWallets: Wallet[];
  setQrModalData: (data: QrModalData) => void;
  handleDeleteWallet: (wallet: Wallet) => void;
  handleRenameWallet: (wallet: Wallet, newName: string) => void;
  handleEditWallet: (wallet: Wallet, updatedFields: Partial<Wallet>) => void;
  handleTogglePin: (wallet: Wallet) => void;
  setMovingWallet: (wallet: Wallet) => void;
  t: TranslationFn;
  selectionMode: boolean;
  isSelected: (wallet: Wallet) => boolean;
  toggleSelect: (wallet: Wallet) => void;
  sortOrder: SortOrder | string;
  onReorder?: (oldIndex: number, newIndex: number) => void;
  assetUnit?: string;
  activeFolder?: string;
  searchQuery?: string;
  onAddWallet?: () => void;
  onImport?: () => void;
};

/**
 * Wallet list with lazy rendering and optional drag-and-drop reordering.
 * DnD is only active when sortOrder === 'custom'.
 */
function WalletList({
  vaultLoading, filteredWallets,
  setQrModalData, handleDeleteWallet, handleRenameWallet,
  handleEditWallet, handleTogglePin, setMovingWallet, t,
  selectionMode, isSelected, toggleSelect,
  sortOrder, onReorder, assetUnit,
  activeFolder = 'All', searchQuery = '', onAddWallet, onImport
}: WalletListProps) {
  const isDndEnabled = sortOrder === 'custom' && !selectionMode;
  const { effectiveDisplayScale, walletDensity, brandReminders } = useTheme();

  const listRef = useRef<HTMLDivElement | null>(null);
  const [listOffset, setListOffset] = useState(0);
  const [columnCount, setColumnCount] = useState(getColumnCount);
  const effectiveColumns = isDndEnabled ? 1 : columnCount;
  const rowCount = Math.ceil(filteredWallets.length / effectiveColumns);
  const densityRowSize = walletDensity === 'ultra' ? 50 : walletDensity === 'compact' ? 60 : 72;

  const measureListOffset = useCallback(() => {
    if (!listRef.current) return;
    const rect = listRef.current.getBoundingClientRect();
    setListOffset(rect.top + window.scrollY);
  }, []);

  useEffect(() => {
    measureListOffset();
    const raf = requestAnimationFrame(measureListOffset);
    return () => cancelAnimationFrame(raf);
  }, [measureListOffset, effectiveDisplayScale, walletDensity, filteredWallets.length, effectiveColumns]);

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
      requestAnimationFrame(measureListOffset);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureListOffset]);

  // Generate stable IDs for dnd-kit
  const getWalletId = (w: Wallet, i: number): UniqueIdentifier => w._id || `${w.address || 'no-addr'}-${w.groupId || 'root'}-${i}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => Math.max(28, densityRowSize * (effectiveDisplayScale / 100)),
    overscan: 4,
    scrollMargin: listOffset,
  });

  const itemIds = useMemo(
    () => filteredWallets.map((w, i) => getWalletId(w, i)),
    [filteredWallets],
  );

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, effectiveDisplayScale, walletDensity, effectiveColumns, filteredWallets.length]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredWallets.findIndex((w, i) => getWalletId(w, i) === active.id);
    const newIndex = filteredWallets.findIndex((w, i) => getWalletId(w, i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder?.(oldIndex, newIndex);
  }, [filteredWallets, onReorder]);

  const renderCard = (w: Wallet, i: number) => (
    <WalletCard
      key={getWalletId(w, i)}
      wallet={w}
      onShowQR={(data: string, title: string, subtitle?: string) => setQrModalData({ isOpen: true, data, title, subtitle: subtitle || '' })}
      onDelete={() => handleDeleteWallet(w)}
      onRename={(newName: string) => handleRenameWallet(w, newName)}
      onEdit={(updatedFields: Partial<Wallet>) => handleEditWallet(w, updatedFields)}
      onPin={() => handleTogglePin(w)}
      onMove={(wallet: Wallet) => setMovingWallet(wallet)}
      selectionMode={selectionMode}
      isSelected={selectionMode ? isSelected(w) : false}
      onToggleSelect={() => toggleSelect(w)}
      assetUnit={assetUnit}
      density={walletDensity}
    />
  );

  if (vaultLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (filteredWallets.length === 0) {
    const isEmptyFolder = activeFolder !== 'All' && !searchQuery;
    return (
      <div className="pt-3">
        <div className="empty-vault-container rounded-3xl border border-dashed border-brand-400/30 bg-gradient-to-b from-surface-900/80 to-surface-950/80 px-5 py-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
          <div className="empty-vault-glow" aria-hidden="true" />
          <div className="relative z-[1]">
            <div className="empty-vault-illustration mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-400/25 bg-brand-500/10 text-brand-200">
              <WalletIcon size={32} />
              <Sparkles size={14} className="absolute -right-1 top-3 text-amber-300" />
              <ShieldCheck size={16} className="absolute -bottom-1 -left-1 text-emerald-300" />
            </div>
            <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-surface-700 bg-surface-900/80 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-surface-400">
              <KeyRound size={12} className="text-brand-300" /> xKey vault
            </div>
            <h3 className="text-base font-black text-white">
              {isEmptyFolder ? t('home.emptyFolderTitle', { name: activeFolder }) : t('home.noWallets')}
            </h3>
            {brandReminders && !isEmptyFolder && !searchQuery && (
              <div className="mx-auto mt-3 max-w-sm">
                <BrandSlogan note={t('brand.emptyVaultDesc')} tone="brand" compact />
              </div>
            )}
            {isEmptyFolder && (
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-surface-400">
                {t('home.emptyFolderDesc')}
              </p>
            )}
            <div className="mx-auto mt-5 grid max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onAddWallet}
                className="btn-glow flex items-center justify-center gap-2 rounded-2xl border border-brand-300/60 bg-gradient-to-r from-brand-600 to-cyan-600 px-4 py-3 text-sm font-black text-white shadow-[0_0_24px_rgba(14,165,233,0.22)] hover:from-brand-500 hover:to-cyan-500"
              >
                <Plus size={16} /> {isEmptyFolder ? t('home.addToFolder') : t('home.addWallet')}
              </button>
              <button
                type="button"
                onClick={onImport}
                className="btn-glow flex items-center justify-center gap-2 rounded-2xl border border-surface-700 bg-surface-800/90 px-4 py-3 text-sm font-bold text-surface-200 hover:border-surface-600 hover:bg-surface-700"
              >
                <UploadCloud size={16} /> {isEmptyFolder ? t('home.importToFolder') : t('home.importWallet')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderVirtualList = () => (
    <div ref={listRef} style={{ position: 'relative', width: '100%', height: `${rowVirtualizer.getTotalSize()}px` }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const rowStart = virtualRow.index * effectiveColumns;
        const rowWallets = filteredWallets.slice(rowStart, rowStart + effectiveColumns);

        const rowContent = rowWallets.map((w, offset) => {
          const i = rowStart + offset;
          const id = getWalletId(w, i);

          return isDndEnabled ? (
            <SortableWalletCard key={id} id={id}>{renderCard(w, i)}</SortableWalletCard>
          ) : (
            <div
              key={id}
              className="min-w-0"
              draggable={!selectionMode}
              onDragStart={(event) => {
                event.dataTransfer.setData('application/x-xkey-wallet-id', String(w._id || w.address || id));
                event.dataTransfer.effectAllowed = 'move';
              }}
            >
              {renderCard(w, i)}
            </div>
          );
        });

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
            } as CSSProperties}
            className={isDndEnabled ? 'pb-3' : 'grid gap-3 pb-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}
          >
            {rowContent}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3 pt-3">
      {isDndEnabled ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {renderVirtualList()}
          </SortableContext>
        </DndContext>
      ) : (
        renderVirtualList()
      )}
    </div>
  );
}

export default memo(WalletList);
