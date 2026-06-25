import assert from 'node:assert/strict';

const {
  analyzeBackupImport,
  fingerprintBackupWallet,
} = await import('../src/features/import/backupImportAnalysis.ts');

const existingWallets = [
  {
    name: 'Main',
    address: '0xABC',
    privateKey: '',
    seedPhrase: '',
    balance: '1',
    network: 'ETH',
    notes: 'old',
    groupId: 'Imported',
    tags: ['cold', 'main'],
  },
  {
    name: 'Unchanged',
    address: '0xDEF',
    privateKey: 'pk',
    seedPhrase: '',
    network: 'ETH',
  },
];

const backupWallets = [
  {
    name: 'Main',
    address: '0xabc',
    privateKey: 'filled',
    seedPhrase: '',
    balance: '1',
    network: 'ETH',
    notes: 'old',
    groupId: 'Imported',
    tags: ['main', 'cold'],
  },
  {
    name: 'Unchanged',
    address: '0xdef',
    privateKey: 'pk',
    seedPhrase: '',
    network: 'ETH',
  },
  {
    name: 'New address only',
    address: '0x123',
    network: 'ETH',
  },
  {
    name: 'New sensitive',
    address: '0x456',
    privateKey: 'pk2',
    network: 'ETH',
  },
];

assert.equal(
  fingerprintBackupWallet({ address: '0xABC', tags: ['b', 'a'] }),
  fingerprintBackupWallet({ address: '0xabc', tags: ['a', 'b'] }),
);

assert.deepEqual(analyzeBackupImport(existingWallets, backupWallets), {
  total: 4,
  newWallets: 2,
  duplicates: 2,
  changed: 1,
  missingSensitive: 1,
  sensitive: 3,
});

console.log('Backup import analysis tests passed');