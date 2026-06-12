import { useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import WalletCard from './WalletCard';
import SortableWalletCard from './SortableWalletCard';
import SkeletonCard from './SkeletonCard';
import useLazyList from '../hooks/useLazyList';

/**
 * Wallet list with lazy rendering and optional drag-and-drop reordering.
 * DnD is only active when sortOrder === 'custom'.
 */
export default function WalletList({
  vaultLoading, filteredWallets,
  setQrModalData, handleDeleteWallet, handleRenameWallet,
  handleEditWallet, handleTogglePin, setMovingWallet, t,
  selectionMode, isSelected, toggleSelect,
  sortOrder, onReorder
}) {
  const { visibleItems, hasMore, sentinelRef } = useLazyList(filteredWallets);

  const isDndEnabled = sortOrder === 'custom' && !selectionMode;

  // Generate stable IDs for dnd-kit
  const getWalletId = (w, i) => w._id || `${w.address || 'no-addr'}-${w.groupId || 'root'}-${i}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleItems.findIndex((w, i) => getWalletId(w, i) === active.id);
    const newIndex = visibleItems.findIndex((w, i) => getWalletId(w, i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder?.(oldIndex, newIndex);
  }, [visibleItems, onReorder]);

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

  const itemIds = visibleItems.map((w, i) => getWalletId(w, i));

  return (
    <div className="space-y-3">
      {isDndEnabled ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {visibleItems.map((w, i) => (
              <SortableWalletCard key={getWalletId(w, i)} id={getWalletId(w, i)}>
                {renderCard(w, i)}
              </SortableWalletCard>
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        visibleItems.map((w, i) => renderCard(w, i))
      )}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-surface-500">
            {visibleItems.length} / {filteredWallets.length}
          </span>
        </div>
      )}
    </div>
  );
}
