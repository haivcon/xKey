import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckSquare, ChevronDown, ChevronUp, ClipboardPaste, Copy, Fingerprint, FolderOpen, Globe2, Hash, KeyRound, MonitorSmartphone, Package, PlusCircle, RefreshCw, Search, Settings, ShieldAlert, ShieldCheck, ShieldX, Square, Tags, Wallet, Wrench } from 'lucide-react';
import BrandSlogan from '../shared/BrandSlogan';
import PasswordInput from '../shared/PasswordInput';
import { asNumber, asText } from '../../app/valueFormatters';
import type { BackupImportAnalysis } from '../../features/import/backupImportAnalysis';
import type { RestoreSandboxResult } from '../../features/backup/restoreSandbox';
import type { BackupPreview } from '../../hooks/useFileImport';
import type { TranslationFn } from '../../contexts/LanguageContext';
import type { Wallet as WalletModel } from '../../types';
import {
  buildBackupImportSelectionSummary,
  createAllBackupWalletSelection,
  getBackupSelectionIdsByFolder,
  getBackupSelectionIdsByTag,
  getBackupWalletSelectionId,
} from '../../features/backup/backupImportSelection';

type BackupImportMode = 'merge' | 'replace';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type PreviewValueBlockProps = {
  label: string;
  value: string;
  icon: typeof Fingerprint;
  expanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  t: TranslationFn;
};

function PreviewValueBlock({ label, value, icon: Icon, expanded, onToggle, onCopy, t }: PreviewValueBlockProps) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-black/10 p-2.5 shadow-inner shadow-black/5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold">
          <Icon size={14} aria-hidden="true" />
          <span>{label}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${expanded ? t('common.hide') : t('common.show')} ${label}`}
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-scale-xs font-semibold transition-colors hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          >
            {expanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
            {expanded ? t('common.hide') : t('common.show')}
          </button>
          <button
            type="button"
            aria-label={`${t('common.copy')} ${label}`}
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-1 text-scale-xs font-semibold transition-colors hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          >
            <Copy size={12} aria-hidden="true" />{t('common.copy')}
          </button>
        </span>
      </div>
      <code className={`block rounded-lg bg-black/10 px-2 py-1.5 font-mono text-scale-2xs leading-relaxed text-emerald-50 sm:text-scale-xs ${expanded ? 'break-all' : 'truncate whitespace-nowrap'}`}>
        {value || '-'}
      </code>
    </div>
  );
}

function getIntegrityPresentation(integrity?: string, status?: unknown) {
  if (status === 'tampered') {
    return {
      icon: ShieldX,
      badgeClass: 'bg-red-500/20 text-red-100 ring-1 ring-red-400/40',
      haloClass: 'bg-red-500/10',
      iconClass: 'text-red-400',
      labelKey: 'restore.status_tampered',
    };
  }

  switch (integrity) {
    case 'verified':
      return {
        icon: ShieldCheck,
        badgeClass: 'bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-300/40',
        haloClass: 'bg-emerald-500/10',
        iconClass: 'text-emerald-400',
        labelKey: 'restore.integrity_verified',
      };
    case 'repaired':
      return {
        icon: Wrench,
        badgeClass: 'bg-amber-500/20 text-amber-50 ring-1 ring-amber-300/40',
        haloClass: 'bg-amber-500/10',
        iconClass: 'text-amber-400',
        labelKey: 'restore.integrity_repaired',
      };
    case 'modified':
      return {
        icon: AlertTriangle,
        badgeClass: 'bg-orange-500/20 text-orange-50 ring-1 ring-orange-300/40',
        haloClass: 'bg-orange-500/10',
        iconClass: 'text-orange-400',
        labelKey: 'restore.integrity_modified',
      };
    default:
      return {
        icon: ShieldAlert,
        badgeClass: 'bg-surface-500/20 text-surface-100 ring-1 ring-surface-300/30',
        haloClass: 'bg-emerald-500/10',
        iconClass: 'text-emerald-400',
        labelKey: `restore.integrity_${integrity || 'unknown'}`,
      };
  }
}

type BackupImportPasswordModalProps = {
  loading: boolean;
  fileOperationKey: string;
  backupPreview: BackupPreview | null;
  backupAnalysis: BackupImportAnalysis | null;
  restoreSandbox: RestoreSandboxResult | null;
  backupImportMode: BackupImportMode;
  updateMissingSensitive: boolean;
  importPassword: string;
  backupWalletsForSelection: WalletModel[];
  selectedBackupWalletIds: string[];
  brandReminders: boolean;
  t: TranslationFn;
  onPasswordChange: (value: string) => void;
  onSelectedBackupWalletIdsChange: (ids: string[]) => void;
  onCancel: () => void;
  onPreview: () => Promise<void>;
  onImport: () => void;
  onSaveRestoreReport: () => Promise<void>;
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
  restoreSandbox,
  backupImportMode,
  updateMissingSensitive,
  importPassword,
  backupWalletsForSelection,
  selectedBackupWalletIds,
  brandReminders,
  t,
  onPasswordChange,
  onSelectedBackupWalletIdsChange,
  onCancel,
  onPreview,
  onImport,
  onSaveRestoreReport,
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const [backupIdExpanded, setBackupIdExpanded] = useState(false);
  const [fileHashExpanded, setFileHashExpanded] = useState(false);
  const [showAllOfflineDiff, setShowAllOfflineDiff] = useState(false);
  const [walletSearch, setWalletSearch] = useState('');
  const backupId = asText(backupPreview?.backupId) || asText(backupPreview?.metadata?.backupId);
  const fileHash = asText(backupPreview?.containerHash) || asText(backupPreview?.metadata?.containerHash);
  const metadata = backupPreview?.metadata;
  const integrity = asText(backupPreview?.integrity) || 'unknown';
  const integrityPresentation = getIntegrityPresentation(integrity, backupPreview?.status);
  const IntegrityIcon = integrityPresentation.icon;
  const offlineDiffItems = restoreSandbox?.diff.items.filter(item => item.status !== 'unchanged') || [];
  const visibleOfflineDiffItems = showAllOfflineDiff ? offlineDiffItems : offlineDiffItems.slice(0, 6);
  const createdAtText = asText(metadata?.createdAt) ? new Date(asText(metadata?.createdAt)).toLocaleString() : '';
  const selectionSummary = buildBackupImportSelectionSummary(backupWalletsForSelection, selectedBackupWalletIds);
  const selectedBackupWalletSet = new Set(selectedBackupWalletIds);
  const normalizedWalletSearch = walletSearch.trim().toLowerCase();
  const filteredBackupWalletsForSelection = normalizedWalletSearch
    ? backupWalletsForSelection.filter((wallet) => {
      const searchableText = [
        wallet.name,
        wallet.address,
        wallet.groupId,
        wallet.network,
        ...(wallet.tags || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(normalizedWalletSearch);
    })
    : backupWalletsForSelection;
  const toggleSelectedIds = (ids: string[], forceSelected?: boolean) => {
    const next = new Set(selectedBackupWalletIds);
    const shouldSelect = forceSelected ?? ids.some(id => !next.has(id));
    ids.forEach((id) => {
      if (shouldSelect) next.add(id);
      else next.delete(id);
    });
    onSelectedBackupWalletIdsChange(Array.from(next));
  };
  const selectAllBackupWallets = () => {
    onSelectedBackupWalletIdsChange(createAllBackupWalletSelection(backupWalletsForSelection));
  };
  const clearAllBackupWallets = () => {
    onSelectedBackupWalletIdsChange([]);
  };
  const selectVisibleBackupWallets = () => {
    toggleSelectedIds(filteredBackupWalletsForSelection.map((wallet, index) => getBackupWalletSelectionId(wallet, backupWalletsForSelection.indexOf(wallet) >= 0 ? backupWalletsForSelection.indexOf(wallet) : index)), true);
  };
  const clearVisibleBackupWallets = () => {
    toggleSelectedIds(filteredBackupWalletsForSelection.map((wallet, index) => getBackupWalletSelectionId(wallet, backupWalletsForSelection.indexOf(wallet) >= 0 ? backupWalletsForSelection.indexOf(wallet) : index)), false);
  };
  const pasteWalletSearch = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setWalletSearch(text);
      onHapticSuccess();
    } catch {
      onHapticTap();
    }
  };
  const metadataItems = metadata
    ? [
      { label: t('restore.createdAt'), value: createdAtText, icon: CalendarDays },
      { label: t('restore.createdOn'), value: asText(metadata.platform), icon: MonitorSmartphone },
      { label: t('restore.walletCount'), value: asText(metadata.walletCount), icon: Wallet },
      { label: t('restore.folderCount'), value: asText(metadata.folderCount), icon: FolderOpen },
      { label: t('restore.networkCount'), value: asText(metadata.networkCount), icon: Globe2 },
      { label: t('restore.source'), value: asText(metadata.source), icon: Package },
    ]
    : [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const firstFocusable = focusableElements[0];
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onHapticTap();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onCancel, onHapticTap]);

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
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => { onHapticTap(); onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-backup-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="restore-backup-modal my-auto h-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-3 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:w-full sm:p-6"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${integrityPresentation.haloClass}`}>
          <IntegrityIcon size={22} className={integrityPresentation.iconClass} />
        </div>
        <h3 id="restore-backup-title" className="text-white font-bold text-center mb-1">{t('restore.title')}</h3>
        <p className="text-surface-300 text-sm text-center mb-4">{t('restore.desc')}</p>
        <div className="mb-4 rounded-xl border border-sky-500/25 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-100">
          <div className="font-bold uppercase tracking-wide text-sky-50">{t('restore.previewFirst')}</div>
          <div className="mt-1">{t('restore.stepGuide')}</div>
        </div>
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
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-semibold uppercase ${integrityPresentation.badgeClass}`}>
                <IntegrityIcon size={12} aria-hidden="true" />
                {t(integrityPresentation.labelKey)}
              </span>
            </div>
            {backupPreview.openedFromExternal && (
              <div className="mb-2 rounded-lg border border-sky-400/25 bg-sky-400/10 px-2.5 py-2 text-sky-100">
                <div className="text-scale-xs font-bold uppercase">{t('restore.openedExternal')}</div>
                <div className="mt-0.5 leading-relaxed">{t('restore.openedExternalWarning')}</div>
              </div>
            )}
            {backupPreview.metadata ? (
                <div className="space-y-2 text-surface-100">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {metadataItems.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-2.5 py-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/15 text-emerald-200">
                        <Icon size={14} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-scale-2xs font-semibold uppercase tracking-wide text-surface-300">{label}</span>
                        <span className="block truncate text-scale-xs font-semibold text-surface-100">{value || '-'}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <PreviewValueBlock
                  label={t('restore.backupId')}
                  value={backupId}
                  icon={Fingerprint}
                  expanded={backupIdExpanded}
                  onToggle={() => setBackupIdExpanded((expanded) => !expanded)}
                  onCopy={() => onCopyPreviewValue('backupId', backupId)}
                  t={t}
                />

                <PreviewValueBlock
                  label={t('restore.containerHash')}
                  value={fileHash}
                  icon={Hash}
                  expanded={fileHashExpanded}
                  onToggle={() => setFileHashExpanded((expanded) => !expanded)}
                  onCopy={() => onCopyPreviewValue('containerHash', fileHash)}
                  t={t}
                />
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

        {restoreSandbox && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-surface-100">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-scale-xs font-bold uppercase tracking-wide text-emerald-200">{t('restoreSandbox.title')}</div>
                <div className="mt-1 text-surface-300">{t('restoreSandbox.subtitle')}</div>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-xs font-black ${restoreSandbox.canRestore ? 'bg-emerald-500/15 text-emerald-100' : 'bg-red-500/15 text-red-100'}`}>
                {restoreSandbox.health.score}/100 · {restoreSandbox.health.grade}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { key: 'newInBackup', label: t('restoreSandbox.newInBackup'), value: restoreSandbox.diff.summary.newInBackup, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' },
                { key: 'missingFromBackup', label: t('restoreSandbox.missingFromBackup'), value: restoreSandbox.diff.summary.missingFromBackup, className: 'border-amber-500/20 bg-amber-500/10 text-amber-100' },
                { key: 'changed', label: t('restoreSandbox.changed'), value: restoreSandbox.diff.summary.changed, className: 'border-sky-500/20 bg-sky-500/10 text-sky-100' },
                { key: 'duplicateSecrets', label: t('restoreSandbox.duplicateSecrets'), value: restoreSandbox.diff.summary.duplicateSecrets, className: 'border-red-500/20 bg-red-500/10 text-red-100' },
              ].map(item => (
                <div key={item.key} className={`rounded-lg border px-2.5 py-2 ${item.className}`}>
                  <span className="block text-scale-2xs font-semibold uppercase tracking-wide opacity-80">{item.label}</span>
                  <span className="block text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </div>
             <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2">
               <div className="font-semibold text-surface-100">{t('restoreSandbox.recommendation')}: {t(`restoreSandbox.mode_${restoreSandbox.recommendedMode}`)}</div>
               <div className="mt-1 leading-relaxed text-surface-300">{t(`restoreSandbox.recommendation_${restoreSandbox.health.recommendation}`)}</div>
             </div>
             <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2">
               <div className="mb-2 font-semibold text-surface-100">{t('restoreSandbox.restorePlan')}</div>
               <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                 {[
                   { key: 'willAdd', label: t('restoreSandbox.willAdd'), value: restoreSandbox.restorePlan.totals.willAdd, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' },
                   { key: 'willSkip', label: t('restoreSandbox.willSkip'), value: restoreSandbox.restorePlan.totals.willSkip, className: 'border-surface-500/20 bg-surface-500/10 text-surface-100' },
                   { key: 'willUpdate', label: t('restoreSandbox.willUpdate'), value: restoreSandbox.restorePlan.totals.willUpdate, className: 'border-sky-500/20 bg-sky-500/10 text-sky-100' },
                   { key: 'willUpdateSensitive', label: t('restoreSandbox.willUpdateSensitive'), value: restoreSandbox.restorePlan.totals.willUpdateSensitive, className: 'border-amber-500/20 bg-amber-500/10 text-amber-100' },
                   { key: 'willDeleteIfReplace', label: t('restoreSandbox.willDeleteIfReplace'), value: restoreSandbox.restorePlan.totals.willDeleteIfReplace, className: 'border-orange-500/20 bg-orange-500/10 text-orange-100' },
                   { key: 'blockedConflicts', label: t('restoreSandbox.blockedConflicts'), value: restoreSandbox.restorePlan.totals.blockedConflicts, className: 'border-red-500/20 bg-red-500/10 text-red-100' },
                 ].map(item => (
                   <div key={item.key} className={`rounded-lg border px-2.5 py-2 ${item.className}`}>
                     <span className="block text-scale-2xs font-semibold uppercase tracking-wide opacity-80">{item.label}</span>
                     <span className="block text-sm font-bold">{item.value}</span>
                   </div>
                 ))}
               </div>
                <div className="mt-2 text-scale-2xs leading-relaxed text-surface-300">
                 {t('restoreSandbox.safeToMerge')}: {restoreSandbox.restorePlan.safeToMerge ? t('common.yes') : t('common.no')} · {t('restoreSandbox.safeToReplace')}: {restoreSandbox.restorePlan.safeToReplace ? t('common.yes') : t('common.no')}
               </div>
             </div>
             {restoreSandbox.restorePlan.blockingOperations.length > 0 && (
               <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-red-100">
                 <div className="mb-1 font-semibold">{t('restoreSandbox.blockingOperations')}</div>
                 <div className="space-y-1">
                   {restoreSandbox.restorePlan.blockingOperations.slice(0, 3).map(operation => (
                     <div key={`${operation.type}-${operation.walletId}`} className="text-scale-2xs leading-relaxed">
                       {operation.walletName}: {operation.reason}
                     </div>
                   ))}
                 </div>
               </div>
             )}
            <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2">
              <div className="mb-2 font-semibold text-surface-100">{t('restoreSandbox.healthBreakdown')}</div>
              <div className="space-y-2">
                {restoreSandbox.health.factors.map((factor) => (
                  <div key={factor.key}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-scale-2xs font-semibold uppercase tracking-wide text-surface-300">
                      <span>{factor.label}</span>
                      <span>{factor.score}/{factor.max}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-800">
                      <div
                        className={`h-full rounded-full ${factor.score / factor.max >= 0.75 ? 'bg-emerald-400' : factor.score / factor.max >= 0.5 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.max(4, Math.round((factor.score / factor.max) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2">
              <div className="mb-1 font-semibold text-surface-100">{t('restoreSandbox.offlineDiff')}</div>
              <div className="mb-2 text-scale-2xs leading-relaxed text-surface-300">{t('restoreSandbox.offlineDiffDesc')}</div>
              <div className="space-y-1.5">
                {visibleOfflineDiffItems
                  .map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-surface-900/50 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold text-surface-100">{item.name || item.address || item.id}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-scale-2xs font-bold uppercase ${item.status === 'new_in_backup' ? 'bg-emerald-500/15 text-emerald-100' : item.status === 'missing_from_backup' ? 'bg-amber-500/15 text-amber-100' : 'bg-sky-500/15 text-sky-100'}`}>
                          {t(`restoreSandbox.status_${item.status}`)}
                        </span>
                      </div>
                      {item.changes.length > 0 && (
                        <div className="mt-1 text-scale-2xs leading-relaxed text-surface-300">
                          {item.changes.slice(0, 3).map(change => `${change.field}: ${change.currentLabel} → ${change.backupLabel}`).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                {offlineDiffItems.length === 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-2 text-emerald-100">{t('restoreSandbox.noDiff')}</div>
                )}
              </div>
              {offlineDiffItems.length > 6 && (
                <button
                  type="button"
                  onClick={() => { onHapticTap(); setShowAllOfflineDiff((visible) => !visible); }}
                  className="mt-2 rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-scale-2xs font-semibold text-surface-100 transition-colors hover:bg-surface-700"
                >
                  {showAllOfflineDiff
                    ? t('restoreSandbox.showLessDiff')
                    : t('restoreSandbox.showAllDiff', { count: offlineDiffItems.length })}
                </button>
              )}
            </div>
            {restoreSandbox.warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {restoreSandbox.warnings.map((warning, index) => (
                  <div key={`${warning.code}-${index}`} className={`rounded-lg border px-2.5 py-2 ${warning.severity === 'critical' ? 'border-red-500/25 bg-red-500/10 text-red-100' : warning.severity === 'warning' ? 'border-amber-500/25 bg-amber-500/10 text-amber-100' : 'border-sky-500/25 bg-sky-500/10 text-sky-100'}`}>
                    {t(warning.messageKey, warning.params) || warning.message}
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => { onHapticTap(); onSaveRestoreReport(); }} className="mt-3 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 font-semibold text-surface-100 transition-colors hover:bg-surface-700">
              {t('restoreSandbox.saveReport')}
            </button>
          </div>
        )}

        {backupWalletsForSelection.length > 0 && (
          <div className="mb-4 rounded-xl border border-surface-700 bg-surface-950/40 p-3 text-xs text-surface-200">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-scale-xs font-bold uppercase tracking-wide text-brand-200">{t('backupImportSelection.title')}</div>
                <div className="mt-1 text-surface-400">
                  {t('backupImportSelection.summary', {
                    selected: selectionSummary.selectedWallets,
                    total: selectionSummary.totalWallets,
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={selectAllBackupWallets}
                  className="btn-glow rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 font-semibold text-brand-100 hover:bg-brand-500/15"
                >
                  {t('backupImportSelection.selectAll')}
                </button>
                <button
                  type="button"
                  onClick={clearAllBackupWallets}
                  className="btn-glow rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 font-semibold text-surface-100 hover:bg-surface-700"
                >
                  {t('backupImportSelection.clearAll')}
                </button>
              </div>
            </div>
            <div className="mb-3 rounded-xl border border-surface-700 bg-surface-900/60 p-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-scale-2xs font-bold uppercase tracking-wide text-surface-400" htmlFor="backup-wallet-search">
                <Search size={12} aria-hidden="true" />
                {t('backupImportSelection.searchLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id="backup-wallet-search"
                  value={walletSearch}
                  onChange={(event) => setWalletSearch(event.target.value)}
                  placeholder={t('backupImportSelection.searchPlaceholder')}
                  className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={pasteWalletSearch}
                  className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 font-semibold text-surface-100 hover:bg-surface-700"
                >
                  <ClipboardPaste size={14} aria-hidden="true" />
                  {t('common.paste')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={selectVisibleBackupWallets}
                  className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1.5 font-semibold text-brand-100"
                >
                  {t('backupImportSelection.selectVisible')}
                </button>
                <button
                  type="button"
                  onClick={clearVisibleBackupWallets}
                  className="rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-1.5 font-semibold text-surface-200"
                >
                  {t('backupImportSelection.clearVisible')}
                </button>
              </div>
            </div>
            {selectionSummary.folders.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-surface-100"><FolderOpen size={13} />{t('backupImportSelection.folders')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectionSummary.folders.map(folder => (
                    <button
                      key={folder.name}
                      type="button"
                      onClick={() => toggleSelectedIds(getBackupSelectionIdsByFolder(backupWalletsForSelection, folder.name))}
                      className={`rounded-full border px-2.5 py-1 font-semibold ${folder.selectedCount > 0 ? 'border-brand-400/40 bg-brand-500/15 text-brand-100' : 'border-surface-700 bg-surface-800 text-surface-300'}`}
                    >
                      {folder.name} · {folder.selectedCount}/{folder.count}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectionSummary.tags.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-surface-100"><Tags size={13} />{t('backupImportSelection.tags')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectionSummary.tags.map(tag => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => toggleSelectedIds(getBackupSelectionIdsByTag(backupWalletsForSelection, tag.name))}
                      className={`rounded-full border px-2.5 py-1 font-semibold ${tag.selectedCount > 0 ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100' : 'border-surface-700 bg-surface-800 text-surface-300'}`}
                    >
                      #{tag.name} · {tag.selectedCount}/{tag.count}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {filteredBackupWalletsForSelection.map((wallet) => {
                const walletIndex = backupWalletsForSelection.indexOf(wallet);
                const walletId = getBackupWalletSelectionId(wallet, walletIndex);
                const checked = selectedBackupWalletSet.has(walletId);
                return (
                  <div
                    key={walletId}
                    className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${checked ? 'border-brand-400/40 bg-brand-500/10 text-brand-50' : 'border-surface-700 bg-surface-900/70 text-surface-300 hover:bg-surface-800'}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelectedIds([walletId])}
                      className="mt-0.5 shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      aria-label={checked ? t('backupImportSelection.unselectWallet') : t('backupImportSelection.selectWallet')}
                    >
                      {checked ? <CheckSquare size={16} className="text-brand-300" /> : <Square size={16} className="text-surface-500" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelectedIds([walletId])}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-semibold">{wallet.name || wallet.address || t('wallet.unnamed')}</span>
                      <span className="mt-0.5 block truncate font-mono text-scale-2xs text-surface-400">{wallet.address || t('backupImportSelection.noAddress')}</span>
                      <span className="mt-0.5 block truncate text-scale-2xs text-surface-500">{wallet.groupId || t('folder.imported')} · {(wallet.tags || []).map(tag => `#${tag}`).join(' ')}</span>
                    </button>
                    {wallet.address && (
                      <button
                        type="button"
                        onClick={() => onCopyPreviewValue('walletAddress', wallet.address || '')}
                        className="btn-glow shrink-0 rounded-lg border border-surface-700 bg-surface-800 px-2 py-1.5 text-scale-2xs font-semibold text-surface-100 hover:bg-surface-700"
                        aria-label={`${t('common.copy')} ${t('backupImportSelection.walletAddress')}`}
                      >
                        <Copy size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredBackupWalletsForSelection.length === 0 && (
                <div className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-4 text-center text-surface-400">
                  {t('backupImportSelection.noSearchResults')}
                </div>
              )}
            </div>
          </div>
        )}

        {backupAnalysis && (
          <div className="mb-4 rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-surface-200">
            <div className="mb-3">
              <div className="mb-2 text-scale-xs font-bold uppercase tracking-wide text-brand-200">{t('restore.confirmSummaryTitle')}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { key: 'newWallets', label: t('restore.confirmNewWallets'), value: backupAnalysis.newWallets, icon: PlusCircle, className: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/20' },
                  { key: 'duplicates', label: t('restore.confirmDuplicates'), value: Math.max(0, backupAnalysis.duplicates - backupAnalysis.changed), icon: Copy, className: 'text-sky-200 bg-sky-500/10 border-sky-500/20' },
                  { key: 'changed', label: t('restore.confirmChanged'), value: backupAnalysis.changed, icon: RefreshCw, className: 'text-amber-100 bg-amber-500/10 border-amber-500/20' },
                  { key: 'missingSensitive', label: t('restore.confirmMissingSensitive'), value: backupAnalysis.missingSensitive, icon: AlertTriangle, className: 'text-red-100 bg-red-500/10 border-red-500/20' },
                  { key: 'sensitive', label: t('restore.confirmSensitive'), value: backupAnalysis.sensitive, icon: KeyRound, className: 'text-brand-100 bg-brand-500/10 border-brand-500/20 sm:col-span-2' },
                ].map(({ key, label, value, icon: Icon, className }) => (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${className}`}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/15">
                      <Icon size={14} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-scale-2xs font-semibold uppercase tracking-wide opacity-80">{label}</span>
                      <span className="block text-sm font-bold">{value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-100" role="status">
            <Settings size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
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
          {restoreSandbox && (
            <button onClick={handleImportClick}
              disabled={loading || backupPreview?.status === 'tampered' || !restoreSandbox.canRestore || (backupImportMode === 'replace' && !backupAnalysis)}
              className="btn-glow btn-glow-success min-w-28 flex-1 whitespace-normal rounded-lg bg-brand-600 py-2.5 font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-50">{t('restore.button')}</button>
          )}
        </div>
      </div>
    </div>
  );
}