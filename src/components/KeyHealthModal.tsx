import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Clock3, Copy, KeyRound, ShieldCheck, X } from 'lucide-react';
import { formatKeyAge, getWalletHealthDetails, selectProofWallets, shouldShowProofOfKeysReminder, summarizeKeyHealth, type ProofCheckReport, type ProofScope } from '../utils/keyHealth';
import type { TranslationFn } from '../contexts/LanguageContext';
import type { Wallet } from '../types';

type KeyHealthModalProps = {
  wallets: Wallet[];
  visibleWallets: Wallet[];
  onClose: () => void;
  onRunProofCheck: (scope: ProofScope) => Promise<ProofCheckReport>;
  onMarkReviewed: (wallets: Wallet[]) => Promise<void>;
  onRemindLater: (wallets: Wallet[]) => Promise<void>;
  onCreateReplacement: () => void;
  t: TranslationFn;
};

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  action?: ReactNode;
};

const statusTone = {
  ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  soon: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  due: 'border-red-500/25 bg-red-500/10 text-red-200',
  missing: 'border-surface-700 bg-surface-800 text-surface-300',
  snoozed: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
};

const statTone = {
  neutral: 'border-surface-700 bg-surface-800/45 text-surface-300',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  danger: 'border-red-500/25 bg-red-500/10 text-red-200',
  info: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100',
};

function StatCard({ icon, label, value, tone = 'neutral', action }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-3 ${statTone[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate text-scale-xs font-semibold opacity-90">
            {icon}
            <span className="truncate">{label}</span>
          </div>
          <div className="mt-2 text-xl font-bold leading-none text-white">{value}</div>
        </div>
        {action}
      </div>
    </div>
  );
}

export default function KeyHealthModal({ wallets, visibleWallets, onClose, onRunProofCheck, onMarkReviewed, onRemindLater, onCreateReplacement, t }: KeyHealthModalProps) {
  const [running, setRunning] = useState(false);
  const [proofScope, setProofScope] = useState<ProofScope>('attention');
  const [report, setReport] = useState<ProofCheckReport | null>(null);
  const [showPqInfo, setShowPqInfo] = useState(false);
  const [copyState, setCopyState] = useState('');
  const now = Date.now();
  const summary = useMemo(() => summarizeKeyHealth(wallets, now), [wallets, now]);
  const proofDay = shouldShowProofOfKeysReminder(new Date(now));
  const proofTargets = useMemo(() => selectProofWallets(wallets, proofScope, visibleWallets, now), [wallets, proofScope, visibleWallets, now]);
  const attentionWallets = useMemo(() => summary.items
    .filter(item => ['due', 'soon', 'missing'].includes(item.health.level) || item.wallet.lastProofOfKeysStatus === 'failed' || item.health.risk !== 'ok' || !item.health.backupFresh)
    .map(item => item.wallet), [summary.items]);
  const averageTone = summary.averageScore >= 85 ? 'success' : summary.averageScore >= 65 ? 'warning' : 'danger';

  const runCheck = async () => {
    setRunning(true);
    try {
      setReport(await onRunProofCheck(proofScope));
    } finally {
      setRunning(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    const body = [
      `xKey Proof-of-Keys report`,
      `Scope: ${report.scope}`,
      `Checked: ${new Date(report.checkedAt).toISOString()}`,
      `Result: ${report.passed}/${report.total} passed, ${report.failed} failed, ${report.skipped} skipped`,
      '',
      ...report.results.map(item => `${item.status.toUpperCase()} | ${item.name} | ${item.address || '-'} | ${item.message}`),
    ].join('\n');
    await navigator.clipboard.writeText(body).catch(() => {});
    setCopyState('copied');
    window.setTimeout(() => setCopyState(''), 1500);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-surface-800 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`grid size-8 shrink-0 place-items-center rounded-xl border ${summary.attentionCount > 0 ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
                <Bell size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-white">{t('keyHealth.title')}</h2>
                <p className="mt-0.5 line-clamp-2 text-scale-xs leading-relaxed text-surface-400">{t('keyHealth.subtitle')}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCard icon={<KeyRound size={14} />} label={t('keyHealth.wallets')} value={wallets.length} />
            <StatCard icon={<Clock3 size={14} />} label={t('keyHealth.needsAttention')} value={summary.attentionCount} tone={summary.attentionCount > 0 ? 'warning' : 'success'} />
            <StatCard icon={<AlertTriangle size={14} />} label={t('keyHealth.backupNeeded')} value={summary.backupMissing.length} tone={summary.backupMissing.length > 0 ? 'danger' : 'success'} />
            <StatCard icon={<CheckCircle2 size={14} />} label={t('keyHealth.averageScore')} value={summary.averageScore} tone={averageTone} />
            <StatCard
              icon={<ShieldCheck size={14} />}
              label={t('keyHealth.pqReady')}
              value={`${summary.pqPrepared}/${wallets.length}`}
              tone="success"
              action={(
                <button type="button" onClick={() => setShowPqInfo(prev => !prev)} className="rounded-full border border-emerald-500/20 px-2 py-0.5 text-scale-2xs font-bold text-emerald-100 transition-colors hover:bg-emerald-500/10">
                  i
                </button>
              )}
            />
            <StatCard icon={<Copy size={14} />} label={t('keyHealth.duplicates')} value={summary.duplicateGroups.length} tone={summary.duplicateGroups.length > 0 ? 'warning' : 'neutral'} />
          </div>

          {showPqInfo && (
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-100">
              <div className="font-bold">{t('keyHealth.pqInfoTitle')}</div>
              <p className="mt-1 text-emerald-100/85">{t('keyHealth.pqInfoBody')}</p>
            </div>
          )}

          <section className={`mt-3 overflow-hidden rounded-2xl border ${proofDay ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-surface-700 bg-surface-800/35'}`}>
            <div className="flex flex-col gap-3 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <CheckCircle2 size={16} className="text-emerald-300" />
                      {t('keyHealth.proofTitle')}
                    </h3>
                    <span className={`rounded-full border px-2.5 py-1 text-scale-xs font-bold ${
                      running
                        ? 'border-brand-500/25 bg-brand-500/10 text-brand-200'
                        : report
                          ? report.failed > 0
                            ? 'border-red-500/25 bg-red-500/10 text-red-200'
                            : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                          : 'border-surface-700 bg-surface-900 text-surface-300'
                    }`}>
                      {running ? t('keyHealth.proofStatusRunning') : report ? (report.failed > 0 ? t('keyHealth.proofStatusFailed') : t('keyHealth.proofStatusPassed')) : t('keyHealth.proofStatusIdle')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-surface-400">
                    {proofDay ? t('keyHealth.proofDayDesc') : t('keyHealth.proofDesc')}
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={runCheck}
                    disabled={running || proofTargets.length === 0}
                    className="btn-glow shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400"
                  >
                    {running ? t('keyHealth.proofRunning') : t('keyHealth.proofSignTest')}
                  </button>
                  {report && (
                    <button type="button" onClick={copyReport} className="flex items-center justify-center gap-1 text-scale-xs text-surface-400 transition-colors hover:text-emerald-300">
                      <Copy size={10} /> {copyState ? t('common.copied') : t('keyHealth.copyReport')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                {(['attention', 'visible', 'signable', 'all'] as ProofScope[]).map(scope => {
                  const active = proofScope === scope;
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setProofScope(scope)}
                      className={`rounded-xl border p-2.5 text-left text-xs transition-colors ${active ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100' : 'border-surface-700 bg-surface-900/70 text-surface-300 hover:border-surface-500 hover:bg-surface-800'}`}
                    >
                      <span className="block font-bold">{t(`keyHealth.scope_${scope}`)}</span>
                      <span className="mt-1 block text-scale-xs leading-relaxed opacity-75">{t(`keyHealth.scope_${scope}_desc`)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-2 text-scale-xs text-surface-400 sm:grid-cols-3">
                <div className="flex items-start gap-1.5 rounded-lg border border-surface-700 bg-surface-900/60 px-3 py-2">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>{t('keyHealth.proofNoteNoGas')}</span>
                </div>
                <div className="flex items-start gap-1.5 rounded-lg border border-surface-700 bg-surface-900/60 px-3 py-2">
                  <ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>{t('keyHealth.proofNoteNoBroadcast')}</span>
                </div>
                <div className="flex items-start gap-1.5 rounded-lg border border-surface-700 bg-surface-900/60 px-3 py-2">
                  <KeyRound size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>{t('keyHealth.proofNoteOwnership')}</span>
                </div>
              </div>

              <div className="text-scale-xs text-surface-500">
                {t('keyHealth.proofTargetCount', { count: proofTargets.length })}
              </div>
            </div>
          </section>

          {report && (
            <section className="mt-3 overflow-hidden rounded-xl border border-surface-700 bg-surface-800/35">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-700 bg-surface-800/50 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{t('keyHealth.reportTitle')}</h3>
                  <p className="mt-0.5 text-xs text-surface-400">{t('keyHealth.proofResult', { passed: report.passed, total: report.total, failed: report.failed, skipped: report.skipped })}</p>
                </div>
              </div>
              <div className="max-h-44 divide-y divide-surface-800 overflow-y-auto">
                {report.results.map((item, index) => (
                  <div key={`${item.address}-${index}`} className={`grid items-center gap-2 px-4 py-2 text-xs transition-colors hover:bg-surface-800/50 sm:grid-cols-[5rem_minmax(0,1fr)] ${item.status === 'failed' ? 'bg-red-500/5' : ''}`}>
                    <span className={`inline-flex items-center gap-1.5 font-bold ${item.status === 'passed' ? 'text-emerald-400' : item.status === 'failed' ? 'text-red-400' : 'text-surface-400'}`}>
                      {item.status === 'passed' ? <CheckCircle2 size={12} /> : item.status === 'failed' ? <AlertTriangle size={12} /> : <Clock3 size={12} />}
                      {t(`keyHealth.result_${item.status}`)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{item.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-scale-xs text-surface-500">{item.message}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-3 overflow-hidden rounded-xl border border-surface-700 bg-surface-800/35">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-700 px-4 py-3">
              <h3 className="text-sm font-bold text-white">{t('keyHealth.walletStatus')}</h3>
              {attentionWallets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onRemindLater(attentionWallets)} className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/15">{t('keyHealth.remindLater')}</button>
                  <button type="button" onClick={() => onMarkReviewed(attentionWallets)} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/15">{t('keyHealth.markReviewed')}</button>
                  <button type="button" onClick={onCreateReplacement} className="rounded-lg border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-100 hover:bg-brand-500/15">{t('keyHealth.createReplacement')}</button>
                </div>
              )}
            </div>
            <div className="max-h-80 divide-y divide-surface-800 overflow-y-auto">
              {summary.items.map(({ wallet, health }, index) => {
                const details = getWalletHealthDetails(wallet, wallets, now);
                const label = wallet.name || wallet.address || t('walletCard.unnamed');
                const criticalIssues = details.issues.slice(0, 3);
                return (
                  <div key={wallet._id || `${wallet.address || 'wallet'}-${index}`} className="grid gap-2 px-4 py-3 transition-colors hover:bg-surface-800/35 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">{label}</span>
                        {wallet.pqPrepared && (
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-scale-2xs font-bold text-emerald-200">{t('keyHealth.pqReady')}</span>
                        )}
                        {wallet.lastProofOfKeysStatus === 'failed' && (
                          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-scale-2xs font-bold text-red-200">{t('keyHealth.failed')}</span>
                        )}
                        {!details.backupFresh && (
                          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-scale-2xs font-bold text-red-200">{t('keyHealth.backupNeeded')}</span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-surface-500">{wallet.address || t('walletCard.noAddress')}</p>
                      {criticalIssues.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {criticalIssues.map(issue => (
                            <span key={issue.code} className={`rounded-full border px-2 py-0.5 text-scale-2xs font-semibold ${issue.risk === 'danger' ? 'border-red-500/25 bg-red-500/10 text-red-200' : 'border-amber-500/25 bg-amber-500/10 text-amber-200'}`}>
                              {t(`keyHealth.issue_${issue.code}`)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${details.risk === 'danger' ? 'border-red-500/25 bg-red-500/10 text-red-200' : details.risk === 'warning' ? 'border-amber-500/25 bg-amber-500/10 text-amber-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'}`}>
                        {t('keyHealth.score')}: {details.score}
                      </span>
                      <span className="rounded-full border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs font-semibold text-surface-300">
                        {t('keyHealth.age')}: {formatKeyAge(wallet.createdAt, now)}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[health.level]}`}>
                        {t(`keyHealth.status_${health.level}`)}
                      </span>
                      {(['due', 'soon', 'missing'].includes(health.level) || wallet.lastProofOfKeysStatus === 'failed' || details.risk !== 'ok' || !details.backupFresh) && (
                        <>
                          <button type="button" onClick={() => onRemindLater([wallet])} className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/15">{t('keyHealth.remindLaterShort')}</button>
                          <button type="button" onClick={() => onMarkReviewed([wallet])} className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/15">{t('keyHealth.reviewedShort')}</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {wallets.length === 0 && (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-surface-400">
                  <AlertTriangle size={16} /> {t('home.noWallets')}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}