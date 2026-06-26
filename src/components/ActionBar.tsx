import { lazy, Suspense, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Search, ArrowDownUp, UploadCloud, Filter, Plus, Network, CheckSquare, FileDown, AlertTriangle, BarChart3, MoreHorizontal, ClipboardPaste, Camera, X, Wrench } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import { readClipboard } from '../utils/clipboard';
import type { FilterKey, SortOrder } from '../types';

const QRScannerModal = lazy(() => import('./qr/QRScannerModal'));

type FilterOption = {
  key: FilterKey | 'new';
  label: string;
  group?: 'chain';
};

type SortOption = {
  key: SortOrder;
  label: string;
};

type ToolItem = {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  onClick: () => void;
  loading?: boolean;
  active?: boolean;
  badge?: number | null;
  tone?: 'warning' | 'success';
};

type ToolGroup = {
  key: string;
  title: string;
  items: ToolItem[];
};

type ActionBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOrder: SortOrder | string;
  onSortChange: (value: SortOrder) => void;
  onUpload: () => void;
  loading?: boolean;
  activeFilter: FilterKey | string;
  onFilterChange: (value: FilterKey | string) => void;
  onAddWallet: () => void;
  onBulkNetwork: () => void;
  allTags?: string[];
  selectionMode?: boolean;
  onToggleSelectionMode: () => void;
  onExportCSV: () => void;
  onExportBackup: () => void;
  onShowDuplicates: () => void;
  duplicateCount?: number;
  onAnalytics: () => void;
  onAdvancedTools: () => void;
};

export default function ActionBar({
  searchQuery, onSearchChange, sortOrder, onSortChange,
  onUpload, loading, activeFilter, onFilterChange, onAddWallet, onBulkNetwork,
  allTags = [], selectionMode, onToggleSelectionMode,
  onExportCSV, onExportBackup, onShowDuplicates, duplicateCount = 0, onAnalytics, onAdvancedTools
}: ActionBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  const t = useT();

  const FILTER_OPTIONS: FilterOption[] = [
    { key: 'all', label: t('actionBar.allWallets') },
    { key: 'new', label: t('actionBar.newWallets') },
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

  const SORT_OPTIONS: SortOption[] = [
    { key: 'none', label: t('actionBar.defaultOrder') },
    { key: 'name-asc', label: t('actionBar.nameAsc') },
    { key: 'name-desc', label: t('actionBar.nameDesc') },
    { key: 'date-desc', label: t('actionBar.newestFirst') },
    { key: 'date-asc', label: t('actionBar.oldestFirst') },
    { key: 'balance-desc', label: t('actionBar.balanceHigh') },
    { key: 'balance-asc', label: t('actionBar.balanceLow') },
    { key: 'custom', label: t('actionBar.customOrder') },
    { key: 'address-asc', label: t('actionBar.addressAsc') },
    { key: 'vanity-score-desc', label: t('actionBar.vanityScore') },
  ];

  const closeTools = () => setShowTools(false);

  const extractSearchTarget = (value: string) => {
    const text = (value || '').trim();
    const evmAddress = text.match(/0x[a-fA-F0-9]{40}/);
    if (evmAddress) return evmAddress[0];

    const tronAddress = text.match(/\bT[1-9A-HJ-NP-Za-km-z]{33}\b/);
    if (tronAddress) return tronAddress[0];

    return text;
  };

  const handlePasteSearch = async () => {
    try {
      const text = await readClipboard();
      if (text) onSearchChange(extractSearchTarget(text));
    } catch {
      // Clipboard read can be denied by the browser; the input remains usable.
    }
  };

  const toolGroups: ToolGroup[] = [
    {
      key: 'data',
      title: t('actionBar.toolData'),
      items: [
        {
          key: 'import',
          label: t('actionBar.importFiles'),
          desc: t('actionBar.importFilesDesc'),
          icon: UploadCloud,
          onClick: () => { onUpload(); closeTools(); },
          loading,
        },
        {
          key: 'exportCSV',
          label: t('actionBar.exportCSV'),
          desc: t('actionBar.exportCSVDesc'),
          icon: FileDown,
          tone: 'warning',
          onClick: () => { onExportCSV(); closeTools(); },
        },
        {
          key: 'exportBackup',
          label: t('actionBar.exportBackup'),
          desc: t('actionBar.exportBackupDesc'),
          icon: FileDown,
          tone: 'success',
          onClick: () => { onExportBackup(); closeTools(); },
        },
      ],
    },
    {
      key: 'review',
      title: t('actionBar.toolReview'),
      items: [
        {
          key: 'duplicates',
          label: t('actionBar.duplicates'),
          desc: t('actionBar.duplicatesDesc'),
          icon: AlertTriangle,
          active: duplicateCount > 0,
          badge: duplicateCount > 0 ? duplicateCount : null,
          tone: duplicateCount > 0 ? 'warning' : undefined,
          onClick: () => { onShowDuplicates(); closeTools(); },
        },
        {
          key: 'analytics',
          label: t('actionBar.analytics'),
          desc: t('actionBar.analyticsDesc'),
          icon: BarChart3,
          onClick: () => { onAnalytics(); closeTools(); },
        },
      ],
    },
    {
      key: 'bulk',
      title: t('actionBar.toolBulk'),
      items: [
        {
          key: 'bulkNetwork',
          label: t('actionBar.bulkNetwork'),
          desc: t('actionBar.bulkNetworkDesc'),
          icon: Network,
          onClick: () => { onBulkNetwork(); closeTools(); },
        },
        {
          key: 'selectWallets',
          label: t('actionBar.selectWallets'),
          desc: t('actionBar.selectWalletsDesc'),
          icon: CheckSquare,
          active: selectionMode,
          onClick: () => { onToggleSelectionMode(); closeTools(); },
        },
        {
          key: 'advancedTools',
          label: t('actionBar.advancedTools'),
          desc: t('actionBar.advancedToolsDesc'),
          icon: Wrench,
          onClick: () => { onAdvancedTools(); closeTools(); },
        },
      ],
    },
  ];

  const desktopTools = toolGroups.flatMap(group => group.items);

  const toolButtonClass = (item: ToolItem): string => {
    if (item.tone === 'warning') {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15';
    }
    if (item.tone === 'success') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15';
    }
    if (item.active) {
      return 'border-brand-500/40 bg-brand-500/15 text-brand-300';
    }
    return 'border-surface-700 bg-surface-800 text-surface-200 hover:bg-surface-700';
  };

  return (
    <>
      <div className="flex flex-col gap-2 mb-2 mt-1">
        <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder={t('actionBar.searchPlaceholder')} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 w-full bg-surface-900 border border-surface-700 rounded-lg pl-10 pr-20 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-surface-500" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-10 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-surface-400 transition-colors hover:bg-surface-800 hover:text-white"
              title={t('actionBar.clearSearch')}
              aria-label={t('actionBar.clearSearch')}
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handlePasteSearch}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-surface-400 transition-colors hover:bg-surface-800 hover:text-white"
            title={t('actionBar.pasteSearch')}
          >
            <ClipboardPaste size={17} />
          </button>
        </div>
        <button onClick={() => setShowSearchScanner(true)} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-surface-700 bg-surface-800 text-surface-300 transition-colors hover:bg-surface-700 hover:text-white" title={t('actionBar.scanSearch')}>
          <Camera size={18} />
        </button>
        <button onClick={() => { setShowFilters(!showFilters); setShowSort(false); }}
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${activeFilter !== 'all' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-surface-700 bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white'}`}
          title={t('actionBar.filter')}><Filter size={18} /></button>
        <button onClick={() => { setShowSort(!showSort); setShowFilters(false); }}
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${sortOrder !== 'none' ? 'border-brand-500/30 bg-brand-500/10 text-brand-300' : 'border-surface-700 bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white'}`}
          title={t('actionBar.sort')}><ArrowDownUp size={18} /></button>
        </div>
        <div className="flex gap-2 xl:hidden">
          <button
            onClick={onAddWallet}
            className="btn-glow flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-brand-400 bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-500"
            title={t('home.addWallet')}
          >
            <Plus size={18} />
            <span>{t('home.addWallet')}</span>
          </button>
          <button
            onClick={() => setShowTools(!showTools)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${showTools ? 'bg-surface-700 border-surface-600 text-white' : 'bg-surface-800 border-surface-700 text-surface-200 hover:bg-surface-700'}`}
            title={t('actionBar.moreTools')}
          >
            <MoreHorizontal size={18} />
            <span>{t('actionBar.tools')}</span>
          </button>
        </div>

        <div className="hidden gap-2 xl:grid xl:grid-cols-4 2xl:grid-cols-5">
          <button
            onClick={onAddWallet}
            className="btn-glow flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-brand-400 bg-brand-600 px-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-500"
            title={t('home.addWallet')}
          >
            <Plus size={18} />
            <span className="truncate">{t('home.addWallet')}</span>
          </button>

          <div className="contents">
            {desktopTools.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  disabled={item.loading}
                  className={`relative flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-60 ${toolButtonClass(item)}`}
                  title={`${item.label}${item.desc ? ` - ${item.desc}` : ''}`}
                >
                  {item.loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Icon size={18} />}
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showTools && createPortal(
        <div className="app-scaled-icons fixed inset-0 z-[9998] xl:hidden">
          <button className="absolute inset-0 w-full bg-black/55 backdrop-blur-sm" onClick={closeTools} aria-label={t('common.close')} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[72vh] flex-col overflow-hidden rounded-t-xl border border-surface-700 bg-surface-950 shadow-2xl sm:max-h-[82vh] sm:rounded-t-2xl">
            <div className="flex items-center justify-between px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
              <div>
                <h3 className="text-sm font-bold text-white sm:text-base">{t('actionBar.tools')}</h3>
                <p className="text-[11px] text-surface-500 sm:text-xs">{t('actionBar.moreTools')}</p>
              </div>
              <button onClick={closeTools} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white sm:h-10 sm:w-10">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-4 sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
              {toolGroups.map(group => (
                <div key={group.key}>
                  <div className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-wider text-surface-500 sm:mb-2 sm:text-[10px]">
                    {group.title}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={item.onClick}
                          disabled={item.loading}
                          className={`relative flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60 sm:gap-3 sm:py-3 ${toolButtonClass(item)}`}
                        >
                          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-black/10 sm:h-8 sm:w-8">
                            {item.loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Icon size={17} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold sm:text-sm">{item.label}</span>
                            <span className="mt-0.5 block text-[11px] leading-snug opacity-70 sm:text-xs">{item.desc}</span>
                          </span>
                          {item.badge && (
                            <span className="mt-1 min-w-5 h-5 px-1.5 bg-yellow-500 text-black text-[11px] font-bold rounded-full flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

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
              <span className="text-[10px] text-surface-500 uppercase tracking-wider mr-2">{t('actionBar.tags')}</span>
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

      {showSearchScanner && (
        <Suspense fallback={null}>
          <QRScannerModal
            onResult={({ text }) => onSearchChange(extractSearchTarget(text))}
            onClose={() => setShowSearchScanner(false)}
          />
        </Suspense>
      )}
    </>
  );
}
