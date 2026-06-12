import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/**
 * Wrapper that makes a WalletCard sortable via @dnd-kit.
 * Renders a drag handle and applies transform/transition styles.
 */
export default function SortableWalletCard({ id, children, disabled }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 p-1.5 rounded-lg bg-surface-800/80 border border-surface-700 text-surface-500 hover:text-white hover:bg-surface-700 touch-none transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
      )}
      <div className={!disabled ? 'ml-5' : ''}>
        {children}
      </div>
    </div>
  );
}
