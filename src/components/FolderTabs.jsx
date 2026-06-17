import { Folder, FolderPlus, Trash2 } from 'lucide-react';

export default function FolderTabs({
  folders, activeFolder, wallets,
  editingFolder, editFolderName,
  onSelectFolder, onStartEdit, onEditChange, onFinishEdit, onDeleteFolder,
  creatingFolder, newFolderName, onStartCreate, onCreateChange, onFinishCreate,
  createFolderLabel = 'Create folder',
  variant = 'tabs'
}) {
  const isSidebar = variant === 'sidebar';
  const finishCreate = () => {
    if (!creatingFolder) return;
    onFinishCreate(newFolderName);
  };

  return (
    <div className={isSidebar ? 'space-y-1' : 'flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide items-center'}>
      {creatingFolder && (
        <input
          autoFocus
          className={isSidebar
            ? 'w-full bg-surface-800 border border-brand-500 text-white text-sm px-3 py-2 rounded-lg outline-none'
            : 'bg-surface-800 border border-brand-500 text-white text-sm px-3 py-2 rounded-full outline-none min-w-[150px] flex-shrink-0'}
          value={newFolderName}
          onChange={(e) => onCreateChange(e.target.value)}
          onBlur={finishCreate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishCreate();
            if (e.key === 'Escape') onFinishCreate('');
          }}
        />
      )}
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
  );
}
