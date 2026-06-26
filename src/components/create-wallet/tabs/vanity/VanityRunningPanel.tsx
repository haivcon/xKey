import { AlertTriangle, BrainCircuit, Check, ChevronDown, Copy, Gauge, Maximize2, Pause, Play, RefreshCw, Save, ShieldCheck, Sparkles, Square, Target, Timer, Trash2 } from 'lucide-react';
import { formatCompactNumber, formatVanitySeconds } from '../../formatters';
import { VanityExtraWalletCard } from './VanityExtraWalletCard';
import type { VanityTabProps } from './VanityTabContent';

export function VanityRunningPanel(props: VanityTabProps) {
  const {
    t,
    copiedField,
    generatedWallets,
    handleCopy,
    selectedVanityAddresses,
    vanityBatchSize,
    vanityCandidates,
    vanityCaptureExtras,
    vanityEffectiveThroughput,
    vanityEtaSeconds,
    vanityExpandedSections,
    vanityExtraWallets,
    vanityGeneratorExpanded,
    setVanityGeneratorExpanded,
    vanityPaused,
    setVanityPaused,
    vanityPerformanceMode,
    vanityPrefixClean,
    vanityProgress,
    vanityProgressPercentLabel,
    vanityRemainingPrimary,
    vanitySafeExtraLimit,
    vanitySafeTargetCount,
    vanitySavedRef,
    vanityScanned,
    vanitySpeed,
    vanitySuffixClean,
    vanityTime,
    vanityWorkerCount,
    vanityCanResume,
    clearVanityExtraWallets,
    getVanityExtraLabel,
    getVanityScoreTone,
    pauseVanity,
    removeVanityExtraWallet,
    removeVanityPrimaryWallet,
    renderVanityAddress,
    renderVanityExtraAddress,
    saveAllVanityExtraWallets,
    saveSingleVanityWallet,
    startVanity,
    stopVanity,
    toggleVanitySection,
    toggleVanitySelection,
  } = props;

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-brand-200 bg-brand-50/80 p-4 shadow-sm dark:border-brand-500/25 dark:bg-brand-500/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-400/30 bg-brand-500/10 ${vanityPaused ? '' : 'animate-pulse'}`}>
              {vanityPaused ? <Pause size={17} className="text-amber-300" /> : <Sparkles size={17} className="text-brand-300" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-surface-950 dark:text-white">{vanityPaused ? t('createWallet.vanityPaused') : t('createWallet.vanityGeneratingCount', { current: generatedWallets.length, total: vanitySafeTargetCount })}</p>
              <p className="mt-0.5 text-[11px] text-surface-600 dark:text-surface-400">{vanityPrefixClean || vanitySuffixClean ? `0x${vanityPrefixClean}...${vanitySuffixClean}` : t('createWallet.vanityScanning')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-2 py-1 text-xs font-bold text-brand-200">{generatedWallets.length}/{vanitySafeTargetCount}</span>
            <button
              type="button"
              onClick={() => setVanityGeneratorExpanded(prev => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-400/25 bg-white/70 text-brand-600 transition-colors hover:bg-brand-100 dark:bg-surface-950/60 dark:text-brand-200 dark:hover:bg-brand-500/15"
              aria-label={vanityGeneratorExpanded ? t('common.collapse') : t('common.expand')}
            >
              <ChevronDown size={16} className={`transition-transform ${vanityGeneratorExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {vanityGeneratorExpanded && (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full border border-surface-200 bg-surface-100 dark:border-surface-700/50 dark:bg-surface-900">
              <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300 shadow-[0_0_8px_rgba(14,165,233,0.5)]" style={{ width: `${Math.max(vanityProgress, 2)}%` }} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {[
                { icon: Target, label: t('createWallet.vanityScanned'), value: formatCompactNumber(vanityScanned), tone: 'border-blue-400/20 bg-blue-500/10 text-blue-500 dark:text-blue-300' },
                { icon: Gauge, label: t('createWallet.vanitySpeed'), value: vanitySpeed > 0 ? t('createWallet.vanitySpeedValue', { speed: formatCompactNumber(vanitySpeed) }) : t('createWallet.vanitySpeedMeasuring'), tone: 'border-brand-400/25 bg-brand-500/15 text-brand-600 dark:text-brand-200' },
                { icon: Timer, label: t('createWallet.vanityElapsed'), value: formatVanitySeconds(vanityTime), tone: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300' },
                { icon: RefreshCw, label: t('createWallet.vanityEstimatedTime'), value: vanitySpeed > 0 && vanityRemainingPrimary > 0 ? formatVanitySeconds(vanityEtaSeconds) : '--', tone: 'border-amber-400/20 bg-amber-500/10 text-amber-500 dark:text-amber-300' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex min-w-0 items-center gap-2 rounded-xl border border-surface-200 bg-white/85 px-2 py-2 shadow-sm shadow-surface-900/5 dark:border-surface-700/70 dark:bg-surface-950/70">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${stat.tone}`}><Icon size={13} /></span>
                    <span className="min-w-0">
                      <p className="truncate text-[9px] font-bold uppercase tracking-wide text-surface-500">{stat.label}</p>
                      <p className="truncate font-mono text-xs font-extrabold text-surface-950 dark:text-white">{stat.value}</p>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-orange-300/40 bg-gradient-to-r from-orange-50 to-amber-50/50 px-2.5 py-2 text-[10px] font-bold text-orange-800 shadow-sm shadow-orange-900/5 dark:border-orange-500/25 dark:from-orange-500/10 dark:to-amber-500/5 dark:text-orange-100">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-orange-400/25 bg-orange-500/15 text-orange-600 dark:text-orange-300"><ShieldCheck size={12} /></span>
              <span className="uppercase">{vanityPerformanceMode}</span>
              <span className="text-orange-500/60">·</span>
              <span className="inline-flex items-center gap-1"><Maximize2 size={11} />{vanityProgressPercentLabel}</span>
              <span className="text-orange-500/60">·</span>
              <span className="inline-flex items-center gap-1"><BrainCircuit size={11} />{vanityWorkerCount} × {formatCompactNumber(vanityBatchSize)}</span>
              <span className="text-orange-500/60">·</span>
              <span>{t('createWallet.vanityChunk', { chunk: formatCompactNumber(vanityEffectiveThroughput) })}</span>
              <span className="text-orange-500/60">·</span>
              <span>{t('createWallet.vanityExtra', { current: vanityExtraWallets.length, total: vanitySafeExtraLimit })}</span>
            </div>

            <div className="mt-2 overflow-hidden rounded-xl border border-surface-200 bg-surface-50/85 font-mono text-[11px] shadow-inner shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-950/90 dark:shadow-black/20">
              <div className="flex items-center justify-between border-b border-surface-200/70 px-2.5 py-1.5 text-surface-500 dark:border-surface-700/70 dark:text-surface-400">
                <span className="inline-flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wide">
                  <Gauge size={12} />
                  {t('createWallet.vanityTerminal')}
                </span>
                <span>{vanityCandidates.length}/12</span>
              </div>
              <div className="grid max-h-40 grid-cols-1 gap-1 overflow-hidden p-2 sm:grid-cols-2">
                {vanityCandidates.length === 0 ? <div className="text-surface-500">{t('createWallet.vanityScanning')}</div> : vanityCandidates.slice(-12).map((candidate, index) => {
                  const copyKey = `vanity-candidate-${candidate.address}-${index}`;
                  return (
                    <div key={`${candidate.address}-${index}`} className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-1.5 py-1 ${candidate.matched ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-surface-200/70 bg-white/55 text-surface-600 dark:border-surface-800 dark:bg-surface-900/60 dark:text-surface-400'}`}>
                      {candidate.matched ? <Sparkles size={11} className="shrink-0" /> : <Gauge size={11} className="shrink-0" />}
                      <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[10px] leading-tight">{renderVanityAddress(candidate.address, true)}</span>
                      <button type="button" onClick={() => handleCopy(candidate.address, copyKey)} className="shrink-0 rounded p-0.5 text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:hover:bg-surface-800 dark:hover:text-white" aria-label={t('common.copy')}>{copiedField === copyKey ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <details className="group mt-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700/80 transition-colors open:bg-amber-500/10 dark:text-amber-200/80">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 animate-pulse text-amber-500" />
                  <span className="truncate">{t('createWallet.vanityNoticeTitle')}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-700 transition-colors group-open:bg-amber-500/20 dark:text-amber-200">
                  <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                  {t('common.expandDetails')}
                </span>
              </summary>
              <ul className="mt-2 space-y-1 pl-5 leading-relaxed list-disc">
                <li>{t('createWallet.vanityHeatDesc')}</li>
                <li>{t('createWallet.vanitySafeTipShortPattern')}</li>
                <li>{t('createWallet.vanitySafeTipNoHotCharge')}</li>
                <li>{t('createWallet.vanityHeatCooling')}</li>
                <li>{t('createWallet.vanitySafeTipVentilation')}</li>
              </ul>
            </details>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-sm shadow-emerald-900/5 dark:border-emerald-500/20 dark:bg-surface-950/60 dark:shadow-emerald-950/10">
        <div className="border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.04] to-transparent px-3 py-2.5">
          <button type="button" onClick={() => toggleVanitySection('primary')} className="flex w-full items-center justify-between gap-3 text-left transition-opacity hover:opacity-85">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300">
                <Target size={14} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-emerald-800 dark:text-emerald-100">{t('createWallet.vanityPrimaryMatches')}</p>
                <p className="mt-0.5 truncate text-[10px] text-emerald-700/75 dark:text-emerald-100/55">{vanityPrefixClean || vanitySuffixClean ? `0x${vanityPrefixClean}...${vanitySuffixClean}` : t('createWallet.vanityScanning')}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-100">{generatedWallets.length}/{vanitySafeTargetCount}</span>
              <ChevronDown size={14} className={`text-emerald-600 dark:text-emerald-400 transition-transform ${vanityExpandedSections.primary ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>
        {vanityExpandedSections.primary && (
          <div className="max-h-80 space-y-1 overflow-y-auto p-1.5">
            {generatedWallets.length === 0 ? <p className="px-2 py-3 text-center text-[11px] text-emerald-600/70 dark:text-emerald-200/50">{t('createWallet.vanityScanning')}</p> : generatedWallets.map((wallet, index) => {
              const address = wallet.address || '';
              const selected = selectedVanityAddresses.includes(address);
              const saved = !!address && vanitySavedRef.current.has(address);
              return <div key={address || index} className={`rounded-xl border p-2 transition-all ${selected ? 'border-emerald-400/60 bg-emerald-100/80 shadow-sm shadow-emerald-900/5 dark:bg-emerald-500/15 dark:shadow-emerald-950/20' : 'border-surface-200 bg-surface-50/90 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-surface-700/80 dark:bg-surface-900/80 dark:hover:border-emerald-500/35 dark:hover:bg-surface-900'}`}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <button type="button" onClick={() => toggleVanitySelection(address)} className="flex min-w-0 items-start gap-2 overflow-hidden text-left" aria-pressed={selected}>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${selected ? 'bg-emerald-500 text-white shadow shadow-emerald-500/25' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'}`}>{index + 1}</span>
                    <span className="block min-w-0 overflow-hidden">
                      <code className="block min-w-0 max-w-full overflow-hidden whitespace-nowrap font-mono text-[clamp(0.62rem,2.6vw,0.75rem)] font-bold leading-snug tracking-tight text-surface-950 dark:text-white">
                        {renderVanityAddress(address, true)}
                      </code>
                      <span className="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-semibold text-emerald-700/80 dark:text-emerald-100/75">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-1.5 py-0.5">{t('createWallet.vanityExtraTypePrimary')}</span>
                        {saved && <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 shadow-sm dark:text-emerald-200">{t('createWallet.vanityExtraSaved')}</span>}
                      </span>
                    </span>
                  </button>
                  <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg border border-surface-200 bg-surface-50/90 p-1 shadow-inner shadow-surface-900/5 dark:border-surface-700/60 dark:bg-surface-950/60 dark:shadow-black/10">
                    <button type="button" onClick={() => handleCopy(address, `vanity-found-${index}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white active:scale-95" aria-label={t('common.copy')}>
                      {copiedField === `vanity-found-${index}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                    <button type="button" disabled={saved} onClick={() => saveSingleVanityWallet(wallet)} className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95" aria-label={t('createWallet.vanityExtraSaveOne')}>
                      <Save size={13} />
                    </button>
                    <button type="button" onClick={() => removeVanityPrimaryWallet(address)} className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400 active:scale-95" aria-label={t('createWallet.vanityExtraRemoveOne')}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>;
            })}
          </div>
        )}
      </section>

      {vanityCaptureExtras && (
        <section className="overflow-hidden rounded-xl border border-cyan-200 bg-cyan-50/70 shadow-sm shadow-cyan-900/5 dark:border-cyan-500/20 dark:bg-surface-950/60 dark:shadow-cyan-950/10">
          <div className="border-b border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-cyan-500/[0.04] to-transparent px-3 py-2.5">
            <button type="button" onClick={() => toggleVanitySection('extra')} className="flex w-full items-center justify-between gap-3 text-left transition-opacity hover:opacity-85">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-cyan-500 dark:text-cyan-300">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-cyan-800 dark:text-cyan-100">{t('createWallet.vanityExtraKept')}</p>
                  <p className="mt-0.5 truncate text-[10px] text-cyan-700/75 dark:text-cyan-100/55">{t('createWallet.vanityExtraAutoReplaceHint')}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-100">{vanityExtraWallets.length}/{vanitySafeExtraLimit}</span>
                <ChevronDown size={14} className={`text-cyan-600 dark:text-cyan-400 transition-transform ${vanityExpandedSections.extra ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {vanityExpandedSections.extra && (
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button type="button" disabled={vanityExtraWallets.length === 0} onClick={saveAllVanityExtraWallets} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-200">
                  {t('createWallet.vanityExtraSaveAll')}
                </button>
                <button type="button" disabled={vanityExtraWallets.length === 0} onClick={clearVanityExtraWallets} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-700 shadow-sm transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-200">
                  {t('createWallet.vanityExtraClearAll')}
                </button>
              </div>
            )}
          </div>
          {vanityExpandedSections.extra && (
            <div className="max-h-80 space-y-1 overflow-y-auto p-1.5">
              {vanityExtraWallets.length === 0 ? <p className="px-2 py-3 text-center text-[11px] text-cyan-600/70 dark:text-cyan-200/50">{t('createWallet.vanityExtraEmpty')}</p> : vanityExtraWallets.map((wallet, index) => {
                const address = wallet.address || '';
                return (
                  <VanityExtraWalletCard
                    key={address || index}
                    t={t}
                    wallet={wallet}
                    index={index}
                    selected={selectedVanityAddresses.includes(address)}
                    saved={!!address && vanitySavedRef.current.has(address)}
                    copiedField={copiedField}
                    renderVanityExtraAddress={renderVanityExtraAddress}
                    getVanityExtraLabel={getVanityExtraLabel}
                    getVanityScoreTone={getVanityScoreTone}
                    handleCopy={handleCopy}
                    toggleVanitySelection={toggleVanitySelection}
                    saveSingleVanityWallet={saveSingleVanityWallet}
                    removeVanityExtraWallet={removeVanityExtraWallet}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-surface-600 dark:text-surface-500">{t('createWallet.vanityAutoLockPaused')}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {vanityPaused ? (
          <>
            <button onClick={() => setVanityPaused(false)} className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-4 py-2 text-xs font-semibold text-surface-700 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-surface-800" title={t('common.back')} aria-label={t('common.back')}><span aria-hidden="true">←</span>{t('common.back')}</button>
            <button onClick={() => startVanity(true)} disabled={!vanityCanResume} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400" title={t('createWallet.vanityResume')} aria-label={t('createWallet.vanityResume')}><Play size={14} />{t('createWallet.vanityResume')}</button>
          </>
        ) : <button onClick={() => { void pauseVanity(); }} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300" title={t('createWallet.vanityPause')} aria-label={t('createWallet.vanityPause')}><Pause size={14} />{t('createWallet.vanityPause')}</button>}
        <button onClick={stopVanity} className="inline-flex items-center gap-2 px-2 py-2 text-xs font-semibold text-red-600 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200" title={t('createWallet.stopVanity')} aria-label={t('createWallet.stopVanity')}><Square size={13} />{t('createWallet.stopVanity')}</button>
      </div>
    </div>
  );
}