import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, Clock3, Database, FileArchive, FileText, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { authenticateDeviceCredential, isDeviceCredentialAvailable } from '../../utils/deviceCredential';
import { appendAuditLog, readAuditLog, type AuditDetails, type DecodedAuditEntry } from '../../utils/auditLog';
import { hapticTap } from '../../utils/haptics';
import { useLanguage, useT, type TranslationFn } from '../../contexts/LanguageContext';
import Notice from '../Notice';
import { clearActionHistory, getActionHistory, type ActionHistoryCategory, type ActionHistoryItem } from '../../utils/actionHistory';

const formatDetails = (details: AuditDetails = {}, t: TranslationFn) => Object.entries(details)
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => `${t(`auditDetails.${key}`)}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
  .join(' | ');

const getEventLabel = (type: string, t: TranslationFn): string => {
  const group = type.split('.')[0] || 'unknown';
  return t(`auditEvent.${group}`);
};

export default function AuditLogTab() {
  const t = useT();
  const { lang } = useLanguage();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<DecodedAuditEntry[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const [actionFilter, setActionFilter] = useState<ActionHistoryCategory>('all');
  const [showAllActions, setShowAllActions] = useState(false);
  const [tampered, setTampered] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [result, actions] = await Promise.all([readAuditLog(), getActionHistory()]);
    setEntries(result.entries);
    setActionHistory(actions);
    setTampered(result.tampered);
    setLoading(false);
  };

  useEffect(() => {
    if (!unlocked) return undefined;
    load();
    const update = () => load();
    const updateActions = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : [];
      setActionHistory(Array.isArray(detail) ? detail : []);
    };
    window.addEventListener('xkey-audit-log-updated', update);
    window.addEventListener('xkey-action-history-updated', updateActions as EventListener);
    return () => {
      window.removeEventListener('xkey-audit-log-updated', update);
      window.removeEventListener('xkey-action-history-updated', updateActions as EventListener);
    };
  }, [unlocked]);

  const unlock = async () => {
    hapticTap();
    setError('');
    try {
      if (Capacitor.isNativePlatform() && await isDeviceCredentialAvailable()) {
        await authenticateDeviceCredential({
          title: t('audit.unlockTitle'),
          subtitle: t('audit.unlockSubtitle'),
        });
      }
      setUnlocked(true);
      await appendAuditLog('audit.viewed');
    } catch {
      setError(t('audit.unlockFailed'));
      await appendAuditLog('audit.view_failed');
    }
  };

  if (!unlocked) {
    return (
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('audit.title')}</h2>
            <p className="text-xs text-surface-400">{t('audit.subtitle')}</p>
          </div>
        </div>
        <Notice variant="info" className="mb-4">{t('audit.lockedNotice')}</Notice>
        {error && <Notice variant="danger" className="mb-4">{error}</Notice>}
        <button onClick={unlock} className="btn-glow flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white">
          <ShieldCheck size={16} />
          {t('audit.unlock')}
        </button>
      </div>
    );
  }

  const actionFilters: ActionHistoryCategory[] = ['all', 'unlock', 'backup', 'copy', 'warning', 'data'];
  const visibleActions = actionHistory.filter(item => actionFilter === 'all' || item.category === actionFilter || (actionFilter === 'warning' && (item.type === 'error' || item.type === 'warning')));
  const displayedActions = showAllActions ? visibleActions : visibleActions.slice(0, 6);
  const hiddenActionCount = Math.max(0, visibleActions.length - displayedActions.length);
  const countByCategory = (category: ActionHistoryCategory) => actionHistory.filter(item => (
    category === 'all' || item.category === category || (category === 'warning' && (item.type === 'error' || item.type === 'warning'))
  )).length;
  const actionIcon = (item: ActionHistoryItem) => {
    const category = item.category || 'other';
    if (category === 'backup') return FileArchive;
    if (category === 'copy') return ClipboardCopy;
    if (category === 'unlock') return KeyRound;
    if (category === 'data') return Database;
    if (category === 'warning' || item.type === 'error' || item.type === 'warning') return AlertTriangle;
    return Clock3;
  };
  const actionStyle = (item: ActionHistoryItem) => {
    if (item.type === 'error') return 'border-red-500/25 bg-red-500/10 text-red-200';
    if (item.type === 'warning' || item.category === 'warning') return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
    if (item.type === 'success') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
    return 'border-surface-700 bg-surface-900/50 text-surface-200';
  };
  const actionMessage = (item: ActionHistoryItem) => item.messageKey ? t(item.messageKey, item.vars) : item.message;

  return (
    <div className="space-y-6">
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-surface-700/60 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{t('audit.title')}</h2>
            <p className="text-xs text-surface-400">{t('audit.entryCount', { count: entries.length })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-lg border border-surface-700 bg-surface-800 p-2 text-surface-300">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="p-4">
        {tampered ? (
          <Notice variant="danger" className="mb-4">
            <span className="inline-flex items-center gap-2"><AlertTriangle size={14} /> {t('audit.tampered')}</span>
          </Notice>
        ) : (
          <Notice variant="success" className="mb-4">
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} /> {t('audit.healthy')}</span>
          </Notice>
        )}
        <div className="overflow-x-auto rounded-xl border border-surface-700">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-surface-800 text-surface-300">
              <tr>
                <th className="px-3 py-2 font-semibold">{t('audit.time')}</th>
                <th className="px-3 py-2 font-semibold">{t('audit.event')}</th>
                <th className="px-3 py-2 font-semibold">{t('audit.details')}</th>
                <th className="px-3 py-2 font-semibold">{t('audit.integrity')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-surface-500">{t('audit.empty')}</td></tr>
              ) : entries.map(entry => (
                <tr key={entry.id} className="border-t border-surface-800 text-surface-300">
                  <td className="whitespace-nowrap px-3 py-2">{new Date(entry.timestamp).toLocaleString(lang)}</td>
                  <td className="px-3 py-2"><div className="font-semibold text-white">{getEventLabel(entry.type, t)}</div><div className="mt-0.5 font-mono text-[10px] text-surface-500">{entry.type}</div></td>
                  <td className="px-3 py-2">{formatDetails(entry.details, t) || '-'}</td>
                  <td className={`px-3 py-2 font-semibold ${entry.tampered ? 'text-red-300' : 'text-emerald-300'}`}>
                    {entry.tampered ? t('audit.modified') : t('audit.verified')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-surface-700/60 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
            <Clock3 size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{t('settings.activityHistory')}</h2>
            <p className="text-xs text-surface-400">{t('settings.activityHistoryDesc')}</p>
          </div>
        </div>
        {actionHistory.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              hapticTap();
              await clearActionHistory();
            }}
            className="flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-800/60 px-2.5 py-2 text-xs font-semibold text-surface-300 hover:text-red-300"
          >
            <Trash2 size={13} />
            {t('settings.clearActionHistory')}
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/50 p-3">
            <p className="text-[0.625rem] font-semibold uppercase text-surface-500">{t('settings.actionSummaryTotal')}</p>
            <p className="mt-1 text-lg font-bold text-white">{actionHistory.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-[0.625rem] font-semibold uppercase text-emerald-300/80">{t('settings.actionSummaryBackup')}</p>
            <p className="mt-1 text-lg font-bold text-emerald-100">{countByCategory('backup')}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-[0.625rem] font-semibold uppercase text-amber-300/80">{t('settings.actionSummaryWarning')}</p>
            <p className="mt-1 text-lg font-bold text-amber-100">{countByCategory('warning')}</p>
          </div>
        </div>
        <Notice variant="info" className="mb-4">{t('settings.activityHistoryAuditNote')}</Notice>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {actionFilters.map(filter => (
            <button
              key={filter}
              type="button"
              onClick={() => setActionFilter(filter)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${actionFilter === filter ? 'border-brand-500 bg-brand-500/15 text-brand-100' : 'border-surface-700 bg-surface-900 text-surface-400 hover:text-white'}`}
            >
              {t(`settings.actionFilter_${filter}`)} <span className="ml-1 opacity-70">{countByCategory(filter)}</span>
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-surface-700/70 bg-surface-950/30">
          {visibleActions.length === 0 ? (
            <p className="rounded-xl border border-surface-700/70 bg-surface-900/40 px-3 py-5 text-center text-xs text-surface-400">
              {t('settings.noActivityHistory')}
            </p>
          ) : (
            displayedActions.map(item => {
              const Icon = actionIcon(item);
              return (
                <div key={item.id} className={`border-b border-surface-800/80 px-3 py-2.5 last:border-b-0 ${actionStyle(item).replace('rounded-xl border ', '')}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/15"><Icon size={15} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{actionMessage(item)}</p>
                      <p className="mt-0.5 text-[0.625rem] opacity-70">{new Date(item.ts).toLocaleString(lang)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {hiddenActionCount > 0 || showAllActions ? (
          <button
            type="button"
            onClick={() => setShowAllActions(prev => !prev)}
            className="mt-3 w-full rounded-xl border border-surface-700 bg-surface-800/70 px-3 py-2.5 text-xs font-semibold text-surface-200 hover:bg-surface-700"
          >
            {showAllActions ? t('common.showLess') : t('common.showMore', { count: hiddenActionCount })}
          </button>
        ) : null}
      </div>
    </div>
    </div>
  );
}
