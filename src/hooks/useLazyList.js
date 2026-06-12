import { useState, useEffect, useRef, useCallback } from 'react';

const BATCH_SIZE = 50;

/**
 * Hook that implements progressive rendering for large lists.
 * Initially renders BATCH_SIZE items, then loads more as the user scrolls.
 * Much simpler than react-window and doesn't break expand/collapse UX.
 */
export default function useLazyList(items) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef(null);

  // Reset when items change (e.g. folder switch, search)
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [items.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (visibleCount >= items.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, items.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, items.length]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + BATCH_SIZE, items.length));
  }, [items.length]);

  return { visibleItems, hasMore, sentinelRef, loadMore };
}
