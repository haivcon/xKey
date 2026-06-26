import { Copy, Settings, ShieldAlert } from 'lucide-react';
import BrandSlogan from '../shared/BrandSlogan';
import PasswordInput from '../shared/PasswordInput';
import { asNumber, asText } from '../../app/valueFormatters';
import type { BackupImportAnalysis } from '../../features/import/backupImportAnalysis';
import type { BackupPreview } from '../../hooks/useFileImport';
import type { TranslationFn } from '../../contexts/LanguageContext';

type BackupImportMode = 'merge' | 'replace';

type BackupImportPasswordModalProps = {
  loading: boolean;
  fileOperationKey: string;
  backupPreview: BackupPreview | null;
  backupAnalysis: BackupImportAnalysis | null;
  backupImportMode: BackupImportMode;
  updateMissingSensitive: boolean;
  importPassword: string;
  brandReminders: boolean;
  t: TranslationFn;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onPreview: () => Promise<void>;
  onImport: () => void;
  onVerifyOnly: () => void;
  onCopyVerificationReport: () => void;
  onCopyPreviewValue: (label: string, value: string) => void;
  onImportModeChange: (mode: BackupImportMode) => void;
  onUpdateMissingSensitiveChange: (enabled: boolean) => void;
  onConfirmReplace: () => Promise<boolean>;
  onConfirmUpdateMissingSensitive: () => Promise<boolean>;
  onHapticTap: () => void;
  onHapticSuccess: () => void;
};

export default function BackupImportPasswordModal({
  loading,
  fileOperationKey,
  backupPreview,
  backupAnalysis,
  backupImportMode,
  updateMissingSensitive,
  importPassword,
  brandReminders,
  t,
  onPasswordChange,
  onCancel,
  onPreview,
  onImport,
  onVerifyOnly,
  onCopyVerificationReport,
  onCopyPreviewValue,
  onImportModeChange,
  onUpdateMissingSensitiveChange,
  onConfirmReplace,
  onConfirmUpdateMissingSensitive,
  onHapticTap,
  onHapticSuccess,
}: BackupImportPasswordModalProps) {
  const backupId = asText(backupPreview?.backupId) || asText(backupPreview?.metadata?.backupId);
  const fileHash = asText(backupPreview?.containerHash) || asText(backupPreview?.metadata?.containerHash);

  const handleEnter = async () => {
    if (backupImportMode === 'replace' && !backupAnalysis) {
      await onPreview();
      return;
    }
    if (backupImportMode === 'replace' && !await onConfirmReplace()) return;
    onImport();
  };

  const handleImportClick = async () => {
    if (backupImportMode === 'replace' && !await onConfirmReplace()) return;
    onHapticSuccess();
    onImport();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-backup-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-3 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:w-full sm:p-6"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          backupPreview?.status === 'tampered' ? 'bg-red-500/10' : backupPreview?.integrity === 'repaired' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
        }`}>
          <ShieldAlert size={22} className={
            backupPreview?.status === 'tampered' ? 'text-red-400' : backupPreview?.integrity === 'repaired' ? 'text-amber-400' : 'text-emerald-400'
          } />
        </div>
        <h3 id="restore-backup-title" className="text-white font-bold text-center mb-1">{t('restore.title')}</h3>
        <p className="text-surface-400 text-sm text-center mb-4">{t('restore.desc')}</p>
        {brandReminders && <BrandSlogan note={t('brand.restoreNote')} tone="brand" className="mb-4 text-center" />}

        {backupPreview && (
          <div className={`mb-4 rounded-xl border p-3 text-xs ${
            backupPreview.status === 'tampered'
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : backupPreview.integrity === 'repaired'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
          }`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-semibold">{backupPreview.fileName || t('restore.backupFile')}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 font-semibold uppercase">{t(`restore.integrity_${asText(backupPreview.integrity)}`)}</span>
            </div>
            {backupPreview.openedFromExternal && (
              <div className="mb-2 rounded-lg border border-sky-400/25 bg-sky-400/10 px-2.5 py-2 text-sky-100">
                <div className="text-[11px] font-bold uppercase">{t('restore.openedExternal')}</div>
                <div className="mt-0.5 leading-relaxed">{t('restore.openedExternalWarning')}</div>
              </div>
            )}
            {backupPreview.metadata ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-surface-200">
                <span>{t('restore.createdAt')}</span><span className="text-right">{asText(backupPreview.metadata.createdAt) ? new Date(asText(backupPreview.metadata.createdAt)).toLocaleString() : ''}</span>
                <span>{t('restore.createdOn')}</span><span className="text-right">{asText(backupPreview.metadata.platform)}</span>
                <span>{t('restore.walletCount')}</span><span className="text-right">{asText(backupPreview.metadata.walletCount)}</span>
                <span>{t('restore.folderCount')}</span><span className="text-right">{asText(backupPreview.metadata.folderCount)}</span>
                <span>{t('restore.networkCount')}</span><span className="text-right">{asText(backupPreview.metadata.networkCount)}</span>
                <span>{t('restore.source')}</span><span className="text-right truncate">{asText(backupPreview.metadata.source)}</span>
                <div className="col-span-2 mt-1 rounded-lg border border-emerald-500/15 bg-black/10 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold">{t('restore.backupId')}</span>
                    <button
                      type="button"
                      onClick={() => onCopyPreviewValue('backupId', backupId)}
                      className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-[11px] font-semibold hover:bg-black/30"
                    >
                      <Copy size={12} />{t('common.copy')}
                    </button>
                  </div>
                  <code className="block break-all font-mono text-[11px] leading-relaxed text-emerald-50">{backupId || '-'}</code>
                </div>
                <div className="col-span-2 rounded-lg border border-emerald-500/15 bg-black/10 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold">{t('restore.containerHash')}</span>
                    <button
                      type="button"
                      onClick={() => onCopyPreviewValue('containerHash', fileHash)}
                      className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-[11px] font-semibold hover:bg-black/30"
                    >
                      <Copy size={12} />{t('common.copy')}
                    </button>
                  </div>
                  <code className="block break-all font-mono text-[11px] leading-relaxed text-emerald-50">{fileHash || '-'}</code>
                </div>
              </div>
            ) : (
              <p className="leading-relaxed">{backupPreview.messageKey ? t(asText(backupPreview.messageKey)) : asText(backupPreview.message)}</p>
            )}
            {Boolean(backupPreview.footerRecovered) && (
              <p className="mt-2 font-semibold">{t('restore.footerRecovered')}</p>
            )}
            {Boolean(backupPreview.recovered) && (
              <p className="mt-2 font-semibold">{t('restore.recoveredBytes', { count: asNumber(backupPreview.recoveredBytes) })}</p>
            )}
            {backupPreview.status === 'tampered' && (
              <p className="mt-2 font-semibold">{t('restore.modifiedWarning')}</p>
            )}
          </div>
        )}

        <PasswordInput
          value={importPassword}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key !== 'Enter') return;
            await handleEnter();
          }}
          placeholder={t('restore.placeholder')}
          disabled={backupPreview?.status === 'tampered'}
          wrapperClassName="mb-4 w-full"
          className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600"
        />

        {backupAnalysis && (
          <div className="mb-4 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-surface-200">
            <p>{t('restore.previewSummary', backupAnalysis)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => onImportModeChange('merge')} className={`min-h-20 rounded-lg border px-3 py-2 text-left transition-colors ${backupImportMode === 'merge' ? 'border-brand-400 bg-brand-500/15 text-brand-100' : 'border-surface-700 text-surface-300 hover:border-surface-500'}`}>
                <span className="block font-semibold">{t('restore.merge')}</span>
                <span className="mt-1 block leading-relaxed text-surface-400">{t('restore.mergeHelp')}</span>
              </button>
              <button onClick={() => onImportModeChange('replace')} className={`min-h-20 rounded-lg border px-3 py-2 text-left transition-colors ${backupImportMode === 'replace' ? 'border-amber-400 bg-amber-500/15 text-amber-100' : 'border-surface-700 text-surface-300 hover:border-surface-500'}`}>
                <span className="block font-semibold">{t('restore.replace')}</span>
                <span className="mt-1 block leading-relaxed text-surface-400">{t('restore.replaceHelp')}</span>
              </button>
            </div>
            {backupImportMode === 'merge' && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-brand-500/20 bg-surface-900/50 p-2.5 text-xs text-surface-300">
                <input
                  type="checkbox"
                  checked={updateMissingSensitive}
                  onChange={async (event) => {
                    const enabled = event.target.checked;
                    if (enabled && !await onConfirmUpdateMissingSensitive()) return;
                    onUpdateMissingSensitiveChange(enabled);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                />
                <span><span className="block font-semibold text-brand-200">{t('restore.updateMissingSensitive')}</span><span className="mt-0.5 block leading-relaxed text-surface-400">{t('restore.updateMissingSensitiveHelp')}</span></span>
              </label>
            )}
          </div>
        )}

        {(loading || fileOperationKey) && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-100">
            <Settings size={14} className={loading ? 'animate-spin' : ''} />
            {t(fileOperationKey || 'fileStatus.processing')}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button onClick={() => { onHapticTap(); onCancel(); }}
            className="shrink-0 px-2 py-2.5 font-semibold text-red-300 transition-colors hover:text-red-200 focus:outline-none focus-visible:underline">{t('common.cancel')}</button>
          {backupPreview?.openedFromExternal && (
            <button onClick={() => { onHapticTap(); onVerifyOnly(); }} disabled={loading}
              className="btn-glow min-w-28 flex-1 whitespace-normal rounded-lg bg-surface-800 py-2.5 font-medium text-sky-200 transition-colors hover:bg-surface-700 disabled:opacity-50">{t('restore.verifyOnly')}</button>
          )}
          <button onClick={() => { onHapticTap(); onPreview(); }} disabled={loading || backupPreview?.status === 'tampered'} className="btn-glow min-w-28 flex-1 whitespace-normal rounded-lg bg-surface-800 py-2.5 font-medium text-brand-300 transition-colors hover:bg-surface-700 disabled:opacity-50">{t('restore.previewOnly')}</button>
          {backupPreview?.openedFromExternal && (
            <button onClick={() => { onHapticTap(); onCopyVerificationReport(); }} disabled={loading}
              className="btn-glow min-w-28 flex-1 whitespace-normal rounded-lg bg-surface-800 py-2.5 font-medium text-surface-200 transition-colors hover:bg-surface-700 disabled:opacity-50">{t('restore.copyVerificationReport')}</button>
          )}
          <button onClick={handleImportClick}
            disabled={loading || backupPreview?.status === 'tampered' || (backupImportMode === 'replace' && !backupAnalysis)}
            className="btn-glow btn-glow-success min-w-28 flex-1 whitespace-normal rounded-lg bg-brand-600 py-2.5 font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50">{t('restore.button')}</button>
        </div>
      </div>
    </div>
  );
}