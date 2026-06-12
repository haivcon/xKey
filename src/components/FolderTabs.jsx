import { Folder, Trash2 } from 'lucide-react';

export default function FolderTabs({
  folders, activeFolder, wallets,
  editingFolder, editFolderName,
  onSelectFolder, onStartEdit, onEditChange, onFinishEdit, onDeleteFolder,
  variant = 'tabs'
}) {
  if (folders.length <= 1) return null;
  const isSidebar = variant === 'sidebar';

  return (
    <div className={isSidebar ? 'space-y-1' : 'flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide items-center'}>
      {folders.map(f => {
        const count = f === 'All' ? wallets.length : wallets.filter(w => (w.groupId || 'Imported') === f).length;

        if (editingFolder === f) {
          return (
            <input
              key={f}
              autoFocus
              className={isSidebar
                ? 'w-full bg-surface-800 border border-brand-500 text-white text-sm px-3 py-2 rounded-lg outline-none'
                : 'bg-surface-800 border border-brand-500 text-white text-sm px-3 py-2 rounded-full outline-none min-w-[80px]'}
              value={editFolderName}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={() => onFinishEdit(f, editFolderName)}
              onKeyDown={(e) => e.key === 'Enter' && onFinishEdit(f, editFolderName)}
            />
          );
        }

        return (
          <div key={f} className={isSidebar ? 'flex items-center gap-1' : 'flex items-center gap-1 flex-shrink-0'}>
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
                    <Folder size={14} className="flex-shrink-0 opacity-70" />
                    <span className="truncate">{f}</span>
                  </span>
                  <span className="opacity-60 flex-shrink-0">{count}</span>
                </>
              ) : (
                <>{f} <span className="opacity-60 ml-1">({count})</span></>
              )}
            </button>
            {f !== 'All' && activeFolder === f && (
              <button onClick={() => onDeleteFolder(f)} className={isSidebar ? 'p-2 text-red-400/50 hover:text-red-400 transition-colors' : 'p-1 text-red-400/50 hover:text-red-400 transition-colors'}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
