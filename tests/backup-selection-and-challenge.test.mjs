import assert from 'node:assert/strict';

const {
  createAllBackupWalletSelection,
  filterBackupWalletsBySelection,
  buildBackupImportSelectionSummary,
  getBackupSelectionIdsByFolder,
  getBackupSelectionIdsByTag,
} = await import('../src/features/backup/backupImportSelection.ts');

const {
  createPasswordChallengeChoices,
  validatePasswordChallengeSequence,
  getPasswordChallengeProgress,
} = await import('../src/features/backup/passwordChallenge.ts');

const wallets = [
  {
    _id: 'wallet-1',
    name: 'Main ETH',
    address: '0xABC',
    privateKey: 'pk1',
    network: 'ETH',
    groupId: 'Long term',
    tags: ['cold', 'eth'],
  },
  {
    _id: 'wallet-2',
    name: 'Trading SOL',
    address: 'SoL111',
    privateKey: 'pk2',
    network: 'SOL',
    groupId: 'Trading',
    tags: ['hot', 'sol'],
  },
  {
    _id: 'wallet-3',
    name: 'Second ETH',
    address: '0xDEF',
    privateKey: 'pk3',
    network: 'ETH',
    groupId: 'Long term',
    tags: ['cold'],
  },
];

const allIds = createAllBackupWalletSelection(wallets);
assert.deepEqual(allIds, ['address:0xabc', 'address:sol111', 'address:0xdef']);

const longTermIds = getBackupSelectionIdsByFolder(wallets, 'Long term');
assert.deepEqual(longTermIds, ['address:0xabc', 'address:0xdef']);

const coldIds = getBackupSelectionIdsByTag(wallets, 'COLD');
assert.deepEqual(coldIds, ['address:0xabc', 'address:0xdef']);

const selectedWallets = filterBackupWalletsBySelection(wallets, coldIds);
assert.deepEqual(selectedWallets.map(wallet => wallet.name), ['Main ETH', 'Second ETH']);

const summary = buildBackupImportSelectionSummary(wallets, coldIds);
assert.equal(summary.totalWallets, 3);
assert.equal(summary.selectedWallets, 2);
assert.deepEqual(summary.folders, [
  { name: 'Long term', count: 2, selectedCount: 2 },
  { name: 'Trading', count: 1, selectedCount: 0 },
]);
assert.deepEqual(summary.tags, [
  { name: 'cold', count: 2, selectedCount: 2 },
  { name: 'eth', count: 1, selectedCount: 1 },
  { name: 'hot', count: 1, selectedCount: 0 },
  { name: 'sol', count: 1, selectedCount: 0 },
]);

const password = 'xKey-42!';
const choices = createPasswordChallengeChoices(password, 10);
assert.equal(choices.length, Array.from(password).length + 10);
assert.equal(choices.filter(choice => choice.source === 'password').length, Array.from(password).length);
assert.equal(choices.filter(choice => choice.source === 'noise').length, 10);

assert.equal(validatePasswordChallengeSequence(password, Array.from(password)), true);
assert.equal(validatePasswordChallengeSequence(password, ['x', 'K', 'e', 'y']), false);

assert.deepEqual(getPasswordChallengeProgress(password, ['x', 'K']), {
  isComplete: false,
  isPrefixValid: true,
  isValid: false,
});
assert.deepEqual(getPasswordChallengeProgress(password, ['x', 'X']), {
  isComplete: false,
  isPrefixValid: false,
  isValid: false,
});
assert.deepEqual(getPasswordChallengeProgress(password, Array.from(password)), {
  isComplete: true,
  isPrefixValid: true,
  isValid: true,
});