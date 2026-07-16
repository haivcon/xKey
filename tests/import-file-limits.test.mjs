import assert from 'node:assert/strict';
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_FIELD_LENGTHS,
  MAX_IMPORT_HEADERS,
  MAX_IMPORT_TAGS_PER_WALLET,
  MAX_IMPORT_WALLETS,
  assertImportHeadersWithinLimits,
  assertImportWalletsWithinLimits,
  estimateBase64DecodedBytes,
  isImportFileWithinLimit,
} from '../src/utils/importFileLimits.ts';

assert.equal(estimateBase64DecodedBytes(''), 0);
assert.equal(estimateBase64DecodedBytes('YQ=='), 1);
assert.equal(estimateBase64DecodedBytes('YWI='), 2);
assert.equal(estimateBase64DecodedBytes('YWJj'), 3);
assert.equal(estimateBase64DecodedBytes('data:text/plain;base64,YWJj'), 3);

assert.equal(isImportFileWithinLimit(MAX_IMPORT_FILE_BYTES), true);
assert.equal(isImportFileWithinLimit(MAX_IMPORT_FILE_BYTES + 1), false);
assert.equal(isImportFileWithinLimit(undefined, 'YWJj', 3), true);
assert.equal(isImportFileWithinLimit(undefined, 'YWJjZA==', 3), false);
assert.equal(isImportFileWithinLimit(1, 'YWJjZA==', 3), false);

assert.doesNotThrow(() => assertImportWalletsWithinLimits([
  {
    name: 'A'.repeat(MAX_IMPORT_FIELD_LENGTHS.name),
    address: '0'.repeat(MAX_IMPORT_FIELD_LENGTHS.address),
    notes: 'N'.repeat(MAX_IMPORT_FIELD_LENGTHS.notes),
    tags: Array.from(
      { length: MAX_IMPORT_TAGS_PER_WALLET },
      () => 'T'.repeat(MAX_IMPORT_FIELD_LENGTHS.tag),
    ),
  },
]));

assert.throws(
  () => assertImportWalletsWithinLimits(
    Array.from({ length: MAX_IMPORT_WALLETS + 1 }, () => ({})),
  ),
  /wallet limit/,
);
assert.throws(
  () => assertImportWalletsWithinLimits([
    { address: '0'.repeat(MAX_IMPORT_FIELD_LENGTHS.address + 1) },
  ]),
  /address exceeds/,
);
assert.throws(
  () => assertImportWalletsWithinLimits([
    { notes: 'N'.repeat(MAX_IMPORT_FIELD_LENGTHS.notes + 1) },
  ]),
  /notes exceeds/,
);
assert.throws(
  () => assertImportWalletsWithinLimits([
    { tags: Array.from({ length: MAX_IMPORT_TAGS_PER_WALLET + 1 }, () => 'tag') },
  ]),
  /Invalid tags/,
);
assert.throws(
  () => assertImportWalletsWithinLimits([
    { tags: ['T'.repeat(MAX_IMPORT_FIELD_LENGTHS.tag + 1)] },
  ]),
  /tag exceeds/,
);
assert.throws(
  () => assertImportWalletsWithinLimits([null]),
  /Invalid wallet/,
);

assert.doesNotThrow(() => assertImportHeadersWithinLimits(
  Array.from({ length: MAX_IMPORT_HEADERS }, (_, index) => `column-${index}`),
));
assert.throws(
  () => assertImportHeadersWithinLimits(
    Array.from({ length: MAX_IMPORT_HEADERS + 1 }, (_, index) => `column-${index}`),
  ),
  /column limit/,
);
assert.throws(
  () => assertImportHeadersWithinLimits([
    'H'.repeat(MAX_IMPORT_FIELD_LENGTHS.name + 1),
  ]),
  /column name exceeds/,
);

console.log('Import file and schema limit tests passed');