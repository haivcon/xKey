import type { RestoreSandboxResult } from './restoreSandbox';

export type BackupRestoreReportInput = {
  mode: 'merge' | 'replace';
  backupId?: string;
  fileHash?: string;
  integrity?: string;
  importedWallets?: number;
  skippedDuplicates?: number;
  sensitiveFieldsFilled?: number;
  sandbox?: RestoreSandboxResult | null;
  createdAt?: Date;
};

export function buildBackupRestoreReport(input: BackupRestoreReportInput): string {
  const sandbox = input.sandbox;
  const lines = [
    'xKey backup restore report',
    `Time: ${(input.createdAt || new Date()).toISOString()}`,
    `Mode: ${input.mode}`,
    `Backup ID: ${input.backupId || ''}`,
    `File hash: ${input.fileHash || ''}`,
    `Integrity: ${input.integrity || 'unknown'}`,
    `Imported wallets: ${input.importedWallets ?? 0}`,
    `Skipped duplicates: ${input.skippedDuplicates ?? 0}`,
    `Sensitive fields filled: ${input.sensitiveFieldsFilled ?? 0}`,
  ];

  if (sandbox) {
    lines.push(
      '',
      '[Health]',
      `Score: ${sandbox.health.score}`,
      `Grade: ${sandbox.health.grade}`,
      `Recommendation: ${sandbox.health.recommendation}`,
      `Can restore: ${sandbox.canRestore ? 'yes' : 'no'}`,
      `Recommended mode: ${sandbox.recommendedMode}`,
      '',
      '[Diff summary]',
      `Current wallets: ${sandbox.diff.summary.currentWallets}`,
      `Backup wallets: ${sandbox.diff.summary.backupWallets}`,
      `New in backup: ${sandbox.diff.summary.newInBackup}`,
      `Missing from backup: ${sandbox.diff.summary.missingFromBackup}`,
      `Unchanged: ${sandbox.diff.summary.unchanged}`,
      `Changed: ${sandbox.diff.summary.changed}`,
      `Tag changed: ${sandbox.diff.summary.tagChanged}`,
      `Folder changed: ${sandbox.diff.summary.folderChanged}`,
      `Duplicate secrets: ${sandbox.diff.summary.duplicateSecrets}`,
      `Address duplicates: ${sandbox.diff.summary.addressDuplicates}`,
      `Critical conflicts: ${sandbox.diff.summary.criticalConflicts}`,
      '',
      '[Warnings]',
      ...(sandbox.warnings.length > 0
        ? sandbox.warnings.map(warning => `${warning.severity.toUpperCase()} ${warning.code} ${JSON.stringify(warning.params || {})}`)
        : ['none']),
      '',
      '[Dry-run restore plan]',
      `Will add: ${sandbox.restorePlan.totals.willAdd}`,
      `Will skip: ${sandbox.restorePlan.totals.willSkip}`,
      `Will update: ${sandbox.restorePlan.totals.willUpdate}`,
      `Will update sensitive: ${sandbox.restorePlan.totals.willUpdateSensitive}`,
      `Will delete if replace: ${sandbox.restorePlan.totals.willDeleteIfReplace}`,
      `Blocked conflicts: ${sandbox.restorePlan.totals.blockedConflicts}`,
      `Safe to merge: ${sandbox.restorePlan.safeToMerge ? 'yes' : 'no'}`,
      `Safe to replace: ${sandbox.restorePlan.safeToReplace ? 'yes' : 'no'}`,
      ...(sandbox.restorePlan.operations.length > 0
        ? sandbox.restorePlan.operations.slice(0, 100).map(operation => (
          `${operation.severity.toUpperCase()} ${operation.type} ${operation.walletName} ${operation.address || ''} ${operation.reason}`
        ))
        : ['none']),
      '',
      '[Offline diff details]',
      ...(sandbox.diff.items.filter(item => item.status !== 'unchanged').length > 0
        ? sandbox.diff.items
          .filter(item => item.status !== 'unchanged')
          .slice(0, 50)
          .map((item) => {
            const label = item.name || item.address || item.id;
            const changes = item.changes.length > 0
              ? item.changes.map(change => `${change.field}:${change.currentLabel}->${change.backupLabel}(${change.severity})`).join('; ')
              : 'no field changes';
            return `${item.status.toUpperCase()} ${label} ${changes}`;
          })
        : ['none']),
      '',
      '[Secret conflicts]',
      ...(sandbox.diff.secretConflicts.length > 0
        ? sandbox.diff.secretConflicts.slice(0, 50).map(conflict => (
          `${conflict.severity.toUpperCase()} ${conflict.kind} ${conflict.fingerprint} current=${conflict.currentWalletNames.join('|') || '-'} backup=${conflict.backupWalletNames.join('|') || '-'}`
        ))
        : ['none']),
    );
  }

  return lines.join('\n');
}