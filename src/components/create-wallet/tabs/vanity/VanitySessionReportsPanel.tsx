import { Activity, Clock, Gauge, History, Trash2 } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import type { VanitySessionReport } from '../../../../hooks/vanity/vanitySessionReport';

type VanitySessionReportsPanelProps = {
  t: TranslationFn;
  reports: VanitySessionReport[];
  onClearReports: () => void;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
};

const formatPattern = (report: VanitySessionReport) => {
  const parts = [
    report.pattern.prefix ? `^${report.pattern.prefix}` : '',
    report.pattern.suffix ? `${report.pattern.suffix}$` : '',
    ...(report.pattern.customPatterns || []),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
};

const formatNumber = (value: number) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString();

export function VanitySessionReportsPanel({ t, reports, onClearReports }: VanitySessionReportsPanelProps) {
  if (!reports.length) return null;

  return (
    <section className="rounded-2xl border border-surface-200 bg-surface-50/80 p-4 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-800/40 dark:shadow-none">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History size={16} className="text-brand-600 dark:text-brand-300" />
            <h3 className="text-sm font-extrabold text-surface-900 dark:text-surface-50">
              {t('createWallet.vanitySessionReportsTitle')}
            </h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-300">
            {t('createWallet.vanitySessionReportsDesc')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-2 py-0.5 text-scale-2xs font-bold text-brand-700 dark:text-brand-100">
            {reports.length}
          </span>
          <button
            type="button"
            onClick={onClearReports}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-200"
            title={t('createWallet.vanitySessionReportsClear')}
            aria-label={t('createWallet.vanitySessionReportsClear')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {reports.slice(0, 5).map(report => (
          <article
            key={report.id}
            className="rounded-xl border border-surface-200 bg-white/70 p-3 dark:border-surface-700 dark:bg-surface-900/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-surface-900 dark:text-surface-50">
                  {formatPattern(report)}
                </p>
                <p className="mt-0.5 text-scale-2xs text-surface-500 dark:text-surface-400">
                  {formatDateTime(report.endedAt)} · {report.pattern.network} ·{' '}
                  {t(`createWallet.vanityReportStatus_${report.result.status}`)}
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-scale-2xs font-bold text-emerald-700 dark:text-emerald-100">
                {report.result.foundCount}/{report.result.savedCount}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-scale-2xs">
              <div className="rounded-lg bg-surface-100/80 p-2 dark:bg-surface-800/70">
                <span className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                  <Clock size={12} />
                  {t('createWallet.vanityReportDuration')}
                </span>
                <strong className="mt-1 block text-surface-900 dark:text-surface-50">
                  {formatDuration(report.durationSeconds)}
                </strong>
              </div>
              <div className="rounded-lg bg-surface-100/80 p-2 dark:bg-surface-800/70">
                <span className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                  <Gauge size={12} />
                  {t('createWallet.vanityReportSpeed')}
                </span>
                <strong className="mt-1 block text-surface-900 dark:text-surface-50">
                  {formatNumber(report.speedPerSecond)}/s
                </strong>
              </div>
              <div className="rounded-lg bg-surface-100/80 p-2 dark:bg-surface-800/70">
                <span className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                  <Activity size={12} />
                  {t('createWallet.vanityReportCandidates')}
                </span>
                <strong className="mt-1 block text-surface-900 dark:text-surface-50">
                  {formatNumber(report.candidateCount)}
                </strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}