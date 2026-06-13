import { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import { hapticSuccess } from '../utils/haptics';

export default function MoveToFolderModal({ wallet, folders, onMove, onClose }) {
  const t = useT();
  const [newFolder, setNewFolder] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const currentFolder = wallet.groupId || 'Imported';

  const handleMove = () => {
    const target = selectedFolder || newFolder.trim();
    if (!target || target === currentFolder) return;
    hapticSuccess();
    onMove(wallet, target);
    onClose();
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderPlus size={20} className="text-brand-400" />
            <h3 className="text-white font-bold">{t('moveWallet.title')}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-800 rounded-lg transition-colors">
            <X size={18} className="text-surface-400" />
          </button>
        </div>

        <p className="text-surface-400 text-sm mb-4">
          {t('moveWallet.desc', { name: wallet?.name || t('walletCard.unnamed') })}
        </p>

        {/* Existing folders */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
          {folders.filter(f => f !== 'All' && f !== currentFolder).map(folder => (
            <button key={folder} onClick={() => setSelectedFolder(folder)}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors ${selectedFolder === folder ? 'bg-brand-600 text-white' : 'bg-surface-800 hover:bg-surface-700 text-white'}`}>
              {folder}
            </button>
          ))}
        </div>

        {/* Create new folder */}
        <div className="flex gap-2">
          <input
            type="text" value={newFolder} onChange={e => setNewFolder(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMove()}
            placeholder={t('moveWallet.newFolderName')}
            className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
          />
        </div>
        
        <button onClick={handleMove} disabled={!selectedFolder && !newFolder.trim()}
          className="btn-glow w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-40 mt-4">
          {t('moveWallet.moveBtn')}
        </button>
      </div>
    </div>
  );
}
