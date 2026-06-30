import { AlertTriangle, Check, FileText, Save, ShieldAlert, X } from 'lucide-react';
import type { CsvImportMapping, CsvImportPreview, CsvWalletColumnKey } from '../features/import/fileImportParsers';
import type { TranslationFn } from '../contexts/LanguageContext';
import { XKEY_SLOGAN } from '../utils/branding';

type CsvImportPreviewModalProps = {
  preview: CsvImportPreview;
  loading: boolean;
  brandReminders?: boolean;
  t: TranslationFn;
  onMappingChange: (mapping: CsvImportMapping) => void;
  onCancel: () => void;
  onImport: () => void;
  onSaveReport: () => void;
};

const FIELD_KEYS: Array<{ key: CsvWalletColumnKey; labelKey: string; required?: boolean; sensitive?: boolean }> = [
  { key: 'name', labelKey: 'exportCSV.colName' },
  { key: 'address', labelKey: 'exportCSV.colAddress', required: true },
  { key: 'balance', labelKey: 'exportCSV.colBalance' },
  { key: 'groupId', labelKey: 'exportCSV.colFolder' },
  { key: 'network', labelKey: 'exportCSV.colNetwork' },
  { key: 'privateKey', labelKey: 'exportCSV.colPrivateKey', sensitive: true },
  { key: 'seedPhrase', labelKey: 'exportCSV.colSeedPhrase', sensitive: true },
];

export default function CsvImportPreviewModal({
  preview,
  loading,
  brandReminders,
  t,
  onMappingChange,
  onCancel,
  onImport,
  onSaveReport,
}: CsvImportPreviewModalProps) {
  const updateMapping = (key: CsvWalletColumnKey, value: string) => {
    onMappingChange({ ...preview.mapping, [key]: value });
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="csv-import-preview-modal-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-2xl dark:border-surface-800 dark:bg-surface-950">
        <div className="flex items-start justify-between border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-surface-950 dark:text-white">{t('csvImportPreview.title')}</h2>
            <p className="mt-1 truncate text-xs text-surface-500 dark:text-surface-400">{preview.fileName}</p>
          </div>
          <button
            onClick={onCancel}
            className="btn-icon-glow rounded-full p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-900 active:scale-95 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
            aria-label={t('common.cancel')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label={t('csvImportPreview.rows')} value={preview.rowCount} />
            <Stat label={t('csvImportPreview.validWallets')} value={preview.uniqueWallets.length} good />
            <Stat label={t('csvImportPreview.duplicates')} value={preview.skippedDuplicates} warn={preview.skippedDuplicates > 0} />
            <Stat label={t('csvImportPreview.missingAddress')} value={preview.missingAddress} warn={preview.missingAddress > 0} />
            <Stat label={t('csvImportPreview.invalidAddress')} value={preview.invalidAddress} warn={preview.invalidAddress > 0} />
            <Stat label={t('csvImportPreview.sensitiveRows')} value={preview.sensitiveCount} danger={preview.sensitiveCount > 0} />
          </div>

          {preview.includesSensitive && (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                {brandReminders && <strong className="block">{XKEY_SLOGAN}</strong>}
                {t('csvImportPreview.sensitiveWarning')}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-surface-200 bg-surface-50/80 p-4 dark:border-surface-800 dark:bg-surface-900/60">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-950 dark:text-white">
                  <FileText size={16} className="text-brand-600 dark:text-brand-400" />
                  {t('csvImportPreview.mappingTitle')}
                </h3>
                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                  {t('csvImportPreview.columnsDetected', { count: preview.headers.length })}
                </p>
              </div>
              <div className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-medium text-surface-600 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-300">
                {preview.uniqueWallets.length}/{preview.rowCount}
              </div>
            </div>

            <div className="space-y-3">
              {FIELD_KEYS.map(field => (
                <MappingRow
                  key={field.key}
                  field={field}
                  value={preview.mapping[field.key] || ''}
                  headers={preview.headers}
                  t={t}
                  onChange={value => updateMapping(field.key, value)}
                />
              ))}
            </div>
          </div>

          {preview.issues.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
                <AlertTriangle size={16} />
                {t('csvImportPreview.issueTitle', { count: preview.issues.length })}
              </h3>
              <div className="max-h-32 space-y-1 overflow-y-auto text-xs text-amber-800/80 dark:text-amber-100/80">
                {preview.issues.slice(0, 20).map((issue, index) => (
                  <div key={`${issue.row}-${issue.field}-${index}`}>
                    {t('csvImportPreview.rowIssue', { row: issue.row, message: issue.message })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-surface-200 bg-white/95 p-4 dark:border-surface-800 dark:bg-surface-950/95">
          <button
            onClick={onSaveReport}
            className="btn-glow flex flex-1 items-center justify-center gap-2 rounded-xl border border-surface-200 bg-surface-50 py-3 font-bold text-surface-800 shadow-sm transition-all hover:bg-surface-100 active:scale-95 dark:border-surface-800 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
          >
            <Save size={16} />
            {t('csvImportPreview.saveReport')}
          </button>
          <button
            onClick={onCancel}
            className="btn-glow flex-1 rounded-xl border border-transparent bg-surface-100 py-3 font-bold text-surface-800 shadow-sm transition-all hover:bg-surface-200 active:scale-95 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onImport}
            disabled={loading || preview.uniqueWallets.length === 0}
            className="btn-glow flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            <Check size={16} />
            {loading ? t('fileStatus.importing') : t('csvImportPreview.import')}
          </button>
        </div>
      </div>
    </div>
  );
}

function MappingRow({
  field,
  value,
  headers,
  t,
  onChange,
}: {
  field: { key: CsvWalletColumnKey; labelKey: string; required?: boolean; sensitive?: boolean };
  value: string;
  headers: string[];
  t: TranslationFn;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-3 shadow-sm dark:border-surface-800 dark:bg-surface-950">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
          {t(field.labelKey)}
          {field.required && <span className="text-red-500">*</span>}
          {field.sensitive && <ShieldAlert size={14} className="text-red-500" />}
        </div>
        {value ? (
          <span className="max-w-[45%] truncate rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {value}
          </span>
        ) : (
          <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
            {t('csvImportPreview.ignoreColumn')}
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onChange('')}
          className={[
            'csv-mapping-chip btn-glow shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95',
            value === ''
              ? 'border-surface-400 bg-surface-200 text-surface-900 dark:border-surface-600 dark:bg-surface-800 dark:text-white'
              : 'border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-100 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800',
          ].join(' ')}
        >
          {t('csvImportPreview.ignoreColumn')}
        </button>

        {headers.map(header => {
          const active = value === header;
          return (
            <button
              key={header}
              type="button"
              onClick={() => onChange(header)}
              className={[
                'csv-mapping-chip btn-glow shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95',
                active
                  ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                  : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-300',
              ].join(' ')}
            >
              {header}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, good, warn, danger }: { label: string; value: number; good?: boolean; warn?: boolean; danger?: boolean }) {
  const tone = danger
    ? 'text-red-600 dark:text-red-300'
    : warn
      ? 'text-amber-600 dark:text-amber-300'
      : good
        ? 'text-emerald-600 dark:text-emerald-300'
        : 'text-surface-950 dark:text-white';
  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-3 shadow-sm dark:border-surface-800 dark:bg-surface-900/70">
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-surface-500 dark:text-surface-400">{label}</div>
    </div>
  );
}