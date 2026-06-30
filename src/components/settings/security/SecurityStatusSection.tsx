import { ChevronDown, ShieldCheck } from 'lucide-react';
import type { TranslationFn } from '../../../contexts/LanguageContext';

type SecurityStatus = {
  mode?: string;
  deviceProtected?: boolean;
  deviceCredentialAvailable?: boolean;
  fallback?: boolean;
  vaultExists?: boolean;
  vaultStorageError?: unknown;
  hardwareInfo?: {
    strongBoxSupported?: boolean;
    keystoreAvailable?: boolean;
  } | null;
  storage?: {
    ramOnlyDecrypted?: boolean;
    fragmentedStorageHealthy?: boolean;
    fragmentedStorage?: boolean;
    fragmentCount?: number;
  };
};

type SecurityStatusSectionProps = {
  t: TranslationFn;
  expanded: boolean;
  onToggle: () => void;
  securityStatus: SecurityStatus | null;
  hardwareSecurityLabel: () => string;
};

export function SecurityStatusSection({
  t,
  expanded,
  onToggle,
  securityStatus,
  hardwareSecurityLabel,
}: SecurityStatusSectionProps) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800/30 ${expanded ? 'border-b border-surface-200 dark:border-surface-700/50' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-950 dark:text-white">{t('settings.securityStatusTitle')}</p>
          </div>
        </div>
        <ChevronDown size={18} className={`flex-shrink-0 text-surface-700 transition-transform dark:text-surface-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mx-4 mb-4 mt-4 space-y-3">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
            {t('settings.securityStatusDesc')}
          </p>

          <div className="divide-y divide-surface-200 rounded-xl border border-surface-300 bg-white dark:divide-surface-700/30 dark:border-surface-700/60 dark:bg-surface-900/40">
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-700 dark:text-surface-300">{t('settings.securityMode')}</span>
              <span className="text-xs font-semibold text-surface-950 dark:text-white">
                {securityStatus ? t(`settings.securityMode_${securityStatus.mode}`) : t('settings.securityChecking')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-700 dark:text-surface-300">{t('settings.vaultKeyProtection')}</span>
              <span className="text-xs font-semibold text-surface-950 dark:text-white">
                {securityStatus?.deviceProtected ? t('settings.keystoreProtected') : t('settings.fallbackProtected')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-700 dark:text-surface-300">{t('settings.deviceCredential')}</span>
              <span className={`text-xs font-bold ${securityStatus?.deviceCredentialAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                {securityStatus?.deviceCredentialAvailable ? t('settings.available') : t('settings.unavailable')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-xs text-surface-700 dark:text-surface-300">{t('settings.hardwareSecurity')}</span>
              <span className={`text-right text-xs font-bold ${securityStatus?.hardwareInfo?.strongBoxSupported || securityStatus?.hardwareInfo?.keystoreAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                {securityStatus ? hardwareSecurityLabel() : t('settings.securityChecking')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-xs text-surface-700 dark:text-surface-300">{t('settings.compatibilityFallback')}</span>
              <span className={`text-xs font-bold ${securityStatus?.fallback ? 'text-amber-400' : 'text-emerald-400'}`}>
                {securityStatus?.fallback ? t('settings.enabled') : t('settings.disabled')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-xs text-surface-700 dark:text-surface-300">{t('settings.ramOnlyDecryptedVault')}</span>
              <span className="text-right text-xs font-bold text-emerald-400">
                {securityStatus?.storage?.ramOnlyDecrypted ? t('settings.ramOnlyDecryptedStatus') : t('settings.securityChecking')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-xs text-surface-700 dark:text-surface-300">{t('settings.vaultStorageLayout')}</span>
              <span
                className={`text-right text-xs font-bold ${
                  !securityStatus?.vaultExists
                    ? 'text-surface-700 dark:text-surface-300'
                    : securityStatus?.vaultStorageError || securityStatus?.storage?.fragmentedStorageHealthy === false
                      ? 'text-red-400'
                      : securityStatus?.storage?.fragmentedStorage
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                }`}
              >
                {!securityStatus?.vaultExists
                  ? t('settings.noVaultStorageYet')
                  : securityStatus?.vaultStorageError || securityStatus?.storage?.fragmentedStorageHealthy === false
                    ? t('settings.vaultStorageError')
                    : securityStatus?.storage?.fragmentedStorage
                      ? t('settings.fragmentedVaultStorage', { count: securityStatus.storage.fragmentCount || 3 })
                      : t('settings.legacyVaultStorage')}
              </span>
            </div>
          </div>

          {securityStatus?.fallback && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs leading-relaxed text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100">
              {t('settings.compatibilityFallbackWarning')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}