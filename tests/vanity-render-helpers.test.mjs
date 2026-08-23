import assert from 'node:assert/strict';
import {
  getCompactVanityMiddleHighlights,
  getVanityHighlightLengths,
} from '../src/hooks/vanity/vanityRenderHelpers.tsx';

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'extra',
    vanityRepeatSide: 'head',
    vanityRepeatLength: 4,
    vanityHeadRun: 'AAAA',
  }, 40),
  { headLength: 4, tailLength: 0, middleStart: undefined, middleLength: 0 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'extra',
    vanityRepeatSide: 'tail',
    vanityRepeatLength: 5,
    vanityTailRun: '99999',
  }, 40),
  { headLength: 0, tailLength: 5, middleStart: undefined, middleLength: 0 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'extra',
    vanityRepeatSide: 'both',
    vanityRepeatLength: 6,
    vanityHeadRun: 'AAAAAA',
    vanityTailRun: 'BBBBBB',
  }, 10),
  { headLength: 6, tailLength: 4, middleStart: undefined, middleLength: 0 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'main',
    vanityHeadRun: 'abc',
    vanityTailRun: 'def',
  }, 40),
  { headLength: 3, tailLength: 3, middleStart: undefined, middleLength: 0 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'main',
    vanityRepeatSide: 'both',
    vanityRepeatLength: 4,
  }, 6),
  { headLength: 4, tailLength: 2, middleStart: undefined, middleLength: 0 }
);

assert.deepEqual(
  getVanityHighlightLengths({
    vanityMatchType: 'extra',
    vanityRepeatSide: 'head',
    vanityRepeatLength: 3,
    vanityMatchStart: 16,
  }, 40),
  { headLength: 0, tailLength: 0, middleStart: 16, middleLength: 3 }
);

assert.deepEqual(
  getCompactVanityMiddleHighlights({
    bodyLength: 40,
    visibleHeadLength: 12,
    visibleTailLength: 8,
    middleStart: 8,
    middleLength: 6,
  }),
  { headStart: 8, headLength: 4, tailStart: 0, tailLength: 0 },
  'lucky match should highlight only its visible intersection in the compact head'
);

assert.deepEqual(
  getCompactVanityMiddleHighlights({
    bodyLength: 40,
    visibleHeadLength: 12,
    visibleTailLength: 8,
    middleStart: 16,
    middleLength: 3,
  }),
  { headStart: 12, headLength: 0, tailStart: 0, tailLength: 0 },
  'lucky match hidden by the ellipsis should not highlight visible characters'
);

assert.deepEqual(
  getCompactVanityMiddleHighlights({
    bodyLength: 40,
    visibleHeadLength: 12,
    visibleTailLength: 8,
    middleStart: 30,
    middleLength: 5,
  }),
  { headStart: 12, headLength: 0, tailStart: 0, tailLength: 3 },
  'lucky match should highlight only its visible intersection in the compact tail'
);

console.log('Vanity render helper tests passed');