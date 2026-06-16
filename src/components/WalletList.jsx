import { useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import WalletCard from './WalletCard';
import SortableWalletCard from './SortableWalletCard';
import SkeletonCard from './SkeletonCard';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useRef, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const getColumnCount = () => {
  if (typeof window === 'undefined') return 1;
  if (window.innerWidth >= 1280) return 3;
  if (window.innerWidth >= 768) return 2;
  return 1;
};

/**
 * Wallet list with lazy rendering and optional drag-and-drop reordering.
 * DnD is only active when sortOrder === 'custom'.
 */
export default function WalletList({
  vaultLoading, filteredWallets,
  setQrModalData, handleDeleteWallet, handleRenameWallet,
  handleEditWallet, handleTogglePin, setMovingWallet, t,
  selectionMode, isSelected, toggleSelect,
  sortOrder, onReorder, assetUnit
}) {
  const isDndEnabled = sortOrder === 'custom' && !selectionMode;
  const { displayScale, walletDensity } = useTheme();

  const listRef = useRef(null);
  const [listOffset, setListOffset] = useState(0);
  const [columnCount, setColumnCount] = useState(getColumnCount);
  const effectiveColumns = isDndEnabled ? 1 : columnCount;
  const rowCount = Math.ceil(filteredWallets.length / effectiveColumns);
  const densityRowSize = walletDensity === 'ultra' ? 78 : walletDensity === 'compact' ? 92 : 112;

  const measureListOffset = useCallback(() => {
    if (!listRef.current) return;
    const rect = listRef.current.getBoundingClientRect();
    setListOffset(rect.top + window.scrollY);
  }, []);

  useEffect(() => {
    measureListOffset();
    const raf = requestAnimationFrame(measureListOffset);
    return () => cancelAnimationFrame(raf);
  }, [measureListOffset, displayScale, walletDensity, filteredWallets.length, effectiveColumns]);

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
      requestAnimationFrame(measureListOffset);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureListOffset]);

  // Generate stable IDs for dnd-kit
  const getWalletId = (w, i) => w._id || `${w.address || 'no-addr'}-${w.groupId || 'root'}-${i}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => Math.max(28, densityRowSize * (displayScale / 100)),
    overscan: 4,
    scrollMargin: listOffset,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, displayScale, walletDensity, effectiveColumns, filteredWallets.length]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredWallets.findIndex((w, i) => getWalletId(w, i) === active.id);
    const newIndex = filteredWallets.findIndex((w, i) => getWalletId(w, i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder?.(oldIndex, newIndex);
  }, [filteredWallets, onReorder]);

  const renderCard = (w, i) => (
    <WalletCard
      key={getWalletId(w, i)}
      wallet={w}
      onShowQR={(data, title, subtitle) => setQrModalData({ isOpen: true, data, title, subtitle })}
      onDelete={() => handleDeleteWallet(w)}
      onRename={(newName) => handleRenameWallet(w, newName)}
      onEdit={(updatedFields) => handleEditWallet(w, updatedFields)}
      onPin={() => handleTogglePin(w)}
      onMove={(wallet) => setMovingWallet(wallet)}
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
    return (
      <div className="text-center py-10 text-surface-500">
        {t('home.noWallets')}
      </div>
    );
  }

  const itemIds = filteredWallets.map((w, i) => getWalletId(w, i));

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
            <div key={id} className="min-w-0">
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
            }}
            className={isDndEnabled ? 'pb-3' : 'grid gap-3 pb-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}
          >
            {rowContent}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
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
