import assert from 'node:assert/strict';
import { getVanityHighlightLengths } from '../src/hooks/vanity/vanityRenderHelpers.tsx';

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'extra',
    vanityRepeatSide: 'head',
    vanityRepeatLength: 4,
    vanityHeadRun: 'AAAA',
  }, 40),
  { headLength: 4, tailLength: 0 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'extra',
    vanityRepeatSide: 'tail',
    vanityRepeatLength: 5,
    vanityTailRun: '99999',
  }, 40),
  { headLength: 0, tailLength: 5 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'extra',
    vanityRepeatSide: 'both',
    vanityRepeatLength: 6,
    vanityHeadRun: 'AAAAAA',
    vanityTailRun: 'BBBBBB',
  }, 10),
  { headLength: 6, tailLength: 4 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'main',
    vanityHeadRun: 'abc',
    vanityTailRun: 'def',
  }, 40),
  { headLength: 3, tailLength: 3 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'main',
    vanityRepeatSide: 'both',
    vanityRepeatLength: 4,
  }, 6),
  { headLength: 4, tailLength: 2 }
);

console.log('Vanity render helper tests passed');