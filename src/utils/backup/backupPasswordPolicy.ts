export const BACKUP_EXPORT_PASSWORD_MIN_LENGTH = 6;
export const BACKUP_PASSWORD_MIN_LENGTH = 12;

export const isBackupExportPasswordLongEnough = (password: string): boolean => (
  password.length >= BACKUP_EXPORT_PASSWORD_MIN_LENGTH
);

export type BackupPasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'veryWeak' | 'weak' | 'fair' | 'strong' | 'veryStrong';
  acceptable: boolean;
};

export const evaluateBackupPassword = (password: string): BackupPasswordStrength => {
  let score = 0;
  if (password.length >= BACKUP_PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 16) score += 1;

  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (classes >= 3) score += 1;
  if (classes === 4 || password.length >= 20) score += 1;

  const normalizedScore = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels: BackupPasswordStrength['label'][] = [
    'veryWeak',
    'weak',
    'fair',
    'strong',
    'veryStrong',
  ];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    acceptable: password.length >= BACKUP_PASSWORD_MIN_LENGTH && normalizedScore >= 2,
  };
};

export const isBackupPasswordAcceptable = (password: string): boolean => (
  evaluateBackupPassword(password).acceptable
);