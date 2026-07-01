import assert from 'node:assert/strict';
import { compareVanityExtraMatches, detectExtraVanityMatch } from '../src/utils/vanity/vanityMatch.ts';

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

const palindromeOnly = detectExtraVanityMatch('0xabccba1234567890abcdef1234567890abcdef12', {
  repeat: { enabled: false },
  sequenceUp: { enabled: false },
  sequenceDown: { enabled: false },
  mirror: { enabled: false },
  bothEnds: { enabled: false },
  palindrome: { enabled: true, minRun: 6 },
  bracket: { enabled: false },
  lucky: { enabled: false },
  alternating: { enabled: false },
  numericTail: { enabled: false },
  lowDiversity: { enabled: false },
});
assert.equal(palindromeOnly?.patternType, 'palindrome');
assert.equal(palindromeOnly?.headRun, 'abccba');

const bracketOnly = detectExtraVanityMatch('0xabc1234567890abcdef1234567890abcdefabc', {
  repeat: { enabled: false },
  sequenceUp: { enabled: false },
  sequenceDown: { enabled: false },
  mirror: { enabled: false },
  bothEnds: { enabled: false },
  palindrome: { enabled: false },
  bracket: { enabled: true, minRun: 3 },
  lucky: { enabled: false },
  alternating: { enabled: false },
  numericTail: { enabled: false },
  lowDiversity: { enabled: false },
});
assert.equal(bracketOnly?.patternType, 'bracket');
assert.equal(bracketOnly?.headRun, 'abc');
assert.equal(bracketOnly?.tailRun, 'abc');

const luckyOnly = detectExtraVanityMatch('0x1234567890abcdef168abcdef1234567890abcd', {
  repeat: { enabled: false },
  sequenceUp: { enabled: false },
  sequenceDown: { enabled: false },
  mirror: { enabled: false },
  bothEnds: { enabled: false },
  palindrome: { enabled: false },
  bracket: { enabled: false },
  lucky: { enabled: true, patterns: ['168'] },
  alternating: { enabled: false },
  numericTail: { enabled: false },
  lowDiversity: { enabled: false },
});
assert.equal(luckyOnly?.patternType, 'lucky');
assert.equal(luckyOnly?.headRun, '168');

const alternatingOnly = detectExtraVanityMatch('0xababab1234567890abcdef1234567890abcdef12', {
  repeat: { enabled: false },
  sequenceUp: { enabled: false },
  sequenceDown: { enabled: false },
  mirror: { enabled: false },
  bothEnds: { enabled: false },
  palindrome: { enabled: false },
  bracket: { enabled: false },
  lucky: { enabled: false },
  alternating: { enabled: true, minRun: 6 },
  numericTail: { enabled: false },
  lowDiversity: { enabled: false },
});
assert.equal(alternatingOnly?.patternType, 'alternating');
assert.equal(alternatingOnly?.headRun, 'ababab');

const numericTailOnly = detectExtraVanityMatch('0xabcdef1234567890abcdef1234567890ab2024', {
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
assert.equal(numericTailOnly?.patternType, 'numeric-tail');
assert.equal(numericTailOnly?.tailRun, '2024');

const lowDiversityOnly = detectExtraVanityMatch('0xaa11aa1234567890abcdef1234567890abcdef12', {
  repeat: { enabled: false },
  sequenceUp: { enabled: false },
  sequenceDown: { enabled: false },
  mirror: { enabled: false },
  bothEnds: { enabled: false },
  palindrome: { enabled: false },
  bracket: { enabled: false },
  lucky: { enabled: false },
  alternating: { enabled: false },
  numericTail: { enabled: false },
  lowDiversity: { enabled: true, minRun: 6 },
});
assert.equal(lowDiversityOnly?.patternType, 'low-diversity');
assert.equal(lowDiversityOnly?.headRun, 'aa11aa1');

assert.equal(detectExtraVanityMatch('0x12abce81234567890abcdef1234567890abcdee', 3), null);

const ranked = [head, tail, both].filter(Boolean).sort(compareVanityExtraMatches);
assert.deepEqual(ranked.map(match => match.side), ['both', 'tail', 'head']);

console.log('Vanity match tests passed');
