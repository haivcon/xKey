import assert from 'node:assert/strict';

const {
  buildCsvImportPreview,
  buildCsvImportReport,
  buildWalletCsv,
  guessCsvImportMapping,
  parseCsvWallets,
  sanitizeCsvCell,
} = await import('../src/features/import/fileImportParsers.ts');

assert.equal(sanitizeCsvCell('=IMPORTXML("https://evil.test")'), '\'=IMPORTXML("https://evil.test")');
assert.equal(sanitizeCsvCell('+SUM(1,2)'), "'+SUM(1,2)");
assert.equal(sanitizeCsvCell('@cmd'), "'@cmd");
assert.equal(sanitizeCsvCell('normal value'), 'normal value');

const wallets = [
  {
    name: 'Main, wallet',
    address: '0xABC',
    balance: '1.23',
    groupId: 'Cold Storage',
    network: 'ETH',
    privateKey: '=PRIVATE_KEY_SHOULD_NOT_EXECUTE',
    seedPhrase: 'word1 word2 "quoted"',
  },
  {
    name: 'Second\nWallet',
    address: '0xDEF',
    balance: '',
    groupId: '',
    network: 'SOL',
    privateKey: '',
    seedPhrase: '',
  },
];

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'address', label: 'Address' },
  { key: 'balance', label: 'Balance' },
  { key: 'groupId', label: 'Folder' },
  { key: 'network', label: 'Network' },
  { key: 'privateKey', label: 'Private Key' },
  { key: 'seedPhrase', label: 'Seed Phrase' },
];

const csv = buildWalletCsv(wallets, columns);

assert.match(csv, /"Name","Address","Balance","Folder","Network","Private Key","Seed Phrase"/);
assert.match(csv, /"Main, wallet"/);
assert.match(csv, /"'=PRIVATE_KEY_SHOULD_NOT_EXECUTE"/);
assert.doesNotMatch(csv, /Second\nWallet/);

const parsed = await parseCsvWallets(csv, 'Imported CSV');
assert.equal(parsed.length, 2);
assert.equal(parsed[0].name, 'Main, wallet');
assert.equal(parsed[0].address, '0xABC');
assert.equal(parsed[0].balance, '1.23');
assert.equal(parsed[0].groupId, 'Cold Storage');
assert.equal(parsed[0].network, 'ETH');
assert.equal(parsed[0].privateKey, "'=PRIVATE_KEY_SHOULD_NOT_EXECUTE");
assert.equal(parsed[0].seedPhrase, 'word1 word2 "quoted"');
assert.equal(parsed[1].name, 'Second Wallet');
assert.equal(parsed[1].groupId, 'Imported CSV');
assert.equal(parsed[1].network, 'SOL');

const localizedCsv = '\uFEFFTên ví,Địa chỉ,Số dư,Thư mục,Mạng,Khóa riêng,Cụm từ seed\nVí 1,0x123,0.5,Nhóm,BSC,pk,seed words';
const localizedParsed = await parseCsvWallets(localizedCsv, 'Fallback');
assert.equal(localizedParsed[0].name, 'Ví 1');
assert.equal(localizedParsed[0].address, '0x123');
assert.equal(localizedParsed[0].balance, '0.5');
assert.equal(localizedParsed[0].groupId, 'Nhóm');
assert.equal(localizedParsed[0].network, 'BSC');
assert.equal(localizedParsed[0].privateKey, 'pk');
assert.equal(localizedParsed[0].seedPhrase, 'seed words');

const guessedMapping = guessCsvImportMapping(['Tên ví', 'Địa chỉ', 'Số dư', 'Thư mục', 'Mạng', 'Khóa riêng', 'Cụm từ seed']);
assert.deepEqual(guessedMapping, {
  name: 'Tên ví',
  address: 'Địa chỉ',
  privateKey: 'Khóa riêng',
  seedPhrase: 'Cụm từ seed',
  balance: 'Số dư',
  network: 'Mạng',
  groupId: 'Thư mục',
});

const previewCsv = [
  'Name,Address,Network,Private Key,Seed Phrase',
  'Existing,0x0000000000000000000000000000000000000001,ETH,,',
  'Bad EVM,0xBAD,ETH,,',
  'Sensitive,0x0000000000000000000000000000000000000002,ETH,pk,seed words',
  'Missing,,ETH,,',
].join('\n');

const preview = await buildCsvImportPreview(
  previewCsv,
  'wallets.csv',
  'CSV Folder',
  [{ address: '0x0000000000000000000000000000000000000001' }],
);

assert.equal(preview.rowCount, 4);
assert.equal(preview.parsedWallets.length, 4);
assert.equal(preview.uniqueWallets.length, 3);
assert.equal(preview.skippedDuplicates, 1);
assert.equal(preview.missingAddress, 1);
assert.equal(preview.invalidAddress, 1);
assert.equal(preview.sensitiveCount, 1);
assert.equal(preview.includesSensitive, true);
assert.ok(preview.issues.some(issue => issue.row === 2 && issue.field === 'duplicate'));
assert.ok(preview.issues.some(issue => issue.row === 3 && issue.message === 'Address does not match EVM format'));
assert.ok(preview.issues.some(issue => issue.row === 5 && issue.message === 'Missing address'));

const report = buildCsvImportReport(preview, preview.uniqueWallets.length);
assert.match(report, /xKey CSV Import Report/);
assert.match(report, /File: wallets\.csv/);
assert.match(report, /Imported wallets: 3/);
assert.match(report, /Sensitive rows: 1/);
assert.match(report, /- address: Address/);

console.log('CSV import/export tests passed');
