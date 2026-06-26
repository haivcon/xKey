import type { Dispatch, SetStateAction } from 'react';
import { Check, ChevronDown, Info, ShieldCheck } from 'lucide-react';
import type { TranslationFn } from '../../contexts/LanguageContext';

type PostQuantumOptionsProps = {
  t: TranslationFn;
  postQuantumMode: boolean;
  setPostQuantumMode: Dispatch<SetStateAction<boolean>>;
  showPostQuantumOptions: boolean;
  setShowPostQuantumOptions: Dispatch<SetStateAction<boolean>>;
  rotationReminderMonths: number;
  setRotationReminderMonths: Dispatch<SetStateAction<number>>;
};

export function PostQuantumOptions({
  t,
  postQuantumMode,
  setPostQuantumMode,
  showPostQuantumOptions,
  setShowPostQuantumOptions,
  rotationReminderMonths,
  setRotationReminderMonths,
}: PostQuantumOptionsProps) {
  return (
    <section className={`rounded-xl border transition-colors overflow-hidden ${postQuantumMode ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/40'}`}>
      <div
        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-700/50 transition-colors"
        onClick={() => setShowPostQuantumOptions(!showPostQuantumOptions)}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <ShieldCheck size={18} className={`shrink-0 ${postQuantumMode ? 'text-emerald-500 dark:text-emerald-400' : 'text-surface-400'}`} />
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[11px] font-semibold text-surface-900 dark:text-white truncate">{t('keyHealth.pqCreateTitle')}</h3>
              <span className="shrink-0 rounded bg-brand-500/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                {t('keyHealth.pqAdvancedBadge')}
              </span>
            </div>
            <p className="text-[9px] text-surface-500 dark:text-surface-400 mt-0.5 truncate">{t('keyHealth.pqCreateDesc')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            type="button"
            role="switch"
            aria-checked={postQuantumMode}
            onClick={(event) => {
              event.stopPropagation();
              setPostQuantumMode(!postQuantumMode);
              if (!postQuantumMode && !showPostQuantumOptions) setShowPostQuantumOptions(true);
            }}
            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${postQuantumMode ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'}`}
          >
            <span className="sr-only">{postQuantumMode ? t('common.enabled') : t('common.disabled')}</span>
            <span aria-hidden="true" className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${postQuantumMode ? 'translate-x-1.5' : '-translate-x-1.5'}`} />
          </button>
          <ChevronDown size={14} className={`text-surface-400 transition-transform ${showPostQuantumOptions ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {showPostQuantumOptions && (
        <div className="px-2.5 pb-2.5">
          <div className="space-y-2.5 pt-2.5 border-t border-surface-200 dark:border-surface-700/50">
            <div className="flex flex-col">
              <div className="mb-1.5 text-[9px] font-bold text-surface-600 dark:text-surface-400">
                {t('keyHealth.rotationCadence')}
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 w-full">
                {[
                  { value: 6, label: t('keyHealth.rotation6mo'), desc: t('keyHealth.rotation6moDesc') },
                  { value: 12, label: t('keyHealth.rotation1y'), desc: t('keyHealth.rotation1yDesc') },
                  { value: 36, label: t('keyHealth.rotation3y'), desc: t('keyHealth.rotation3yDesc') },
                ].map((option) => {
                  const active = rotationReminderMonths === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRotationReminderMonths(option.value)}
                      className={`flex-1 flex flex-col items-start rounded border p-1.5 transition-colors ${active ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-100 shadow-sm' : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900/70 text-surface-600 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-300 dark:border-surface-600'}`}>
                          {active && <Check size={6} />}
                        </span>
                        <span className="text-[10px] font-bold">{option.label}</span>
                      </div>
                      <span className="text-[8px] leading-snug opacity-80 pl-3.5 text-left">{option.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {postQuantumMode && (
              <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-[9px] leading-relaxed text-emerald-800 dark:text-emerald-200 w-full flex items-start gap-1">
                <Info size={10} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t('keyHealth.pqBetaWarning')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}