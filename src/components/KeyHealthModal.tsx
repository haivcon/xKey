import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Clock3, Copy, KeyRound, ShieldCheck, X } from 'lucide-react';
import { formatKeyAge, getWalletHealth, selectProofWallets, shouldShowProofOfKeysReminder, summarizeKeyHealth, type ProofCheckReport, type ProofScope } from '../utils/keyHealth';
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

const statusTone = {
  ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  soon: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  due: 'border-red-500/25 bg-red-500/10 text-red-200',
  missing: 'border-surface-700 bg-surface-800 text-surface-300',
  snoozed: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
};

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
    .filter(item => ['due', 'soon', 'missing'].includes(item.health.level) || item.wallet.lastProofOfKeysStatus === 'failed')
    .map(item => item.wallet), [summary.items]);

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
        <div className="flex items-center justify-between border-b border-surface-800 p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Bell size={18} className={summary.attentionCount > 0 ? 'text-amber-300' : 'text-emerald-300'} />
              {t('keyHealth.title')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('keyHealth.subtitle')}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-surface-700 bg-surface-800/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-surface-400"><KeyRound size={14} />{t('keyHealth.wallets')}</div>
              <div className="text-2xl font-bold text-white">{wallets.length}</div>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-amber-200"><Clock3 size={14} />{t('keyHealth.needsAttention')}</div>
              <div className="text-2xl font-bold text-amber-100">{summary.attentionCount}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
              <button type="button" onClick={() => setShowPqInfo(prev => !prev)} className="mb-2 flex items-center gap-2 text-left text-xs text-emerald-200 hover:text-emerald-100"><ShieldCheck size={14} />{t('keyHealth.pqReady')}</button>
              <div className="text-2xl font-bold text-emerald-100">{summary.pqPrepared}/{wallets.length}</div>
            </div>
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-cyan-100"><CheckCircle2 size={14} />{t('keyHealth.proofPassed')}</div>
              <div className="text-2xl font-bold text-cyan-50">{summary.proofPassed}</div>
            </div>
          </div>
          {showPqInfo && (
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-100">
              <div className="font-bold">{t('keyHealth.pqInfoTitle')}</div>
              <p className="mt-1 text-emerald-100/85">{t('keyHealth.pqInfoBody')}</p>
            </div>
          )}

          <section className={`mt-4 rounded-xl border p-4 ${proofDay ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-surface-700 bg-surface-800/40'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  {t('keyHealth.proofTitle')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-surface-400">
                  {proofDay ? t('keyHealth.proofDayDesc') : t('keyHealth.proofDesc')}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:w-56">
                <select
                  value={proofScope}
                  onChange={(event) => setProofScope(event.target.value as ProofScope)}
                  className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-xs font-semibold text-surface-100 outline-none focus:border-emerald-500"
                >
                  <option value="attention">{t('keyHealth.scope_attention')}</option>
                  <option value="visible">{t('keyHealth.scope_visible')}</option>
                  <option value="signable">{t('keyHealth.scope_signable')}</option>
                  <option value="all">{t('keyHealth.scope_all')}</option>
                </select>
                <button
                  type="button"
                  onClick={runCheck}
                  disabled={running || proofTargets.length === 0}
                  className="btn-glow rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400"
                >
                  {running ? t('keyHealth.proofRunning') : t('keyHealth.runProofCount', { count: proofTargets.length })}
                </button>
              </div>
            </div>
          </section>

          {report && (
            <section className="mt-4 rounded-xl border border-surface-700 bg-surface-800/35">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-700 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{t('keyHealth.reportTitle')}</h3>
                  <p className="mt-0.5 text-xs text-surface-400">{t('keyHealth.proofResult', { passed: report.passed, total: report.total, failed: report.failed, skipped: report.skipped })}</p>
                </div>
                <button type="button" onClick={copyReport} className="inline-flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-xs font-semibold text-surface-200 hover:bg-surface-800">
                  <Copy size={14} /> {copyState ? t('common.copied') : t('keyHealth.copyReport')}
                </button>
              </div>
              <div className="max-h-44 divide-y divide-surface-800 overflow-y-auto">
                {report.results.map((item, index) => (
                  <div key={`${item.address}-${index}`} className="grid gap-1 px-4 py-2 text-xs sm:grid-cols-[5rem_minmax(0,1fr)]">
                    <span className={item.status === 'passed' ? 'font-bold text-emerald-300' : item.status === 'failed' ? 'font-bold text-red-300' : 'font-bold text-surface-400'}>{t(`keyHealth.result_${item.status}`)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{item.name}</span>
                      <span className="block truncate text-surface-500">{item.message}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4 rounded-xl border border-surface-700 bg-surface-800/35">
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
              {summary.items.map(({ wallet }, index) => {
                const health = getWalletHealth(wallet, now);
                const label = wallet.name || wallet.address || t('walletCard.unnamed');
                return (
                  <div key={wallet._id || `${wallet.address || 'wallet'}-${index}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">{label}</span>
                        {wallet.pqPrepared && (
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">PQ-ready</span>
                        )}
                        {wallet.lastProofOfKeysStatus === 'failed' && (
                          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-200">{t('keyHealth.failed')}</span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-surface-500">{wallet.address || t('walletCard.noAddress')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="rounded-full border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs font-semibold text-surface-300">
                        {t('keyHealth.age')}: {formatKeyAge(wallet.createdAt, now)}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[health.level]}`}>
                        {t(`keyHealth.status_${health.level}`)}
                      </span>
                      {(['due', 'soon', 'missing'].includes(health.level) || wallet.lastProofOfKeysStatus === 'failed') && (
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
