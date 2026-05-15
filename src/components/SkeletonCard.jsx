/**
 * Animated skeleton loading cards — shown while wallets decrypt.
 */
export default function SkeletonCard({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card overflow-hidden border border-surface-700 animate-pulse">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-700 rounded w-1/3" />
              <div className="h-3 bg-surface-800 rounded w-2/3" />
            </div>
            <div className="h-6 w-16 bg-surface-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
