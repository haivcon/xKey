import assert from 'node:assert/strict';
import { compareVanityExtraMatches, detectExtraVanityMatch } from '../src/utils/vanity/vanityMatch.ts';

const head = detectExtraVanityMatch('0x111abcde1234567890abcdef1234567890abcdef', 3);
assert.deepEqual(head, {
  side: 'tail',
  char: 'a',
  length: 6,
  patternType: 'sequence-up',
  tailRun: 'abcdef',
  score: 49,
});

const tail = detectExtraVanityMatch('0xabcde1234567890abcdef1234567890abcdefaaaa', 4);
assert.deepEqual(tail, {
  side: 'head',
  char: 'a',
  length: 5,
  patternType: 'sequence-up',
  headRun: 'abcde',
  score: 39,
});

const both = detectExtraVanityMatch('0x111abcde1234567890abcdef1234567890aaaa', 3);
assert.equal(both?.side, 'both');
assert.equal(both?.headRun, '111');
assert.equal(both?.tailRun, 'aaaa');
assert.equal(both?.score, 50);

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
assert.equal(luckyOnly, null, 'a lucky pattern in the middle is not an edge match');

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

const numericTailScore324 = detectExtraVanityMatch(`0x${'a'.repeat(14)}${'1234567890'.repeat(2)}123456`, {
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
assert.equal(numericTailScore324?.length, 26);
assert.equal(numericTailScore324?.score, 44);

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

const off = Object.fromEntries(['repeat', 'sequenceUp', 'sequenceDown', 'mirror', 'bothEnds', 'palindrome', 'bracket', 'lucky', 'alternating', 'numericTail', 'lowDiversity'].map(key => [key, { enabled: false }]));
const only = (key, rule = {}) => ({ ...off, [key]: { enabled: true, ...rule } });
const address = (head = '', tail = '') => `0x${head}${'9c2e7b'.repeat(7).slice(0, 40 - head.length - tail.length)}${tail}`;

for (const pattern of ['ababab', 'bababab', '121212']) {
  const match = detectExtraVanityMatch(address('', pattern), only('alternating', { minRun: 6 }));
  assert.equal(match?.side, 'tail');
  assert.equal(match?.tailRun, pattern);
  assert.equal(match?.char, pattern[0]);
}
for (const [key, good, bad] of [['sequenceUp', '1234', '4321'], ['sequenceDown', '4321', '1234']]) {
  const config = only(key, { minRun: 4, charType: 'numbers' });
  assert.equal(detectExtraVanityMatch(address('', good), config)?.tailRun, good);
  assert.equal(detectExtraVanityMatch(address('', bad), config), null);
  assert.equal(detectExtraVanityMatch(address(good), config)?.headRun, good);
}
assert.equal(detectExtraVanityMatch(address('ef01'), only('sequenceUp', { minRun: 4 })), null);
assert.equal(detectExtraVanityMatch(address('789abc'), only('sequenceUp', { minRun: 3, charType: 'numbers' }))?.headRun, '789');
const luckyEdges = only('lucky', { patterns: ['168'] });
assert.equal(detectExtraVanityMatch(address('168'), luckyEdges)?.matchStart, 0);
assert.equal(detectExtraVanityMatch(address('', '168'), luckyEdges)?.matchStart, 37);
assert.equal(detectExtraVanityMatch(address('168', '168'), luckyEdges)?.side, 'both');
assert.equal(detectExtraVanityMatch(address('888'), only('lucky', { patterns: [] })), null);
assert.equal(detectExtraVanityMatch(address('', '2024'), only('numericTail', { minRun: 4 }))?.score, 7);
assert.equal(detectExtraVanityMatch(address('', '2024'), only('numericTail', { minRun: 5 })), null);
for (const [key, head, tail] of [
  ['mirror', '123456789abc', 'cba987654321'],
  ['bracket', '123456789abc', '123456789abc'],
  ['palindrome', '123456654321', ''],
]) {
  assert.equal(detectExtraVanityMatch(address(head, tail), only(key, { minRun: 12 }))?.length, 12);
}
assert.equal(detectExtraVanityMatch(address('12321', '12344321'), only('palindrome', { minRun: 5 }))?.tailRun, '12344321');
assert.equal(detectExtraVanityMatch(address('8888', '8888'), off), null);
assert.equal(detectExtraVanityMatch(address('aaaa'), only('repeat', { minRun: 4, charType: 'numbers' })), null);
// Custom patterns are normalized once committed, deduplicated, and never
// silently repopulated when the user clears their list.
const { normalizeVanityExtraFilters } = await import('../src/utils/vanity/vanityMatch.ts');
assert.deepEqual(normalizeVanityExtraFilters(only('lucky', {
  patterns: ['888', ' 0xAB ', 'ab', '888', ''],
})).lucky.patterns, ['888', 'ab']);
assert.deepEqual(normalizeVanityExtraFilters(only('lucky', { patterns: [] })).lucky.patterns, []);
console.log('Vanity match tests passed');
