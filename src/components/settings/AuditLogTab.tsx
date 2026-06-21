import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { authenticateDeviceCredential, isDeviceCredentialAvailable } from '../../utils/deviceCredential';
import { appendAuditLog, readAuditLog, type AuditDetails, type DecodedAuditEntry } from '../../utils/auditLog';
import { hapticTap } from '../../utils/haptics';
import { useT } from '../../contexts/LanguageContext';
import Notice from '../Notice';

const formatDetails = (details: AuditDetails = {}) => Object.entries(details)
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
  .join(' | ');

export default function AuditLogTab() {
  const t = useT();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<DecodedAuditEntry[]>([]);
  const [tampered, setTampered] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await readAuditLog();
    setEntries(result.entries);
    setTampered(result.tampered);
    setLoading(false);
  };

  useEffect(() => {
    if (!unlocked) return undefined;
    load();
    const update = () => load();
    window.addEventListener('xkey-audit-log-updated', update);
    return () => window.removeEventListener('xkey-audit-log-updated', update);
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

  return (
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
                  <td className="whitespace-nowrap px-3 py-2">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2 font-semibold text-white">{entry.type}</td>
                  <td className="px-3 py-2">{formatDetails(entry.details) || '-'}</td>
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
  );
}
