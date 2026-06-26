import { CheckCircle2, Download, MapPin, QrCode, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Notice from '../../Notice';
import { XKEY_SLOGAN } from '../../../utils/branding';
import type { TranslationFn } from '../../../contexts/LanguageContext';
import type { BackupHistoryEntry } from '../../../utils/backupUtils';

type BackupHistorySectionProps = {
  t: TranslationFn;
  brandReminders: boolean;
  backupHistory: BackupHistoryEntry[];
  vaultChangedAt: string;
  verifiedBackupCount: number;
  verifyingBackupId: string;
  visibleBackupQr: string;
  onVerifySavedBackup: (entry: BackupHistoryEntry) => void;
  setVisibleBackupQr: (updater: (current: string) => string) => void;
};

export function BackupHistorySection({
  t,
  brandReminders,
  backupHistory,
  vaultChangedAt,
  verifiedBackupCount,
  verifyingBackupId,
  visibleBackupQr,
  onVerifySavedBackup,
  setVisibleBackupQr,
}: BackupHistorySectionProps) {
  return (
    <div className="glass-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10"><Download size={20} className="text-brand-400" /></div>
        <div><h2 className="text-lg font-semibold text-white">{t('settings.backupHistoryTitle')}</h2><p className="text-xs text-surface-400">{t('settings.backupHistoryDesc')}</p>{brandReminders && <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-300/80">{XKEY_SLOGAN}</p>}</div>
      </div>
      {backupHistory.length > 0 && vaultChangedAt && new Date(vaultChangedAt).getTime() > new Date(backupHistory[0].createdAt).getTime() && (
        <Notice variant="warning" className="mb-4">{t('settings.backupOutdated')}</Notice>
      )}
      {verifiedBackupCount < 2 && (
        <Notice variant="warning" className="mb-4">{t('settings.backupRetentionNotice')}</Notice>
      )}
      {backupHistory.length === 0 ? <p className="text-sm text-surface-500">{t('settings.backupHistoryEmpty')}</p> : (
        <div className="space-y-2">
          {backupHistory.map((entry, index) => <div key={`${entry.backupId}-${index}`} className="rounded-lg border border-surface-700 bg-surface-800/50 p-3 text-xs">
            <div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate font-semibold text-surface-200">{entry.fileName}</span><span className="shrink-0 text-surface-500">{new Date(entry.createdAt).toLocaleString()}</span></div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-surface-400"><span>{t('settings.backupHistoryWallets', { count: entry.walletCount })}</span><code>{entry.backupId}</code>{entry.verified && <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={12} />{t('settings.backupVerified')}</span>}</div>
            {entry.savedUri && <div className="mt-1 flex items-center gap-1 truncate text-surface-500"><MapPin size={11} /><span className="truncate">{entry.savedUri}</span></div>}
            {entry.savedUri && entry.fileHash && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onVerifySavedBackup(entry)}
                  disabled={verifyingBackupId === entry.backupId}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand-500/20 bg-brand-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-brand-300 hover:bg-brand-500/20 disabled:opacity-60"
                >
                  <RefreshCw size={12} className={verifyingBackupId === entry.backupId ? 'animate-spin' : ''} />
                  {verifyingBackupId === entry.backupId ? t('settings.backupVerifying') : t('settings.backupVerifySaved')}
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleBackupQr(current => current === entry.backupId ? '' : entry.backupId)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  <QrCode size={12} />
                  {t('settings.backupIdQr')}
                </button>
              </div>
            )}
            {visibleBackupQr === entry.backupId && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-surface-700 bg-surface-900/70 p-3">
                <div className="rounded bg-white p-2">
                  <QRCodeSVG value={JSON.stringify({ type: 'xkey-backup-id', backupId: entry.backupId, hash: (entry.fileHash || '').slice(0, 16), createdAt: entry.createdAt })} size={88} bgColor="#ffffff" fgColor="#000000" level="Q" />
                </div>
                <p className="text-xs leading-relaxed text-surface-400">{t('settings.backupIdQrDesc')}</p>
              </div>
            )}
          </div>)}
        </div>
      )}
    </div>
  );
}