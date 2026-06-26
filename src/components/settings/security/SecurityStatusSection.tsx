import { ChevronDown, ShieldCheck } from 'lucide-react';
import Notice from '../../Notice';
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
        className="flex w-full items-center justify-between gap-3 border-b border-surface-700/50 p-4 text-left transition-colors hover:bg-surface-800/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{t('settings.securityStatusTitle')}</p>
            <p className="text-xs text-surface-400">{t('settings.securityStatusDesc')}</p>
          </div>
        </div>
        <ChevronDown size={18} className={`flex-shrink-0 text-surface-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mx-4 mt-4 mb-2 rounded-xl border border-surface-700/60 bg-surface-900/40 divide-y divide-surface-700/30">
          <div className="flex items-center justify-between p-3">
            <span className="text-xs text-surface-400">{t('settings.securityMode')}</span>
            <span className="text-xs font-semibold text-white">
              {securityStatus ? t(`settings.securityMode_${securityStatus.mode}`) : t('settings.securityChecking')}
            </span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-xs text-surface-400">{t('settings.vaultKeyProtection')}</span>
            <span className="text-xs font-semibold text-white">
              {securityStatus?.deviceProtected ? t('settings.keystoreProtected') : t('settings.fallbackProtected')}
            </span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-xs text-surface-400">{t('settings.deviceCredential')}</span>
            <span className={`text-xs font-bold ${securityStatus?.deviceCredentialAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
              {securityStatus?.deviceCredentialAvailable ? t('settings.available') : t('settings.unavailable')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <span className="text-xs text-surface-400">{t('settings.hardwareSecurity')}</span>
            <span className={`text-right text-xs font-bold ${securityStatus?.hardwareInfo?.strongBoxSupported || securityStatus?.hardwareInfo?.keystoreAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
              {securityStatus ? hardwareSecurityLabel() : t('settings.securityChecking')}
            </span>
          </div>
          <div className="flex items-center justify-between p-3">
            <span className="text-xs text-surface-400">{t('settings.compatibilityFallback')}</span>
            <span className={`text-xs font-bold ${securityStatus?.fallback ? 'text-amber-400' : 'text-emerald-400'}`}>
              {securityStatus?.fallback ? t('settings.enabled') : t('settings.disabled')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <span className="text-xs text-surface-400">{t('settings.ramOnlyDecryptedVault')}</span>
            <span className="text-right text-xs font-bold text-emerald-400">
              {securityStatus?.storage?.ramOnlyDecrypted ? t('settings.ramOnlyDecryptedStatus') : t('settings.securityChecking')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <span className="text-xs text-surface-400">{t('settings.vaultStorageLayout')}</span>
            <span className={`text-right text-xs font-bold ${
              !securityStatus?.vaultExists
                ? 'text-surface-400'
                : securityStatus?.vaultStorageError || securityStatus?.storage?.fragmentedStorageHealthy === false ? 'text-red-400'
                : securityStatus?.storage?.fragmentedStorage ? 'text-emerald-400' : 'text-amber-400'
            }`}>
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
      )}
      {securityStatus?.fallback && (
        <Notice variant="warning" className="mx-4 my-4">
          {t('settings.compatibilityFallbackWarning')}
        </Notice>
      )}
    </div>
  );
}