import assert from 'node:assert/strict';
import { compareVanityExtraMatches, detectExtraVanityMatch } from '../src/utils/vanityMatch.ts';

const head = detectExtraVanityMatch('0x111abcde1234567890abcdef1234567890abcdef', 3);
assert.deepEqual(head, {
  side: 'tail',
  char: 'a',
  length: 6,
  patternType: 'sequence-down',
  tailRun: 'abcdef',
  score: 91,
});

const tail = detectExtraVanityMatch('0xabcde1234567890abcdef1234567890abcdefaaaa', 4);
assert.deepEqual(tail, {
  side: 'head',
  char: 'a',
  length: 5,
  patternType: 'sequence-up',
  headRun: 'abcde',
  score: 78,
});

const both = detectExtraVanityMatch('0x111abcde1234567890abcdef1234567890aaaa', 3);
assert.equal(both?.side, 'both');
assert.equal(both?.headRun, '111');
assert.equal(both?.tailRun, 'aaaa');
assert.equal(both?.score, 97);

const sequenceUp = detectExtraVanityMatch('0x1234567890abcdef1234567890abcdefffffffff', 4);
assert.equal(sequenceUp?.patternType, 'sequence-up');
assert.equal(sequenceUp?.side, 'head');
assert.equal(sequenceUp?.headRun, '123456789');

const sequenceDown = detectExtraVanityMatch('0xfedcba9876543210abcdef1234567890abcdef12', 4);
assert.equal(sequenceDown?.patternType, 'sequence-down');
assert.equal(sequenceDown?.side, 'head');
assert.equal(sequenceDown?.headRun, 'fedcba9876543210');

const mirror = detectExtraVanityMatch('0xabc1230000000000000000000000000000001cba', 3);
assert.equal(mirror?.patternType, 'mirror');
assert.equal(mirror?.side, 'both');
assert.equal(mirror?.headRun, 'abc1');
assert.equal(mirror?.tailRun, '1cba');

assert.equal(detectExtraVanityMatch('0x12abce81234567890abcdef1234567890abcdee', 3), null);

const ranked = [head, tail, both].filter(Boolean).sort(compareVanityExtraMatches);
assert.deepEqual(ranked.map(match => match.side), ['both', 'tail', 'head']);

console.log('Vanity match tests passed');
