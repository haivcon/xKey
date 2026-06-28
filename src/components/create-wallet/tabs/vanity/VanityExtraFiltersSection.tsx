import type { Dispatch, SetStateAction } from 'react';
import { ChevronDown, Folder, Info, Star } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import { InlineSelect } from '../../components';
import { VANITY_EXTRA_FILTER_KEYS, VANITY_EXTRA_LIMITS } from '../../constants';
import { buildVanityExtraFilterPreview } from '../../vanityPreview';
import type { VanityExtraFilterConfig, VanityExtraFilterRule, VanityExtraPatternKey } from '../../../../utils/vanity/vanityMatch';

type VanityExtraFiltersSectionProps = {
  t: TranslationFn;
  expanded: boolean;
  vanityCaptureExtras: boolean;
  setVanityCaptureExtras: (enabled: boolean) => void;
  vanityGenerating: boolean;
  vanityExtraSummary: string;
  vanitySafeExtraLimit: number;
  vanityExtraLimit: string | number;
  setVanityExtraLimit: Dispatch<SetStateAction<string | number>>;
  vanityExtraFolder: string;
  setVanityExtraFolder: (folder: string) => void;
  vanityExtraFolderOptions: { value: string; label: string }[];
  vanityExtraFolderLabel: string;
  vanityEnabledExtraFilterCount: number;
  vanitySafeExtraFilters: VanityExtraFilterConfig;
  vanitySafeExtraMinRun: number;
  vanityExtraMinRunDrafts: Record<string, string>;
  setVanityExtraMinRunDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  updateVanityExtraFilter: (key: VanityExtraPatternKey, patch: Partial<VanityExtraFilterRule>) => void;
  getVanityExtraMinRunValue: (key: VanityExtraPatternKey, fallback: number) => number;
  commitVanityExtraMinRun: (key: VanityExtraPatternKey, fallback: number) => void;
  stepVanityExtraMinRun: (key: VanityExtraPatternKey, fallback: number, delta: number) => void;
  onToggle: () => void;
};

export function VanityExtraFiltersSection({
  t,
  expanded,
  vanityCaptureExtras,
  setVanityCaptureExtras,
  vanityGenerating,
  vanityExtraSummary,
  vanitySafeExtraLimit,
  vanityExtraLimit,
  setVanityExtraLimit,
  vanityExtraFolder,
  setVanityExtraFolder,
  vanityExtraFolderOptions,
  vanityExtraFolderLabel,
  vanityEnabledExtraFilterCount,
  vanitySafeExtraFilters,
  vanitySafeExtraMinRun,
  vanityExtraMinRunDrafts,
  setVanityExtraMinRunDrafts,
  updateVanityExtraFilter,
  getVanityExtraMinRunValue,
  commitVanityExtraMinRun,
  stepVanityExtraMinRun,
  onToggle,
}: VanityExtraFiltersSectionProps) {
  return (
    <section className={`vanity-step-card ${expanded ? 'is-open' : ''} ${
      vanityCaptureExtras
        ? 'border-cyan-500/25 bg-cyan-500/5 shadow-sm shadow-cyan-500/5'
        : 'border-surface-200 bg-surface-50/70 dark:border-surface-700 dark:bg-surface-900/50'
    }`}>
      <div className={`border-b px-4 py-3 transition-colors ${
        vanityCaptureExtras
          ? 'border-cyan-500/20 bg-gradient-to-r from-cyan-500/12 via-cyan-500/[0.06] to-transparent'
          : 'border-surface-200 bg-surface-50/80 dark:border-surface-700/50 dark:bg-surface-800/40'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-opacity hover:opacity-85"
          >
            <span className="vanity-step-number">5</span>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
              vanityCaptureExtras
                ? 'border-cyan-400/25 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
                : 'border-surface-200 bg-white text-surface-400 dark:border-surface-700 dark:bg-surface-900'
            }`}>
              <Star size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-bold ${
                vanityCaptureExtras ? 'text-cyan-800 dark:text-cyan-100' : 'text-surface-950 dark:text-white'
              }`}>
                {t('createWallet.vanityExtraCaptureTitle')}
              </span>
              <span className="mt-0.5 block truncate text-scale-xs text-surface-500 dark:text-surface-400">
                {vanityCaptureExtras ? vanityExtraSummary : t('common.disabled')}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <span className={`hidden max-w-[150px] truncate rounded-full border px-2 py-1 text-scale-2xs font-bold sm:inline-flex ${
              vanityCaptureExtras
                ? 'border-cyan-400/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200'
                : 'border-surface-200 bg-white text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400'
            }`}>
              {vanityExtraSummary}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={vanityCaptureExtras}
              disabled={vanityGenerating}
              onClick={() => setVanityCaptureExtras(!vanityCaptureExtras)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                vanityCaptureExtras ? 'bg-cyan-500' : 'bg-surface-300 dark:bg-surface-700'
              }`}
            >
              <span className="sr-only">{vanityCaptureExtras ? t('common.enabled') : t('common.disabled')}</span>
              <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  vanityCaptureExtras ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
            >
              <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className={`space-y-4 p-4 transition-opacity ${vanityCaptureExtras ? 'opacity-100' : 'opacity-70'}`}>
          <div className={`rounded-xl border p-3 text-xs leading-relaxed ${
            vanityCaptureExtras
              ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-700 dark:text-cyan-100/80'
              : 'border-surface-200 bg-white/70 text-surface-600 dark:border-surface-700 dark:bg-surface-900/70 dark:text-surface-400'
          }`}>
            <div className="flex items-start gap-2">
              <Info size={15} className="mt-0.5 shrink-0 text-cyan-500" />
              <span>{t('createWallet.vanityExtraCaptureDesc')}</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-surface-200 bg-white/80 p-3 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-900/75 dark:shadow-black/10">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-surface-800 dark:text-surface-100">{t('createWallet.vanityExtraLimit')}</label>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-scale-2xs font-bold text-cyan-700 dark:text-cyan-200">
                  {vanitySafeExtraLimit}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {VANITY_EXTRA_LIMITS.map(count => (
                  <button
                    key={count}
                    type="button"
                    disabled={vanityGenerating || !vanityCaptureExtras}
                    onClick={() => setVanityExtraLimit(count)}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${vanitySafeExtraLimit === count ? 'border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-100' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-cyan-400/60 hover:bg-cyan-50 dark:border-surface-700 dark:bg-surface-950/60 dark:text-surface-300 dark:hover:border-cyan-500/50'} disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"

                value={vanityExtraLimit}
                disabled={vanityGenerating || !vanityCaptureExtras}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setVanityExtraLimit('');
                    return;
                  }
                  setVanityExtraLimit(Math.max(1, Math.floor(Number(raw) || 1)));
                }}
                onBlur={() => setVanityExtraLimit(vanitySafeExtraLimit)}
                placeholder={t('common.custom')}
                className="mt-2 w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-950 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-950/60 dark:text-white"
              />
            </div>

            <div className="rounded-xl border border-surface-200 bg-white/80 p-3 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-900/75 dark:shadow-black/10">
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-surface-800 dark:text-surface-100">
                <Folder size={13} className="text-cyan-500" /> {t('createWallet.vanityExtraFolder')}
              </label>
              <InlineSelect
                value={vanityExtraFolder}
                disabled={vanityGenerating || !vanityCaptureExtras}
                onChange={setVanityExtraFolder}
                options={vanityExtraFolderOptions}
              />
              <div className="mt-2 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-2.5 py-2 text-scale-xs font-semibold text-cyan-700 dark:text-cyan-200">
                {vanityExtraFolderLabel}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 bg-white/80 p-3 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-900/75 dark:shadow-black/10">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-surface-900 dark:text-white">{t('createWallet.vanityExtraFilterTitle')}</p>
                <p className="mt-0.5 text-scale-xs leading-relaxed text-surface-600 dark:text-surface-400">{t('createWallet.vanityExtraFilterDesc')}</p>
              </div>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-scale-2xs font-bold text-cyan-700 dark:text-cyan-200">
                {vanityEnabledExtraFilterCount}/{VANITY_EXTRA_FILTER_KEYS.length}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {VANITY_EXTRA_FILTER_KEYS.map((key) => {
                const rule = vanitySafeExtraFilters[key];
                const enabled = !!rule.enabled;
                const preview = buildVanityExtraFilterPreview(key, rule, rule.minRun || vanitySafeExtraMinRun);
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-2.5 transition-colors ${
                      enabled
                        ? 'border-cyan-400/40 bg-cyan-500/10'
                        : 'border-surface-200 bg-surface-50/80 dark:border-surface-700 dark:bg-surface-950/60'
                    } ${!vanityCaptureExtras ? 'pointer-events-none' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        disabled={vanityGenerating || !vanityCaptureExtras}
                        onClick={() => updateVanityExtraFilter(key, { enabled: !enabled })}
                        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          enabled ? 'bg-cyan-500' : 'bg-surface-300 dark:bg-surface-700'
                        }`}
                      >
                        <span className="sr-only">{enabled ? t('common.enabled') : t('common.disabled')}</span>
                        <span
                          aria-hidden="true"
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-surface-950 dark:text-white">{t(`createWallet.vanityExtraFilter_${key}`)}</p>
                        <p className="mt-0.5 line-clamp-2 text-scale-2xs leading-relaxed text-surface-600 dark:text-surface-400">{t(`createWallet.vanityExtraFilterHint_${key}`)}</p>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg border border-cyan-400/20 bg-white/75 px-2 py-1.5 font-mono text-scale-2xs font-semibold leading-relaxed text-surface-600 shadow-inner dark:border-cyan-400/15 dark:bg-surface-950/70 dark:text-surface-300">
                      <span className="mb-1 block font-sans text-scale-3xs font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">{t('createWallet.vanityExtraFilterPreview')}</span>
                      <span className="break-all">
                        {preview.segments.map((segment, segmentIndex) => segment.highlight ? (
                          <mark key={`${key}-preview-${segmentIndex}`} className="rounded bg-amber-300/80 px-0.5 font-black text-amber-950 dark:bg-amber-400/80">{segment.text}</mark>
                        ) : (
                          <span key={`${key}-preview-${segmentIndex}`}>{segment.text}</span>
                        ))}
                      </span>
                    </div>

                    {key !== 'lucky' ? (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-surface-200 bg-white/70 px-2 py-1.5 dark:border-surface-700 dark:bg-surface-900/70">
                        <span className="text-scale-2xs font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityExtraFilterMin')}</span>
                        <div className="inline-flex items-center overflow-hidden rounded-md border border-surface-200 bg-surface-50 focus-within:border-cyan-500 dark:border-surface-700 dark:bg-surface-950">
                          <button
                            type="button"
                            disabled={vanityGenerating || !vanityCaptureExtras || !enabled || getVanityExtraMinRunValue(key, rule.minRun || vanitySafeExtraMinRun) <= 3}
                            onClick={() => stepVanityExtraMinRun(key, rule.minRun || vanitySafeExtraMinRun, -1)}
                            className="flex h-6 w-6 items-center justify-center border-r border-surface-200 text-xs font-black text-cyan-700 transition-colors hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-35 dark:border-surface-700 dark:text-cyan-200"
                            aria-label="-"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="3"
                            max="12"
                            value={vanityExtraMinRunDrafts[key] ?? String(rule.minRun || vanitySafeExtraMinRun)}
                            disabled={vanityGenerating || !vanityCaptureExtras || !enabled}
                            onChange={(event) => setVanityExtraMinRunDrafts(prev => ({ ...prev, [key]: event.target.value }))}
                            onBlur={() => commitVanityExtraMinRun(key, rule.minRun || vanitySafeExtraMinRun)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.currentTarget.blur();
                              }
                            }}
                            className="h-6 w-9 border-0 bg-transparent px-1 text-center text-scale-xs font-extrabold text-surface-950 focus:outline-none disabled:opacity-50 dark:text-white"
                          />
                          <button
                            type="button"
                            disabled={vanityGenerating || !vanityCaptureExtras || !enabled || getVanityExtraMinRunValue(key, rule.minRun || vanitySafeExtraMinRun) >= 12}
                            onClick={() => stepVanityExtraMinRun(key, rule.minRun || vanitySafeExtraMinRun, 1)}
                            className="flex h-6 w-6 items-center justify-center border-l border-surface-200 text-xs font-black text-cyan-700 transition-colors hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-35 dark:border-surface-700 dark:text-cyan-200"
                            aria-label="+"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={(rule.patterns || []).join(', ')}
                        disabled={vanityGenerating || !vanityCaptureExtras || !enabled}
                        onChange={(event) => updateVanityExtraFilter(key, { patterns: event.target.value.split(',') })}
                        placeholder="888, 666, 168"
                        className="mt-2 w-full rounded-lg border border-surface-200 bg-white/70 px-2 py-1.5 text-xs font-semibold text-surface-950 placeholder:text-surface-400 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900/70 dark:text-white dark:placeholder:text-surface-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}