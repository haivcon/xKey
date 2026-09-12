import assert from 'node:assert/strict';
import {
  buildVanitySelectedWallets,
  getLowercaseWalletAddressSet,
  mergeVanityExtraWallets,
  rankVanityExtraWallets,
  revalidateVanityExtraWallets,
  syncVanityExtraSelection,
} from '../src/hooks/vanity/vanityWalletHelpers.ts';
import { getVanityExtraLabel } from '../src/hooks/vanity/vanityGenerationUtils.ts';

const wallet = (address, vanityScore = 0, extra = {}) => ({
  address,
  privateKey: `pk-${address}`,
  vanityScore,
  ...extra,
});

const ranked = rankVanityExtraWallets(
  [
    wallet('0xbbb', 20),
    wallet('0xaaa', 10),
    wallet('0xAAA', 99),
    wallet('', 100),
    wallet(undefined, 100),
    wallet('0xccc', 30),
  ],
  2
);
assert.deepEqual(
  ranked.map(item => item.address),
  ['0xAAA', '0xccc']
);

const selectedWallets = buildVanitySelectedWallets({
  wallets: [
    wallet('0xprimary', 0, { name: 'Primary' }),
    wallet('0xextra2', 20, { vanityMatchType: 'extra', name: 'Old Extra 2' }),
    wallet('0xextra1', 90, { vanityMatchType: 'extra', name: 'Old Extra 1' }),
    wallet('0xsaved', 100, { vanityMatchType: 'extra', name: 'Saved Extra' }),
  ],
  selectedAddresses: new Set(['0xprimary', '0xextra1', '0xextra2', '0xsaved']),
  savedAddresses: new Set(['0xsaved']),
  extraWalletName: 'Extra Wallet',
});
assert.deepEqual(
  selectedWallets.map(item => [item.address, item.name]),
  [
    ['0xprimary', 'Primary'],
    ['0xextra2', 'Extra Wallet 3'],
    ['0xextra1', 'Extra Wallet 2'],
  ]
);

const built = [];
const merged = mergeVanityExtraWallets({
  previousExtras: [
    wallet('0xkeep', 50, {
      name: 'Existing Keep',
      seedPhrase: 'existing-seed',
      mnemonic: '',
      privateKey: 'existing-pk',
    }),
    wallet('0xdrop', 10, { name: 'Existing Drop' }),
  ],
  incomingExtras: [
    wallet('0xnew', 90, { seedPhrase: '', mnemonic: 'new-mnemonic', privateKey: '' }),
    wallet('0xKEEP', 80, { seedPhrase: '', mnemonic: 'incoming-mnemonic', privateKey: '' }),
  ],
  limit: 2,
  buildWallet: (item, index) => {
    built.push([item.address, index]);
    return {
      ...item,
      name: `Built ${index + 1}`,
      privateKey: item.privateKey || `built-pk-${index}`,
      seedPhrase: item.seedPhrase || '',
      mnemonic: item.mnemonic || '',
    };
  },
  extraWalletName: 'Extra Wallet',
});
assert.deepEqual(
  merged.map(item => [item.address, item.name, item.privateKey, item.seedPhrase, item.mnemonic]),
  [
    ['0xnew', 'Extra Wallet 1', 'built-pk-0', 'new-mnemonic', 'new-mnemonic'],
    ['0xKEEP', 'Extra Wallet 2', 'existing-pk', 'incoming-mnemonic', 'incoming-mnemonic'],
  ]
);
assert.deepEqual(built, [['0xnew', 0]]);

const revalidated = revalidateVanityExtraWallets([
  wallet('0xabcdefabcdefab1234567890123456789012345678', 999, {
    vanityPatternType: 'repeat',
    vanityRepeatSide: 'head',
    vanityHeadRun: 'ffff',
  }),
  wallet('0x12abce81234567890abcdef1234567890abcdee', 999, {
    vanityPatternType: 'repeat',
  }),
], {
  repeat: { enabled: false },
  sequenceUp: { enabled: false },
  sequenceDown: { enabled: false },
  mirror: { enabled: false },
  bothEnds: { enabled: false },
  palindrome: { enabled: false },
  bracket: { enabled: false },
  lucky: { enabled: false },
  alternating: { enabled: false },
  numericTail: { enabled: true, minRun: 4 },
  lowDiversity: { enabled: false },
});
assert.equal(revalidated.length, 1);
assert.equal(revalidated[0].vanityPatternType, 'numeric-tail');
assert.equal(revalidated[0].vanityTailRun, '1234567890123456789012345678');
assert.equal(revalidated[0].vanityScore, 47);
assert.equal(revalidated[0].vanityHeadRun, undefined);

const translate = (key, vars = {}) => `${key}:${vars.pattern || ''}`;
const labelCases = [
  ['sequence-up', { vanityHeadRun: '1234' }, 'vanityExtraSequenceUp:1234'],
  ['sequence-down', { vanityTailRun: 'fedc' }, 'vanityExtraSequenceDown:fedc'],
  ['mirror', { vanityHeadRun: 'abc' }, 'vanityExtraMirror:abc'],
  ['palindrome', { vanityHeadRun: 'abccba' }, 'vanityExtraPalindrome:abccba'],
  ['bracket', { vanityHeadRun: 'abc' }, 'vanityExtraBracket:abc'],
  ['lucky', { vanityRepeatChar: '168', vanityMatchStart: 6, vanityRepeatLength: 3 }, 'vanityExtraLucky:168'],
  ['alternating', { vanityTailRun: 'ababab' }, 'vanityExtraAlternating:ababab'],
  ['numeric-tail', { vanityTailRun: '2024' }, 'vanityExtraNumericTail:2024'],
  ['low-diversity', { vanityHeadRun: 'aa11aa' }, 'vanityExtraLowDiversity:aa11aa'],
];
labelCases.forEach(([vanityPatternType, metadata, expected]) => {
  assert.equal(getVanityExtraLabel({
    address: '0xabcdef168abcdef',
    vanityPatternType,
    ...metadata,
  }, translate), `createWallet.${expected}`);
});

const addressSet = getLowercaseWalletAddressSet([
  wallet('0xABC'),
  wallet('0xdef'),
  wallet(undefined),
]);
assert.deepEqual([...addressSet].sort(), ['0xabc', '0xdef']);

const selectedAddresses = new Set(['0xold', '0xkeep']);
syncVanityExtraSelection({
  previousExtras: [wallet('0xold'), wallet('0xkeep')],
  nextExtras: [wallet('0xkeep'), wallet('0xnew')],
  selectedAddresses,
});
assert.deepEqual([...selectedAddresses].sort(), ['0xkeep', '0xnew']);

const mixedCaseSelectedAddresses = new Set(['0xabc']);
syncVanityExtraSelection({
  previousExtras: [wallet('0xABC')],
  nextExtras: [],
  selectedAddresses: mixedCaseSelectedAddresses,
});
assert.deepEqual(
  [...mixedCaseSelectedAddresses],
  [],
  'selection sync should remove normalized keys regardless of wallet address casing'
);

const caseInsensitiveSelectedWallets = buildVanitySelectedWallets({
  wallets: [wallet('0xAbC', 50, { name: 'Checksum Wallet' })],
  selectedAddresses: new Set(['0xabc']),
  savedAddresses: new Set(),
  extraWalletName: 'Extra Wallet',
});
assert.equal(caseInsensitiveSelectedWallets.length, 1);

console.log('Vanity wallet helper tests passed');