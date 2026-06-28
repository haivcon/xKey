import { AlertTriangle, ChevronDown, Gauge, ShieldCheck, Thermometer, Timer } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import { VANITY_TIME_LIMITS } from '../../constants';
import { formatCompactNumber, formatVanitySeconds } from '../../formatters';
import type { VanityPerformanceMode } from '../../types';

type VanityPerformanceSectionProps = {
  t: TranslationFn;
  expanded: boolean;
  vanityGenerating: boolean;
  vanityPerformanceMode: VanityPerformanceMode;
  setVanityPerformanceMode: (mode: VanityPerformanceMode) => void;
  vanityWorkerCount: number;
  vanityBatchSize: number;
  vanityTimeLimit: number;
  setVanityTimeLimit: (seconds: number) => void;
  vanityThermalMonitorEnabled: boolean;
  setVanityThermalMonitorEnabled: (enabled: boolean) => void;
  vanityThermalPauseEnabled: boolean;
  setVanityThermalPauseEnabled: (enabled: boolean) => void;
  vanityThermalWarningC: number;
  setVanityThermalWarningC: (value: number) => void;
  vanityThermalPauseC: number;
  setVanityThermalPauseC: (value: number) => void;
  vanityThermalCriticalC: number;
  setVanityThermalCriticalC: (value: number) => void;
  onToggle: () => void;
};

export function VanityPerformanceSection({
  t,
  expanded,
  vanityGenerating,
  vanityPerformanceMode,
  setVanityPerformanceMode,
  vanityWorkerCount,
  vanityBatchSize,
  vanityTimeLimit,
  setVanityTimeLimit,
  vanityThermalMonitorEnabled,
  setVanityThermalMonitorEnabled,
  vanityThermalPauseEnabled,
  setVanityThermalPauseEnabled,
  vanityThermalWarningC,
  setVanityThermalWarningC,
  vanityThermalPauseC,
  setVanityThermalPauseC,
  vanityThermalCriticalC,
  setVanityThermalCriticalC,
  onToggle,
}: VanityPerformanceSectionProps) {
  return (
    <section className={`vanity-step-card ${expanded ? 'is-open' : ''}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
        <div className="flex items-center gap-2">
          <span className="vanity-step-number">4</span>
          <Gauge size={16} className="text-orange-400" />
          <span className="text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityPerformanceSafety')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-scale-2xs font-bold text-orange-300 uppercase">{vanityPerformanceMode}</span>
          <ChevronDown size={16} className={`text-surface-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
              <Gauge size={13} /> {t('createWallet.vanityPerformance')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['eco', 'balanced', 'fast'] as VanityPerformanceMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  disabled={vanityGenerating}
                  onClick={() => setVanityPerformanceMode(mode)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanityPerformanceMode === mode ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                >
                  {t(`createWallet.vanityPerformance_${mode}`)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-scale-xs text-surface-500">
              {t(`createWallet.vanityPerformanceHint_${vanityPerformanceMode}`)} · {t('createWallet.vanityWorkers', { count: vanityWorkerCount })} · {t('createWallet.vanityBatch', { count: formatCompactNumber(vanityBatchSize) })}
            </p>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
              <Timer size={13} /> {t('createWallet.vanityTimeLimit')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VANITY_TIME_LIMITS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  disabled={vanityGenerating}
                  onClick={() => setVanityTimeLimit(seconds)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanityTimeLimit === seconds ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                >
                  {seconds === 0 ? t('createWallet.vanityNoLimit') : formatVanitySeconds(seconds)}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={vanityTimeLimit}
                disabled={vanityGenerating}
                onChange={(e) => {
                  const raw = e.target.value;
                  setVanityTimeLimit(Math.max(0, Math.floor(Number(raw) || 0)));
                }}
                className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-950 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                placeholder={t('createWallet.vanityCustomTimePlaceholder')}
              />
              <span className="shrink-0 text-scale-xs font-semibold text-surface-500">{t('createWallet.vanityTimeSeconds', { seconds: '' }).trim()}</span>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Thermometer size={18} className="mt-0.5 flex-shrink-0 text-cyan-500" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-cyan-700 dark:text-cyan-100">{t('createWallet.vanityThermalProtection')}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-700/85 dark:text-cyan-100/70">{t('createWallet.vanityThermalProtectionDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={vanityThermalMonitorEnabled}
                disabled={vanityGenerating}
                onClick={() => setVanityThermalMonitorEnabled(!vanityThermalMonitorEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${vanityThermalMonitorEnabled ? 'bg-cyan-500' : 'bg-surface-300 dark:bg-surface-700'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${vanityThermalMonitorEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-cyan-100">
              <input
                type="checkbox"
                checked={vanityThermalPauseEnabled}
                disabled={vanityGenerating || !vanityThermalMonitorEnabled}
                onChange={(e) => setVanityThermalPauseEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-cyan-400 bg-transparent text-cyan-500"
              />
              {t('createWallet.vanityThermalAutoPause')}
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: t('createWallet.vanityThermalWarningThreshold'), value: vanityThermalWarningC, setValue: setVanityThermalWarningC, min: 30 },
                { label: t('createWallet.vanityThermalPauseThreshold'), value: vanityThermalPauseC, setValue: setVanityThermalPauseC, min: 35 },
                { label: t('createWallet.vanityThermalCriticalThreshold'), value: vanityThermalCriticalC, setValue: setVanityThermalCriticalC, min: 40 },
              ].map(item => (
                <label key={item.label} className="block rounded-lg border border-cyan-400/20 bg-white/70 p-2 dark:bg-surface-950/60">
                  <span className="mb-1 block text-scale-2xs font-bold text-cyan-700 dark:text-cyan-200">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={item.min}
                      max="130"
                      value={item.value}
                      disabled={vanityGenerating || !vanityThermalMonitorEnabled}
                      onChange={(e) => item.setValue(Math.max(item.min, Math.min(130, Math.floor(Number(e.target.value) || item.value))))}
                      className="min-w-0 flex-1 rounded-md border border-cyan-400/25 bg-surface-50 px-2 py-1.5 text-xs font-bold text-surface-950 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:bg-surface-900 dark:text-white"
                    />
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-200">°C</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-orange-500" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-orange-700 dark:text-orange-100">{t('createWallet.vanityNoticeTitle')}</h4>
                <p className="mt-1 text-xs leading-relaxed text-orange-700/85 dark:text-orange-100/75">{t('createWallet.vanityHeatDesc')}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-scale-xs leading-relaxed text-orange-700/80 dark:text-orange-100/70">
                  <li>{t('createWallet.vanitySafeTipShortPattern')}</li>
                  <li>{t('createWallet.vanitySafeTipNoHotCharge')}</li>
                  <li>{t('createWallet.vanityHeatCooling')}</li>
                  <li>{t('createWallet.vanitySafeTipVentilation')}</li>
                  <li>{t('createWallet.vanityHeatRisk')}</li>
                  <li>{t('createWallet.vanityHeatFix')}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-500" />
              <div>
                <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-100">{t('createWallet.vanitySecurityTitle')}</h4>
                <p className="mt-1 text-xs leading-relaxed text-emerald-700/85 dark:text-emerald-100/75">{t('createWallet.vanitySecurityDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}