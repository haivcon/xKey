import assert from 'node:assert/strict';
import { compareVanityExtraMatches, detectExtraVanityMatch } from '../src/utils/vanityMatch.ts';

const head = detectExtraVanityMatch('0x111abcde1234567890abcdef1234567890abcdef', 3);
assert.deepEqual(head, {
  side: 'head',
  char: '1',
  length: 3,
  headRun: '111',
  score: 34,
});

const tail = detectExtraVanityMatch('0xabcde1234567890abcdef1234567890abcdefaaaa', 4);
assert.deepEqual(tail, {
  side: 'tail',
  char: 'a',
  length: 4,
  tailRun: 'aaaa',
  score: 43,
});

const both = detectExtraVanityMatch('0x111abcde1234567890abcdef1234567890aaaa', 3);
assert.equal(both?.side, 'both');
assert.equal(both?.headRun, '111');
assert.equal(both?.tailRun, 'aaaa');
assert.equal(both?.score, 97);

assert.equal(detectExtraVanityMatch('0x12abcde1234567890abcdef1234567890abcdef', 3), null);

const ranked = [head, tail, both].filter(Boolean).sort(compareVanityExtraMatches);
assert.deepEqual(ranked.map(match => match.side), ['both', 'tail', 'head']);

console.log('Vanity match tests passed');
