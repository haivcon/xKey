import type { BackupVaultDiff } from './backupVaultDiff';

export type BackupHealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type BackupHealthFactor = {
  key: 'freshness' | 'crypto' | 'integrity' | 'metadata' | 'restoreReadiness' | 'vaultDiffRisk';
  score: number;
  max: number;
  label: string;
  warnings: string[];
};

export type BackupHealthReport = {
  score: number;
  grade: BackupHealthGrade;
  factors: BackupHealthFactor[];
  warnings: string[];
  canRestore: boolean;
  recommendation: 'safe_to_restore' | 'review_before_restore' | 'create_new_backup' | 'do_not_restore';
};

export type BackupHealthInspection = {
  legacy?: boolean;
  status?: string;
  integrity?: string;
  format?: string;
  footerRecovered?: boolean;
  metadata?: {
    createdAt?: string;
    backupId?: string;
    containerHash?: string;
    appVersion?: string;
    platform?: string;
    source?: string;
    scope?: string;
    walletCount?: number;
    portable?: boolean;
    [key: string]: unknown;
  };
};

export type BackupHealthInput = {
  inspection?: BackupHealthInspection | null;
  backupWalletCount?: number;
  decryptSucceeded?: boolean;
  diff?: BackupVaultDiff | null;
  now?: Date;
  vaultChangedAt?: string | number | null;
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const gradeFromScore = (score: number): BackupHealthGrade => {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

const parseDate = (value?: string | number | null): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const daysBetween = (fromMs: number, toMs: number): number => Math.max(0, (toMs - fromMs) / 86400000);

const buildFreshnessFactor = (input: BackupHealthInput): BackupHealthFactor => {
  const max = 20;
  const warnings: string[] = [];
  const createdAt = parseDate(input.inspection?.metadata?.createdAt);
  const nowMs = (input.now || new Date()).getTime();

  if (!createdAt) {
    return { key: 'freshness', score: 4, max, label: 'Backup age', warnings: ['Backup creation time is missing.'] };
  }

  const ageDays = daysBetween(createdAt, nowMs);
  let score = max;
  if (ageDays > 180) score = 5;
  else if (ageDays > 90) score = 9;
  else if (ageDays > 30) score = 13;
  else if (ageDays > 7) score = 17;

  if (ageDays > 30) warnings.push('Backup is older than 30 days.');
  if (ageDays > 90) warnings.push('Backup is stale; create a fresh backup if possible.');

  const vaultChangedAt = parseDate(input.vaultChangedAt);
  if (vaultChangedAt && createdAt < vaultChangedAt) {
    score = Math.min(score, 12);
    warnings.push('Backup is older than the latest known vault change.');
  }

  return { key: 'freshness', score, max, label: 'Backup age', warnings };
};

const buildCryptoFactor = (inspection?: BackupHealthInspection | null): BackupHealthFactor => {
  const max = 25;
  const warnings: string[] = [];

  if (!inspection) {
    return { key: 'crypto', score: 0, max, label: 'Encryption profile', warnings: ['Backup has not been inspected.'] };
  }

  if (inspection.legacy) {
    return { key: 'crypto', score: 8, max, label: 'Encryption profile', warnings: ['Legacy backup format cannot expose modern crypto metadata before decrypt.'] };
  }

  let score = 22;
  if (inspection.format === 'xkey-backup-v4') score = 25;
  if (!inspection.metadata?.portable) {
    score -= 4;
    warnings.push('Backup is not marked as portable v4 backup.');
  }

  return { key: 'crypto', score: clamp(score, 0, max), max, label: 'Encryption profile', warnings };
};

const buildIntegrityFactor = (inspection?: BackupHealthInspection | null): BackupHealthFactor => {
  const max = 25;
  const warnings: string[] = [];

  if (!inspection) {
    return { key: 'integrity', score: 0, max, label: 'Checksum and recovery', warnings: ['Backup has not been inspected.'] };
  }

  if (inspection.status === 'tampered' || inspection.integrity === 'modified') {
    return { key: 'integrity', score: 0, max, label: 'Checksum and recovery', warnings: ['Backup checksum does not match; file may be corrupted or modified.'] };
  }

  if (inspection.integrity === 'repaired') {
    warnings.push('Backup payload was repaired from recovery shards.');
    return { key: 'integrity', score: 20, max, label: 'Checksum and recovery', warnings };
  }

  if (inspection.integrity === 'verified') {
    let score = max;
    if (inspection.footerRecovered) {
      score -= 3;
      warnings.push('Backup recovery footer was reconstructed.');
    }
    return { key: 'integrity', score, max, label: 'Checksum and recovery', warnings };
  }

  return { key: 'integrity', score: 10, max, label: 'Checksum and recovery', warnings: ['Backup integrity is unknown.'] };
};

const buildMetadataFactor = (inspection?: BackupHealthInspection | null): BackupHealthFactor => {
  const max = 15;
  const warnings: string[] = [];
  const metadata = inspection?.metadata;
  if (!metadata) {
    return { key: 'metadata', score: 3, max, label: 'Backup metadata', warnings: ['Backup metadata preview is unavailable.'] };
  }

  const checks = [
    metadata.backupId,
    metadata.containerHash,
    metadata.createdAt,
    metadata.appVersion,
    metadata.platform,
    metadata.source,
    metadata.scope,
    typeof metadata.walletCount === 'number',
  ];

  const present = checks.filter(Boolean).length;
  const score = Math.round((present / checks.length) * max);
  if (score < max) warnings.push('Some backup metadata fields are missing.');

  return { key: 'metadata', score, max, label: 'Backup metadata', warnings };
};

const buildRestoreReadinessFactor = (input: BackupHealthInput): BackupHealthFactor => {
  const max = 10;
  const warnings: string[] = [];
  let score = 0;

  if (input.decryptSucceeded) score += 5;
  else warnings.push('Backup has not been decrypted in sandbox yet.');

  if (typeof input.backupWalletCount === 'number' && input.backupWalletCount >= 0) score += 5;
  else warnings.push('Backup wallet payload has not been validated.');

  return { key: 'restoreReadiness', score: clamp(score, 0, max), max, label: 'Restore simulation', warnings };
};

const buildVaultDiffRiskFactor = (diff?: BackupVaultDiff | null): BackupHealthFactor => {
  const max = 10;
  const warnings: string[] = [];

  if (!diff) {
    return {
      key: 'vaultDiffRisk',
      score: 0,
      max,
      label: 'Vault diff risk',
      warnings: ['Backup has not been compared with the current vault.'],
    };
  }

  let score = max;

  if (diff.summary.criticalConflicts > 0) {
    score -= 6;
    warnings.push('Critical wallet or secret conflicts were detected.');
  }

  if (diff.summary.duplicateSecrets > 0) {
    score -= 2;
    warnings.push('Duplicate or reused secret fingerprints were detected.');
  }

  if (diff.summary.missingFromBackup > 0) {
    score -= Math.min(4, diff.summary.missingFromBackup);
    warnings.push('Replace mode would remove wallet(s) that are not present in the backup.');
  }

  if (diff.summary.changed > 0 || diff.summary.tagChanged > 0 || diff.summary.folderChanged > 0) {
    score -= 1;
    warnings.push('Backup metadata differs from the current vault and should be reviewed.');
  }

  return { key: 'vaultDiffRisk', score: clamp(score, 0, max), max, label: 'Vault diff risk', warnings };
};

export function calculateBackupHealthScore(input: BackupHealthInput): BackupHealthReport {
  const factors = [
    buildFreshnessFactor(input),
    buildCryptoFactor(input.inspection),
    buildIntegrityFactor(input.inspection),
    buildMetadataFactor(input.inspection),
    buildRestoreReadinessFactor(input),
    buildVaultDiffRiskFactor(input.diff),
  ];

  const score = clamp(Math.round(factors.reduce((total, factor) => total + factor.score, 0)));
  const grade = gradeFromScore(score);
  const warnings = factors.flatMap(factor => factor.warnings);
  const tampered = input.inspection?.status === 'tampered' || input.inspection?.integrity === 'modified';
  const criticalConflicts = input.diff?.summary.criticalConflicts || 0;

  const recommendation: BackupHealthReport['recommendation'] = tampered
    ? 'do_not_restore'
    : score < 40
      ? 'do_not_restore'
      : score < 60
        ? 'create_new_backup'
        : criticalConflicts > 0
          ? 'review_before_restore'
          : score < 75
            ? 'review_before_restore'
            : 'safe_to_restore';

  return {
    score,
    grade,
    factors,
    warnings,
    canRestore: !tampered && input.decryptSucceeded !== false,
    recommendation,
  };
}