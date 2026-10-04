import en from '../src/locales/en.ts';
import vi from '../src/locales/vi.ts';
const translate = locale => (key, vars = {}) => {
 const value = key.split('.').reduce((obj, part) => obj?.[part], locale);
 assert.equal(typeof value, 'string', key);
 return value.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
};
const t = translate(en);
import assert from 'node:assert/strict';
import {
  getVanityPatternLabel,
  getVanityScoreGradeLabel,
  getVanityScoreReason,
  inferVanityScoreMetadata,
  shouldShowVanityScore,
  VANITY_SCORE_DISPLAY_THRESHOLD,
} from '../src/utils/vanity/vanityScoreGrade.ts';

assert.equal(VANITY_SCORE_DISPLAY_THRESHOLD, 30);

const uglyWallet = { address: '0x12abce81234567890abcdef1234567890abcdee' };
assert.equal(inferVanityScoreMetadata(uglyWallet), null, 'ugly wallet should not receive vanity metadata');

const headWallet = { address: '0xabcde1234567890abcdef1234567890abcdefaaaa' };
const headMetadata = inferVanityScoreMetadata(headWallet);
assert.equal(headMetadata?.vanityMatchType, 'extra');
assert.equal(headMetadata?.vanityPatternType, 'sequence-up');
assert.equal(headMetadata?.vanityRepeatSide, 'head');
assert.equal(headMetadata?.vanityHeadRun, 'abcde');
assert.equal(headMetadata?.vanityScore, 39);

const tailWallet = { address: '0x111abcde1234567890abcdef1234567890abcdef' };
const tailMetadata = inferVanityScoreMetadata(tailWallet);
assert.equal(tailMetadata?.vanityPatternType, 'sequence-up');
assert.equal(tailMetadata?.vanityRepeatSide, 'tail');
assert.equal(tailMetadata?.vanityTailRun, 'abcdef');
assert.equal(tailMetadata?.vanityScore, 49);

assert.equal(getVanityScoreGradeLabel(91, t), 'S / Rare');
assert.equal(getVanityScoreGradeLabel(78, t), 'A');
assert.equal(getVanityScoreGradeLabel(55, t), 'B');
assert.equal(getVanityScoreGradeLabel(30, t), 'C');
assert.equal(getVanityPatternLabel('numeric-tail', 'tail', t), 'Numeric tail (Suffix)');
assert.equal(getVanityPatternLabel('low-diversity', 'head', t), 'Low character diversity (Prefix)');
assert.equal(
  getVanityScoreReason({
    vanityPatternType: 'lucky',
    vanityRepeatSide: 'head',
    vanityRepeatChar: '168',
    vanityRepeatLength: 3,
  }, t),
  'Lucky/custom patterns (Prefix): 168',
  'lucky reason should use the full pattern exactly once'
);
assert.equal(
  getVanityScoreReason({
    vanityPatternType: 'repeat',
    vanityRepeatSide: 'tail',
    vanityRepeatChar: 'a',
    vanityRepeatLength: 4,
  }, t),
  'Repeated characters (Suffix): aaaa',
  'single-character repeat reason should expand to the run length'
);
assert.equal(
  getVanityScoreReason({
    vanityPatternType: 'numeric-tail',
    vanityRepeatSide: 'tail',
    vanityTailRun: '2024',
  }, t),
  'Numeric tail (Suffix): Suffix: 2024'
);
assert.equal(
  getVanityScoreReason({
    vanityPatternType: 'low-diversity',
    vanityRepeatSide: 'head',
    vanityHeadRun: 'aa11aa',
  }, t),
  'Low character diversity (Prefix): Prefix: aa11aa'
);

assert.equal(
  shouldShowVanityScore({ vanityScore: 91 }),
  false,
  'wallet with score but without match type should not show score',
);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'extra', vanityScore: 20 }), true);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'main', vanityScore: 29 }), false);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'main', vanityScore: 30 }), true);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'extra', vanityScore: 78 }, false), false);

const { primaryVanityScoreMetadata } = await import('../src/utils/vanity/vanityScoreGrade.ts');
const { scoreVanityMatch, normalizeVanityExtraFilters } = await import('../src/utils/vanity/vanityMatch.ts');
const score = (patternType, length, side = 'head', extra = {}) => scoreVanityMatch({ patternType, length, side, char: 'a', score: 0, ...extra });
assert.equal(score('palindrome', 5), 18);
assert.equal(score('repeat', 3, 'both', { headRun: 'aaa', tailRun: 'bbb' }), 40);
assert.equal(score('numeric-tail', 4, 'tail'), 7);
assert.ok(score('repeat', 6) > score('low-diversity', 6));
assert.ok(score('alternating', 6) > score('low-diversity', 6));
assert.equal(primaryVanityScoreMetadata('abcd', '1234').vanityScore, 80);
assert.equal(primaryVanityScoreMetadata('a'.repeat(30), 'a'.repeat(30)).vanityScore, 400);
const primary = { address: `0xabcd${'19'.repeat(16)}1234`, vanityMatchType: 'main', vanityHeadRun: 'abcd', vanityTailRun: '1234' };
const migrated = inferVanityScoreMetadata(primary);
assert.equal(migrated.vanityHeadRun, 'abcd');
assert.equal(migrated.vanityTailRun, '1234');
assert.equal(migrated.vanityScoreVersion, 2);
assert.equal(migrated.vanityScore, 80);
assert.equal(inferVanityScoreMetadata({ ...primary, vanityPatternType: 'repeat' }), null);
assert.equal(inferVanityScoreMetadata({ ...primary, vanityHeadRun: 'ffff' }), null);
assert.equal(inferVanityScoreMetadata({ address: primary.address, vanityMatchType: 'extra', vanityPatternType: 'numeric-tail', vanityRepeatLength: 4, vanityRepeatSide: 'tail', vanityScore: 99 }).vanityScore, 7);
assert.equal(normalizeVanityExtraFilters(null, 6).repeat.minRun, 6);
assert.equal(normalizeVanityExtraFilters({ repeat: { minRun: 3 } }, 6).repeat.minRun, 3);
console.log('Vanity score grade tests passed');
assert.equal(getVanityScoreGradeLabel(95, translate(vi)), 'S / Hiếm');
for (const type of ['repeat','sequence-up','sequence-down','mirror','palindrome','bracket','lucky','alternating','numeric-tail','low-diversity',undefined]) {
 for (const side of ['head','tail','both',undefined]) {
  assert.ok(getVanityPatternLabel(type, side, translate(vi)));
 }
}
