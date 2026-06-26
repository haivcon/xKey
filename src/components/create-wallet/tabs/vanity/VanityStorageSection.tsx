import type { Dispatch, SetStateAction } from 'react';
import { ChevronDown, Copy, Folder, Tag, Wallet } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import { InlineSelect } from '../../components';
type VanityStorageSectionProps = {
  t: TranslationFn;
  expanded: boolean;
  allTags: string[];
  vanityGenerating: boolean;
  vanityTargetCount: string | number;
  setVanityTargetCount: Dispatch<SetStateAction<string | number>>;
  vanitySafeTargetCount: number;
  vanityNetwork: string;
  setVanityNetwork: (network: string) => void;
  vanityNetworkOptions: { value: string; label: string }[];
  vanityFolder: string;
  setVanityFolder: (folder: string) => void;
  vanityFolderOptions: { value: string; label: string }[];
  vanityStorageSummary: string;
  vanityTagInput: string;
  setVanityTagInput: Dispatch<SetStateAction<string>>;
  vanityTags: string[];
  setVanityTags: Dispatch<SetStateAction<string[]>>;
  addVanityTag: () => void;
  onToggle: () => void;
};

export function VanityStorageSection({
  t,
  expanded,
  allTags,
  vanityGenerating,
  vanityTargetCount,
  setVanityTargetCount,
  vanitySafeTargetCount,
  vanityNetwork,
  setVanityNetwork,
  vanityNetworkOptions,
  vanityFolder,
  setVanityFolder,
  vanityFolderOptions,
  vanityStorageSummary,
  vanityTagInput,
  setVanityTagInput,
  vanityTags,
  setVanityTags,
  addVanityTag,
  onToggle,
}: VanityStorageSectionProps) {
  return (
    <section className={`vanity-step-card ${expanded ? 'is-open' : ''}`}>
      <button type="button" onClick={onToggle} className="vanity-step-header flex w-full items-center justify-between gap-3 border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
        <div className="flex min-w-0 items-center gap-2">
          <span className="vanity-step-number">3</span>
          <Folder size={16} className="shrink-0 text-blue-400" />
          <span className="shrink-0 text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityStorage')}</span>
        </div>
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
          <span className="vanity-summary-pill min-w-0 truncate rounded-full border border-surface-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-surface-600 dark:border-surface-700 dark:bg-surface-950/40 dark:text-surface-300">
            {vanityStorageSummary}
          </span>
          <ChevronDown size={16} className={`shrink-0 text-surface-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                <Copy size={13} /> {t('createWallet.vanityQuantity')}
              </label>
              <input
                type="number"
                min="1"
                value={vanityTargetCount}
                disabled={vanityGenerating}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setVanityTargetCount('');
                    return;
                  }
                  setVanityTargetCount(Math.max(1, Math.floor(Number(raw) || 1)));
                }}
                onBlur={() => setVanityTargetCount(vanitySafeTargetCount)}
                className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm font-semibold text-surface-950 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityQuantityHint')}</p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                <Wallet size={13} /> {t('createWallet.network')}
              </label>
              <InlineSelect
                value={vanityNetwork}
                disabled={vanityGenerating}
                onChange={setVanityNetwork}
                options={vanityNetworkOptions}
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                <Folder size={13} /> {t('home.folders')}
              </label>
              <InlineSelect
                value={vanityFolder}
                disabled={vanityGenerating}
                onChange={setVanityFolder}
                options={vanityFolderOptions}
              />
              <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityFolderHint')}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
              <Tag size={13} /> {t('createWallet.tags')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vanityTagInput}
                disabled={vanityGenerating}
                onChange={(e) => setVanityTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addVanityTag();
                  }
                }}
                placeholder={t('createWallet.tagPlaceholder')}
                className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-950 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:placeholder:text-surface-600"
              />
              <button
                type="button"
                disabled={vanityGenerating || !vanityTagInput.trim()}
                onClick={addVanityTag}
                className="rounded-lg border border-surface-200 bg-surface-50 px-3 text-sm font-semibold text-surface-700 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:text-brand-300"
              >
                {t('common.add')}
              </button>
            </div>
            {(vanityTags.length > 0 || allTags.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {vanityTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    disabled={vanityGenerating}
                    onClick={() => setVanityTags(prev => prev.filter(item => item !== tag))}
                    className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 disabled:opacity-50 dark:text-brand-300"
                  >
                    {tag} ×
                  </button>
                ))}
                {allTags.filter(tag => !vanityTags.includes(tag)).slice(0, 6).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    disabled={vanityGenerating}
                    onClick={() => setVanityTags(prev => [...prev, tag])}
                    className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 text-xs font-semibold text-surface-600 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:text-brand-300"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}