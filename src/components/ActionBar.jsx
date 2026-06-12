import { useState } from 'react';
import { Search, ArrowDownUp, UploadCloud, Filter, Plus, Network, CheckSquare } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

export default function ActionBar({
  searchQuery, onSearchChange, sortOrder, onSortChange,
  onUpload, loading, activeFilter, onFilterChange, onAddWallet, onBulkNetwork,
  allTags = [], selectionMode, onToggleSelectionMode
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const t = useT();

  const FILTER_OPTIONS = [
    { key: 'all', label: t('actionBar.allWallets') },
    { key: 'pinned', label: t('actionBar.pinned') },
    { key: 'hasPk', label: t('actionBar.hasPk') },
    { key: 'hasSeed', label: t('actionBar.hasSeed') },
    { key: 'hasBalance', label: t('actionBar.hasBalance') },
    { key: 'empty', label: t('actionBar.empty') },
    // Network filters
    { key: 'net:XLAYER', label: 'XLAYER', group: 'chain' },
    { key: 'net:ETH', label: 'ETH', group: 'chain' },
    { key: 'net:BSC', label: 'BSC', group: 'chain' },
    { key: 'net:Polygon', label: 'MATIC', group: 'chain' },
    { key: 'net:Solana', label: 'SOL', group: 'chain' },
    { key: 'net:Arbitrum', label: 'ARB', group: 'chain' },
    { key: 'net:Optimism', label: 'OP', group: 'chain' },
    { key: 'net:Tron', label: 'TRX', group: 'chain' },
    { key: 'net:Base', label: 'BASE', group: 'chain' },
  ];

  const SORT_OPTIONS = [
    { key: 'none', label: t('actionBar.defaultOrder') },
    { key: 'name-asc', label: t('actionBar.nameAsc') },
    { key: 'name-desc', label: t('actionBar.nameDesc') },
    { key: 'date-desc', label: t('actionBar.newestFirst') },
    { key: 'date-asc', label: t('actionBar.oldestFirst') },
    { key: 'balance-desc', label: t('actionBar.balanceHigh') },
    { key: 'balance-asc', label: t('actionBar.balanceLow') },
    { key: 'custom', label: t('actionBar.customOrder') || '↕ Custom Order' },
    { key: 'address-asc', label: t('actionBar.addressAsc') },
  ];

  return (
    <>
      <div className="flex gap-2 mb-2 mt-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder={t('actionBar.searchPlaceholder')} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-900 border border-surface-700 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-surface-500" />
        </div>
        <button onClick={() => { setShowFilters(!showFilters); setShowSort(false); }}
          className={`flex-shrink-0 border px-3 py-3 rounded-lg transition-colors flex items-center justify-center ${activeFilter !== 'all' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-surface-800 border-surface-700 text-surface-300 hover:text-white hover:bg-surface-700'}`}
          title="Filter"><Filter size={18} /></button>
        <button onClick={() => { setShowSort(!showSort); setShowFilters(false); }}
          className={`flex-shrink-0 border px-3 py-3 rounded-lg transition-colors flex items-center justify-center ${sortOrder !== 'none' ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' : 'bg-surface-800 border-surface-700 text-surface-300 hover:text-white hover:bg-surface-700'}`}
          title="Sort"><ArrowDownUp size={18} /></button>
        <button onClick={onAddWallet} className="flex-shrink-0 bg-brand-600 hover:bg-brand-500 border border-brand-500 text-white px-3 py-3 rounded-lg transition-colors flex items-center justify-center" title={t('home.addWallet')}><Plus size={18} /></button>
        <button onClick={onBulkNetwork} className="flex-shrink-0 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white px-3 py-3 rounded-lg transition-colors flex items-center justify-center" title={t('actionBar.bulkNetwork') || 'Bulk Change Network'}><Network size={18} /></button>
        <button onClick={onToggleSelectionMode} className={`flex-shrink-0 border px-3 py-3 rounded-lg transition-colors flex items-center justify-center ${selectionMode ? 'bg-brand-500/20 border-brand-500/40 text-brand-400' : 'bg-surface-800 hover:bg-surface-700 border-surface-700 text-white'}`} title={t('batch.toggleSelection') || 'Select Wallets'}>
          <CheckSquare size={18} />
        </button>
        <button onClick={onUpload} disabled={loading}
          className="flex-shrink-0 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white px-3 py-3 rounded-lg transition-colors flex items-center justify-center" title="Import">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UploadCloud size={18} />}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 bg-surface-800/50 rounded-lg p-3 border border-surface-700">
          <div className="flex flex-wrap gap-2 mb-2">
            {FILTER_OPTIONS.filter(o => !o.group).map(opt => (
              <button key={opt.key} onClick={() => { onFilterChange(opt.key); setShowFilters(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeFilter === opt.key ? 'bg-cyan-500 text-white' : 'bg-surface-700 text-surface-300 hover:bg-surface-600'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="border-t border-surface-700 pt-2 mt-1">
            <span className="text-[10px] text-surface-500 uppercase tracking-wider mr-2">{t('actionBar.byChain')}</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {FILTER_OPTIONS.filter(o => o.group === 'chain').map(opt => (
                <button key={opt.key} onClick={() => { onFilterChange(opt.key); setShowFilters(false); }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${activeFilter === opt.key ? 'bg-brand-500 text-white' : 'bg-surface-700 text-surface-400 hover:bg-surface-600'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {allTags.length > 0 && (
            <div className="border-t border-surface-700 pt-2 mt-1">
              <span className="text-[10px] text-surface-500 uppercase tracking-wider mr-2">Tags</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allTags.map(tag => (
                  <button key={tag} onClick={() => { onFilterChange(`tag:${tag}`); setShowFilters(false); }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${activeFilter === `tag:${tag}` ? 'bg-purple-500 text-white' : 'bg-surface-700 text-surface-400 hover:bg-surface-600'}`}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showSort && (
        <div className="flex flex-wrap gap-2 mb-4 bg-surface-800/50 rounded-lg p-3 border border-surface-700">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => { onSortChange(opt.key); setShowSort(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${sortOrder === opt.key ? 'bg-brand-500 text-white' : 'bg-surface-700 text-surface-300 hover:bg-surface-600'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
