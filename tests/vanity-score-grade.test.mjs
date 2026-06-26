import assert from 'node:assert/strict';
import {
  getVanityScoreGradeLabel,
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
assert.equal(headMetadata?.vanityScore, 78);

const tailWallet = { address: '0x111abcde1234567890abcdef1234567890abcdef' };
const tailMetadata = inferVanityScoreMetadata(tailWallet);
assert.equal(tailMetadata?.vanityPatternType, 'sequence-down');
assert.equal(tailMetadata?.vanityRepeatSide, 'tail');
assert.equal(tailMetadata?.vanityTailRun, 'abcdef');
assert.equal(tailMetadata?.vanityScore, 91);

assert.equal(getVanityScoreGradeLabel(91), 'S / Rare');
assert.equal(getVanityScoreGradeLabel(78), 'A');
assert.equal(getVanityScoreGradeLabel(55), 'B');
assert.equal(getVanityScoreGradeLabel(30), 'C');

assert.equal(
  shouldShowVanityScore({ vanityScore: 91 }),
  false,
  'wallet with score but without match type should not show score',
);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'extra', vanityScore: 20 }), true);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'main', vanityScore: 29 }), false);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'main', vanityScore: 30 }), true);
assert.equal(shouldShowVanityScore({ vanityMatchType: 'extra', vanityScore: 78 }, false), false);

console.log('Vanity score grade tests passed');