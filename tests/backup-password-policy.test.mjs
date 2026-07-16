import assert from 'node:assert/strict';

const { isBackupExportPasswordLongEnough } = await import('../src/utils/backup/backupPasswordPolicy.ts');

const password = '123456';
const confirmation = '123456';

assert.equal(password, confirmation);
assert.equal(
  isBackupExportPasswordLongEnough(password),
  true,
  'a matching 6-character password must pass the export minimum-length validation',
);
