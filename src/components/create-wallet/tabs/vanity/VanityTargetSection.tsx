import { AlertCircle, BrainCircuit, ChevronDown, Gauge, ShieldCheck, Sparkles, Target, Timer, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import { VANITY_HEX_PATTERN } from '../../constants';
import { formatCompactNumber } from '../../formatters';
import type { VanityTabProps } from './VanityTabContent';

type VanityTargetSectionProps = {
  t: TranslationFn;
  expanded: boolean;
  vanityPrefix: VanityTabProps['vanityPrefix'];
  setVanityPrefix: Dispatch<SetStateAction<VanityTabProps['vanityPrefix']>>;
  vanitySuffix: VanityTabProps['vanitySuffix'];
  setVanitySuffix: Dispatch<SetStateAction<VanityTabProps['vanitySuffix']>>;
  vanityGenerating: boolean;
  vanityInvalidChars: VanityTabProps['vanityInvalidChars'];
  vanityPresetsExpanded: VanityTabProps['vanityPresetsExpanded'];
  setVanityPresetsExpanded: Dispatch<SetStateAction<VanityTabProps['vanityPresetsExpanded']>>;
  vanityHiddenPresetCount: VanityTabProps['vanityHiddenPresetCount'];
  visibleVanityPresetGroups: VanityTabProps['visibleVanityPresetGroups'];
  vanitySuffixClean: VanityTabProps['vanitySuffixClean'];
  applyVanitySuffixPattern: VanityTabProps['applyVanitySuffixPattern'];
  vanityCustomPattern: VanityTabProps['vanityCustomPattern'];
  setVanityCustomPattern: Dispatch<SetStateAction<VanityTabProps['vanityCustomPattern']>>;
  vanityHasPattern: VanityTabProps['vanityHasPattern'];
  vanityDifficultyAnalyzer: VanityTabProps['vanityDifficultyAnalyzer'];
  vanityPrefixClean: VanityTabProps['vanityPrefixClean'];
  vanityPatternLength: VanityTabProps['vanityPatternLength'];
  vanitySpeed: VanityTabProps['vanitySpeed'];
  onToggle: () => void;
};

export function VanityTargetSection({
  t,
  expanded,
  vanityPrefix,
  setVanityPrefix,
  vanitySuffix,
  setVanitySuffix,
  vanityGenerating,
  vanityInvalidChars,
  vanityPresetsExpanded,
  setVanityPresetsExpanded,
  vanityHiddenPresetCount,
  visibleVanityPresetGroups,
  vanitySuffixClean,
  applyVanitySuffixPattern,
  vanityCustomPattern,
  setVanityCustomPattern,
  vanityHasPattern,
  vanityDifficultyAnalyzer,
  vanityPrefixClean,
  vanityPatternLength,
  vanitySpeed,
  onToggle,
}: VanityTargetSectionProps) {
  return (
    <section className={`vanity-step-card ${expanded ? 'is-open' : ''}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
        <div className="flex items-center gap-2">
          <span className="vanity-step-number">2</span>
          <Sparkles size={16} className="text-brand-400" />
          <span className="text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityTitle') || 'Mục tiêu tìm kiếm'}</span>
        </div>
        <div className="flex items-center gap-2">
          {(vanityPrefix || vanitySuffix) && <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-scale-2xs font-bold text-brand-300">{vanityPrefix}...{vanitySuffix}</span>}
          <ChevronDown size={16} className={`text-surface-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-400">{t('createWallet.vanityPrefix') || 'Prefix'}</label>
              <input type="text" value={vanityPrefix} onChange={(e) => setVanityPrefix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. 123" disabled={vanityGenerating}
                className={`w-full rounded-lg border bg-surface-50 px-4 py-3 font-mono text-sm text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-900 dark:text-white ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'}`} />
              <p className="mt-1 text-scale-xs text-surface-500">{t('createWallet.vanityPrefixHint')}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-surface-400">{t('createWallet.vanitySuffix') || 'Suffix'}</label>
              <input type="text" value={vanitySuffix} onChange={(e) => setVanitySuffix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. abc" disabled={vanityGenerating}
                className={`w-full rounded-lg border bg-surface-50 px-4 py-3 font-mono text-sm text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-900 dark:text-white ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'}`} />
              <p className="mt-1 text-scale-xs text-surface-500">{t('createWallet.vanitySuffixHint')}</p>
            </div>
          </div>

          <div className="rounded-xl border border-surface-200/80 bg-white/60 p-2 dark:border-surface-700/80 dark:bg-surface-900/60">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-scale-2xs font-bold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                {t('createWallet.vanityPresets')}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVanityPresetsExpanded(prev => !prev)}
                  className="rounded-full border border-surface-200 bg-white px-2 py-0.5 text-scale-2xs font-semibold text-surface-600 transition-colors hover:border-brand-500 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-brand-400 dark:hover:text-brand-300"
                >
                  {vanityPresetsExpanded ? t('common.showLess') : t('common.showMore', { count: vanityHiddenPresetCount })}
                </button>
                {(vanityPrefix || vanitySuffix) && (
                  <button
                    type="button"
                    disabled={vanityGenerating}
                    onClick={() => {
                      setVanityPrefix('');
                      setVanitySuffix('');
                    }}
                    className="rounded-full border border-surface-200 bg-white px-2 py-0.5 text-scale-2xs font-semibold text-surface-600 transition-colors hover:border-surface-300 hover:text-surface-950 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500 dark:hover:text-white"
                  >
                    {t('createWallet.clearPattern')}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {visibleVanityPresetGroups.map((group) => (
                <div key={group.key} className="flex min-w-0 items-center gap-1.5">
                  <div className="flex w-20 shrink-0 items-center gap-1 overflow-hidden sm:w-24">
                    <span
                      aria-hidden="true"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-scale-2xs dark:bg-brand-500/15"
                    >
                      {group.icon}
                    </span>
                    <span className="min-w-0 truncate text-scale-2xs font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300">
                      {t(`createWallet.${group.labelKey}`)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                    {group.items.map((preset) => {
                      const active = vanitySuffixClean === preset.toLowerCase();
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={vanityGenerating}
                          onClick={() => applyVanitySuffixPattern(preset)}
                          className={`min-w-[3.25rem] rounded-md border px-2 py-1 font-mono text-scale-2xs font-bold leading-none transition-colors disabled:opacity-50 ${
                            active
                              ? 'border-brand-500 bg-brand-500/15 text-brand-700 shadow-sm shadow-brand-500/10 dark:text-brand-200'
                              : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-brand-500 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-950/50 dark:text-surface-200 dark:hover:text-brand-300'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-surface-200/70 pt-2 dark:border-surface-700/70">
              <label className="shrink-0 text-scale-2xs font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300">
                {t('createWallet.vanityCustomPattern')}
              </label>
              <input
                type="text"
                value={vanityCustomPattern}
                disabled={vanityGenerating}
                onChange={(e) => setVanityCustomPattern(e.target.value.replace(/\s/g, '').slice(0, 12))}
                placeholder="e.g. babe"
                className={`min-w-[7rem] flex-1 rounded-md border bg-surface-50 px-2 py-1.5 font-mono text-scale-xs font-semibold text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-950/50 dark:text-white ${
                  vanityCustomPattern && !VANITY_HEX_PATTERN.test(vanityCustomPattern)
                    ? 'border-red-500/60 focus:border-red-400'
                    : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'
                }`}
              />
              <button
                type="button"
                disabled={vanityGenerating || !vanityCustomPattern || !VANITY_HEX_PATTERN.test(vanityCustomPattern)}
                onClick={() => applyVanitySuffixPattern(vanityCustomPattern)}
                className="shrink-0 rounded-md border border-brand-500/40 bg-brand-500/10 px-2 py-1.5 text-scale-2xs font-bold text-brand-700 transition-colors hover:bg-brand-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-200"
              >
                {t('createWallet.vanityApplyCustom')}
              </button>
              <button
                type="button"
                disabled={vanityGenerating || !vanityCustomPattern}
                onClick={() => {
                  const appliedCustomPattern = vanityCustomPattern.trim().toLowerCase();
                  setVanityCustomPattern('');
                  if (vanitySuffixClean === appliedCustomPattern) setVanitySuffix('');
                }}
                title={t('common.delete')}
                aria-label={t('common.delete')}
                className="shrink-0 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-scale-2xs font-bold text-red-600 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {vanityHasPattern && vanityDifficultyAnalyzer ? (
            <div className={`rounded-xl border ${vanityDifficultyAnalyzer.diffTone} p-4`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="flex min-w-0 items-center gap-2 text-sm font-bold">
                  <BrainCircuit size={16} className="shrink-0" /> <span className="min-w-0 truncate">{t('createWallet.vanityPatternAnalyzer')}</span>
                </h4>
                <span className={`shrink-0 rounded px-2 py-0.5 text-scale-xs font-bold uppercase tracking-wider ${vanityDifficultyAnalyzer.difficultyBadgeTone}`}>
                  {vanityDifficultyAnalyzer.difficultyLabel}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                  <div className="mb-1 flex items-center gap-2 text-scale-xs font-semibold opacity-70">
                    <Gauge size={14} /> {t('createWallet.vanityProbability')}
                  </div>
                  <div className="font-mono text-sm font-extrabold">1 / {formatCompactNumber(vanityDifficultyAnalyzer.combinations)}</div>
                </div>
                <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                  <div className="mb-1 flex items-center gap-2 text-scale-xs font-semibold opacity-70">
                    <Timer size={14} /> {t('createWallet.vanityEstimatedTime')}
                  </div>
                  <div className="text-sm font-extrabold">{vanityDifficultyAnalyzer.timeLabel}</div>
                </div>
                <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                  <div className="mb-1 flex items-center gap-2 text-scale-xs font-semibold opacity-70">
                    <Target size={14} /> {t('createWallet.vanityPatternType')}
                  </div>
                  <div className="text-sm font-extrabold">{vanityDifficultyAnalyzer.hasBoth ? t('createWallet.vanityPatternBoth') : (vanityPrefixClean ? t('createWallet.vanityPatternPrefix') : t('createWallet.vanityPatternSuffix'))}</div>
                </div>
                <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                  <div className="mb-1 flex items-center gap-2 text-scale-xs font-semibold opacity-70">
                    <ShieldCheck size={14} /> {t('createWallet.vanityLocal')}
                  </div>
                  <div className="text-sm font-extrabold">{vanitySpeed > 0 ? t('createWallet.vanitySpeedValue', { speed: formatCompactNumber(Math.round(vanityDifficultyAnalyzer.effectiveSpeed)) }) : t('createWallet.vanityOffline')}</div>
                  <div className="mt-0.5 text-scale-2xs font-semibold opacity-70">{vanityDifficultyAnalyzer.sourceLabel}</div>
                </div>
              </div>

              {vanityDifficultyAnalyzer.hasBoth && (
                <p className="mt-3 flex items-start gap-1.5 rounded bg-white/45 p-2 text-scale-xs opacity-80 dark:bg-black/10">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {t('createWallet.vanityBothWarning')}
                </p>
              )}
              {vanityPatternLength > 6 && (
                <p className="mt-2 flex items-start gap-1.5 rounded bg-white/45 p-2 text-scale-xs opacity-80 dark:bg-black/10">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {t('createWallet.vanityLengthWarning')}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}