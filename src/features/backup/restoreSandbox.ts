import type { Wallet } from '../../types';
import { calculateBackupHealthScore, type BackupHealthInspection, type BackupHealthReport } from './backupHealthScore';
import { analyzeBackupVaultDiff, type BackupVaultDiff } from './backupVaultDiff';

export type RestoreSandboxWarning = {
  severity: 'info' | 'warning' | 'critical';
  code:
    | 'backup_tampered'
    | 'backup_repaired'
    | 'backup_stale'
    | 'replace_would_delete_wallets'
    | 'critical_conflicts'
    | 'duplicate_secrets'
    | 'missing_sensitive'
    | 'legacy_backup';
  message: string;
  messageKey: string;
  params?: Record<string, string | number | boolean>;
};

export type RestorePlanOperationType =
  | 'add_wallet'
  | 'skip_duplicate'
  | 'update_changed_wallet'
  | 'update_missing_sensitive'
  | 'delete_if_replace'
  | 'block_conflict';

export type RestorePlanOperation = {
  type: RestorePlanOperationType;
  walletId: string;
  walletName: string;
  address?: string;
  severity: 'info' | 'warning' | 'critical';
  reason: string;
  reasonKey: string;
};

export type RestorePlan = {
  operations: RestorePlanOperation[];
  blockingOperations: RestorePlanOperation[];
  totals: {
    willAdd: number;
    willSkip: number;
    willUpdate: number;
    willUpdateSensitive: number;
    willDeleteIfReplace: number;
    blockedConflicts: number;
  };
  safeToMerge: boolean;
  safeToReplace: boolean;
};

export type RestoreSandboxResult = {
  health: BackupHealthReport;
  diff: BackupVaultDiff;
  warnings: RestoreSandboxWarning[];
  restorePlan: RestorePlan;
  recommendedMode: 'merge' | 'replace' | 'cancel';
  canRestore: boolean;
  backupWalletCount: number;
};

export type RestoreSandboxInput = {
  currentWallets: Wallet[];
  backupWallets: Wallet[];
  inspection?: BackupHealthInspection | null;
  vaultChangedAt?: string | number | null;
  now?: Date;
};

const countMissingSensitive = (wallets: Wallet[]): number =>
  wallets.filter(wallet => !wallet.privateKey && !wallet.seedPhrase).length;

const walletName = (wallet?: Pick<Wallet, 'name' | 'address' | '_id'> | null, fallback = 'Unknown wallet'): string =>
  wallet?.name || wallet?.address || wallet?._id || fallback;

const normalizeAddress = (address?: string): string => (address || '').trim().toLowerCase();

const buildWalletAddressMap = (wallets: Wallet[]): Map<string, Wallet> => {
  const entries: Array<[string, Wallet]> = [];
  wallets.forEach((wallet) => {
    const address = normalizeAddress(wallet.address);
    if (address) entries.push([address, wallet]);
  });
  return new Map(entries);
};

const buildRestorePlan = (currentWallets: Wallet[], backupWallets: Wallet[], diff: BackupVaultDiff): RestorePlan => {
  const currentByAddress = buildWalletAddressMap(currentWallets);
  const backupByAddress = buildWalletAddressMap(backupWallets);
  const operations: RestorePlanOperation[] = [];
  const blockingOperations: RestorePlanOperation[] = [];

  diff.items.forEach((item) => {
    const currentWallet = currentByAddress.get(normalizeAddress(item.address));
    const backupWallet = backupByAddress.get(normalizeAddress(item.address));

    if (item.status === 'new_in_backup') {
      operations.push({
        type: 'add_wallet',
        walletId: item.id,
        walletName: walletName(backupWallet, item.name || item.id),
        address: item.address,
        severity: 'info',
        reason: 'Wallet exists in backup and will be added in merge mode.',
        reasonKey: 'restorePlan.add_wallet',
      });
      return;
    }

    if (item.status === 'missing_from_backup') {
      operations.push({
        type: 'delete_if_replace',
        walletId: item.id,
        walletName: walletName(currentWallet, item.name || item.id),
        address: item.address,
        severity: 'warning',
        reason: 'Wallet exists only in current vault and would be deleted in replace mode.',
        reasonKey: 'restorePlan.delete_if_replace',
      });
      return;
    }

    if (item.status === 'unchanged') {
      operations.push({
        type: 'skip_duplicate',
        walletId: item.id,
        walletName: walletName(backupWallet || currentWallet, item.name || item.id),
        address: item.address,
        severity: 'info',
        reason: 'Wallet already exists with no offline differences and will be skipped in merge mode.',
        reasonKey: 'restorePlan.skip_duplicate',
      });
      return;
    }

    if (item.changes.some(change => change.severity === 'critical')) {
      const operation: RestorePlanOperation = {
        type: 'block_conflict',
        walletId: item.id,
        walletName: walletName(backupWallet || currentWallet, item.name || item.id),
        address: item.address,
        severity: 'critical',
        reason: 'Critical secret conflict detected; restore should be blocked until reviewed.',
        reasonKey: 'restorePlan.block_conflict',
      };
      operations.push(operation);
      blockingOperations.push(operation);
      return;
    }

    operations.push({
      type: 'update_changed_wallet',
      walletId: item.id,
      walletName: walletName(backupWallet || currentWallet, item.name || item.id),
      address: item.address,
      severity: item.changes.some(change => change.severity === 'warning') ? 'warning' : 'info',
      reason: 'Wallet metadata differs between current vault and backup.',
      reasonKey: 'restorePlan.update_changed_wallet',
    });
  });

  diff.secretConflicts
    .filter(conflict => conflict.severity === 'critical')
    .forEach((conflict) => {
      const operation: RestorePlanOperation = {
        type: 'block_conflict',
        walletId: `secret:${conflict.fingerprint}`,
        walletName: conflict.backupWalletNames.join(', ') || conflict.currentWalletNames.join(', ') || conflict.fingerprint,
        severity: 'critical',
        reason: `Duplicate ${conflict.kind} fingerprint detected in backup.`,
        reasonKey: 'restorePlan.block_secret_conflict',
      };
      operations.push(operation);
      blockingOperations.push(operation);
    });

  backupWallets.forEach((backupWallet) => {
    const currentWallet = currentByAddress.get(normalizeAddress(backupWallet.address));
    if (!currentWallet) return;
    if ((currentWallet.privateKey || currentWallet.seedPhrase) || (!backupWallet.privateKey && !backupWallet.seedPhrase)) return;
    operations.push({
      type: 'update_missing_sensitive',
      walletId: backupWallet._id || backupWallet.address || walletName(backupWallet),
      walletName: walletName(backupWallet),
      address: backupWallet.address,
      severity: 'warning',
      reason: 'Current wallet is missing sensitive material that exists in backup.',
      reasonKey: 'restorePlan.update_missing_sensitive',
    });
  });

  const totals = {
    willAdd: operations.filter(operation => operation.type === 'add_wallet').length,
    willSkip: operations.filter(operation => operation.type === 'skip_duplicate').length,
    willUpdate: operations.filter(operation => operation.type === 'update_changed_wallet').length,
    willUpdateSensitive: operations.filter(operation => operation.type === 'update_missing_sensitive').length,
    willDeleteIfReplace: operations.filter(operation => operation.type === 'delete_if_replace').length,
    blockedConflicts: blockingOperations.length,
  };

  return {
    operations,
    blockingOperations,
    totals,
    safeToMerge: blockingOperations.length === 0,
    safeToReplace: blockingOperations.length === 0 && totals.willDeleteIfReplace === 0,
  };
};

export function runRestoreSandbox(input: RestoreSandboxInput): RestoreSandboxResult {
  const diff = analyzeBackupVaultDiff(input.currentWallets, input.backupWallets);
  const health = calculateBackupHealthScore({
    inspection: input.inspection,
    backupWalletCount: input.backupWallets.length,
    decryptSucceeded: true,
    diff,
    now: input.now,
    vaultChangedAt: input.vaultChangedAt,
  });

  const warnings: RestoreSandboxWarning[] = [];

  if (input.inspection?.legacy) {
    warnings.push({
      severity: 'warning',
      code: 'legacy_backup',
      message: 'Legacy backup format has limited metadata and integrity preview.',
      messageKey: 'restoreSandbox.legacy_backup',
    });
  }

  if (input.inspection?.status === 'tampered' || input.inspection?.integrity === 'modified') {
    warnings.push({
      severity: 'critical',
      code: 'backup_tampered',
      message: 'Backup checksum does not match; do not restore unless this is the only recovery copy.',
      messageKey: 'restoreSandbox.backup_tampered',
    });
  }

  if (input.inspection?.integrity === 'repaired') {
    warnings.push({
      severity: 'warning',
      code: 'backup_repaired',
      message: 'Backup payload was repaired from recovery shards. Create a fresh backup after restore.',
      messageKey: 'restoreSandbox.backup_repaired',
    });
  }

  if (health.warnings.some(warning => warning.toLowerCase().includes('older'))) {
    warnings.push({
      severity: 'warning',
      code: 'backup_stale',
      message: 'Backup may be older than the current vault state.',
      messageKey: 'restoreSandbox.backup_stale',
    });
  }

  if (diff.summary.missingFromBackup > 0) {
    warnings.push({
      severity: 'warning',
      code: 'replace_would_delete_wallets',
      message: `${diff.summary.missingFromBackup} current wallet(s) are missing from this backup and would be removed by replace mode.`,
      messageKey: 'restoreSandbox.replace_would_delete_wallets',
      params: { count: diff.summary.missingFromBackup },
    });
  }

  if (diff.summary.criticalConflicts > 0) {
    warnings.push({
      severity: 'critical',
      code: 'critical_conflicts',
      message: `${diff.summary.criticalConflicts} critical wallet/secret conflict(s) were detected.`,
      messageKey: 'restoreSandbox.critical_conflicts',
      params: { count: diff.summary.criticalConflicts },
    });
  }

  if (diff.summary.duplicateSecrets > 0) {
    warnings.push({
      severity: 'warning',
      code: 'duplicate_secrets',
      message: `${diff.summary.duplicateSecrets} duplicate or reused secret fingerprint(s) were detected.`,
      messageKey: 'restoreSandbox.duplicate_secrets',
      params: { count: diff.summary.duplicateSecrets },
    });
  }

  const missingSensitive = countMissingSensitive(input.backupWallets);
  if (missingSensitive > 0) {
    warnings.push({
      severity: 'info',
      code: 'missing_sensitive',
      message: `${missingSensitive} backup wallet(s) do not include private key or seed phrase.`,
      messageKey: 'restoreSandbox.missing_sensitive',
      params: { count: missingSensitive },
    });
  }

  const restorePlan = buildRestorePlan(input.currentWallets, input.backupWallets, diff);
  const hasCritical = warnings.some(warning => warning.severity === 'critical') || restorePlan.blockingOperations.length > 0;
  const recommendedMode: RestoreSandboxResult['recommendedMode'] = hasCritical
    ? 'cancel'
    : diff.summary.missingFromBackup > 0
      ? 'merge'
      : diff.summary.newInBackup === 0 && diff.summary.changed > 0
        ? 'replace'
        : 'merge';

  return {
    health,
    diff,
    warnings,
    restorePlan,
    recommendedMode,
    canRestore: health.canRestore && !hasCritical,
    backupWalletCount: input.backupWallets.length,
  };
}