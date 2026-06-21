import { useState } from 'react';
import { Trash2, FolderInput, Tag, Pin, Square, X } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import { hapticTap } from '../utils/haptics';

/**
 * Floating action bar shown in batch selection mode.
 */
type BatchActionBarProps = {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onMove: (folder: string) => void;
  onTag: (tag: string) => void;
  onPin: () => void;
  onCancel: () => void;
  folders?: string[];
};

export default function BatchActionBar({
  selectedCount, onSelectAll, onDeselectAll,
  onDelete, onMove, onTag, onPin, onCancel,
  folders = []
}: BatchActionBarProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const t = useT();

  if (selectedCount === 0) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-surface-800/95 backdrop-blur-md border border-surface-700 rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-surface-400">
          <Square size={16} />
          <span className="text-sm">{t('batch.selectWallets') || 'Tap wallets to select'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { hapticTap(); onSelectAll(); }}
            className="text-xs text-brand-400 bg-brand-500/10 px-3 py-1.5 rounded-lg hover:bg-brand-500/20">
            {t('batch.selectAll') || 'Select All'}
          </button>
          <button onClick={onCancel}
            className="p-1.5 text-surface-400 hover:text-white rounded-lg hover:bg-surface-700">
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-surface-800/95 backdrop-blur-md border border-brand-500/30 rounded-2xl px-4 py-3 shadow-2xl shadow-brand-500/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">
            {t('batch.selected', { count: selectedCount }) || `${selectedCount} selected`}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => { hapticTap(); onSelectAll(); }}
              className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-1 rounded-md">
              {t('batch.all') || 'All'}
            </button>
            <button onClick={() => { hapticTap(); onDeselectAll(); }}
              className="text-[10px] text-surface-400 bg-surface-700 px-2 py-1 rounded-md">
              {t('batch.none') || 'None'}
            </button>
            <button onClick={onCancel}
              className="p-1 text-surface-400 hover:text-white rounded-md hover:bg-surface-700">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { hapticTap(); onPin(); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-medium transition-colors">
            <Pin size={14} /> {t('batch.pin') || 'Pin'}
          </button>
          <button onClick={() => { hapticTap(); setShowTagInput(!showTagInput); setShowMoveMenu(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 py-2 rounded-xl text-xs font-medium transition-colors">
            <Tag size={14} /> {t('batch.tag') || 'Tag'}
          </button>
          <button onClick={() => { hapticTap(); setShowMoveMenu(!showMoveMenu); setShowTagInput(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-xs font-medium transition-colors">
            <FolderInput size={14} /> {t('batch.move') || 'Move'}
          </button>
          <button onClick={() => { hapticTap(); onDelete(); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-medium transition-colors">
            <Trash2 size={14} /> {t('batch.delete') || 'Delete'}
          </button>
        </div>

        {showTagInput && (
          <div className="mt-2 flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { onTag(tagInput.trim().toLowerCase()); setTagInput(''); setShowTagInput(false); } }}
              placeholder={t('batch.tagPlaceholder')}
              className="flex-1 bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 placeholder:text-surface-600"
            />
            <button
              onClick={() => { if (tagInput.trim()) { onTag(tagInput.trim().toLowerCase()); setTagInput(''); setShowTagInput(false); } }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {t('common.save') || 'Save'}
            </button>
          </div>
        )}

        {showMoveMenu && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {folders.filter(f => f !== 'All').map(folder => (
              <button key={folder} onClick={() => { onMove(folder); setShowMoveMenu(false); }}
                className="px-3 py-1.5 bg-surface-700 hover:bg-emerald-500/20 text-surface-300 hover:text-emerald-400 rounded-lg text-xs transition-colors">
                {folder}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
