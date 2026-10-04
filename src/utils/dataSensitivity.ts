export type DataSensitivity = 'public' | 'private' | 'critical_secret' | 'recovery_material';

export type SecretKind = 'address' | 'privateKey' | 'mnemonic' | 'backupHint' | 'sensitiveNote' | 'generic';

export type ClipboardPolicy = {
  sensitivity: DataSensitivity;
  defaultClearAfterMs: number;
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
  copyAllowedByDefault: boolean;
};

export const SECRET_COPY_DISABLED_KEY = 'xkey_disable_secret_copy';

export const CLIPBOARD_POLICIES: Record<SecretKind, ClipboardPolicy> = {
  address: {
    sensitivity: 'public',
    defaultClearAfterMs: 120000,
    warningLevel: 'info',
    copyAllowedByDefault: true,
  },
  privateKey: {
    sensitivity: 'critical_secret',
    defaultClearAfterMs: 30000,
    warningLevel: 'critical',
    copyAllowedByDefault: true,
  },
  mnemonic: {
    sensitivity: 'recovery_material',
    defaultClearAfterMs: 30000,
    warningLevel: 'critical',
    copyAllowedByDefault: true,
  },
  backupHint: {
    sensitivity: 'private',
    defaultClearAfterMs: 120000,
    warningLevel: 'warning',
    copyAllowedByDefault: true,
  },
  sensitiveNote: {
    sensitivity: 'critical_secret',
    defaultClearAfterMs: 30000,
    warningLevel: 'critical',
    copyAllowedByDefault: true,
  },
  generic: {
    sensitivity: 'private',
    defaultClearAfterMs: 60000,
    warningLevel: 'warning',
    copyAllowedByDefault: true,
  },
};

export const getClipboardPolicy = (kind: SecretKind): ClipboardPolicy => CLIPBOARD_POLICIES[kind] || CLIPBOARD_POLICIES.generic;

export const isSecretKind = (kind: SecretKind): boolean =>
  kind === 'privateKey' || kind === 'mnemonic' || kind === 'sensitiveNote';

/** UI copy IDs may carry an index/address suffix; classify before policy checks. */
export const resolveCopyFieldKind = (field: string): SecretKind => {
  if (/^(privateKey|pk)(?:$|[_-])/i.test(field)) return 'privateKey';
  if (/^(mnemonic|mn|seedPhrase|seed)(?:$|[_-])/i.test(field)) return 'mnemonic';
  if (/^(address|addr|vanity-extra|vanity-result|vanity-found|vanity-candidate)(?:$|[_-])/i.test(field)) return 'address';
  return 'generic';
};
