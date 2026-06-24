export type VanityRepeatSide = 'head' | 'tail' | 'both';

export type VanityExtraPatternType = 'repeat' | 'sequence-up' | 'sequence-down' | 'mirror';

export type VanityExtraMatch = {
  side: VanityRepeatSide;
  char: string;
  length: number;
  patternType?: VanityExtraPatternType;
  score: number;
  headRun?: string;
  tailRun?: string;
};

type CharacterRun = {
  char: string;
  length: number;
  value: string;
};

const getRun = (value: string, fromEnd = false): CharacterRun => {
  const index = fromEnd ? value.length - 1 : 0;
  const char = value[index] || '';
  let length = 0;
  for (let i = index; fromEnd ? i >= 0 : i < value.length; fromEnd ? i -= 1 : i += 1) {
    if (value[i] !== char) break;
    length += 1;
  }
  return { char, length, value: char.repeat(length) };
};

const scoreRun = (length: number, side: 'head' | 'tail'): number => length * 10 + (side === 'head' ? 4 : 3);

const HEX_SEQUENCE = '0123456789abcdef';

const longestEdgeSequence = (body: string, direction: 'up' | 'down'): { length: number; value: string; side: 'head' | 'tail' } | null => {
  const source = direction === 'up' ? HEX_SEQUENCE : [...HEX_SEQUENCE].reverse().join('');
  const variants = Array.from({ length: source.length }, (_, index) => source.slice(index) + source.slice(0, index));
  let best: { length: number; value: string; side: 'head' | 'tail' } | null = null;
  for (const variant of variants) {
    for (const side of ['head', 'tail'] as const) {
      const target = side === 'head' ? body : [...body].reverse().join('');
      let length = 0;
      while (length < target.length && target[length] === variant[length % variant.length]) length += 1;
      if (length >= 3 && (!best || length > best.length)) {
        const value = side === 'head' ? body.slice(0, length) : body.slice(body.length - length);
        best = { length, value, side };
      }
    }
  }
  return best;
};

const detectMirror = (body: string): VanityExtraMatch | null => {
  const edge = Math.min(8, Math.floor(body.length / 2));
  let length = 0;
  for (let i = 0; i < edge; i += 1) {
    if (body[i] !== body[body.length - 1 - i]) break;
    length += 1;
  }
  if (length < 3) return null;
  return {
    side: 'both',
    char: body[0] || '',
    length,
    patternType: 'mirror',
    headRun: body.slice(0, length),
    tailRun: body.slice(body.length - length),
    score: length * 18 + 24,
  };
};

export const compareVanityExtraMatches = (left: VanityExtraMatch, right: VanityExtraMatch): number => (
  right.score - left.score
  || right.length - left.length
  || left.side.localeCompare(right.side)
  || left.char.localeCompare(right.char)
);

export const detectExtraVanityMatch = (address: string, minRun: number): VanityExtraMatch | null => {
  const body = address.replace(/^0x/i, '').toLowerCase();
  const requiredRun = Math.max(3, Math.min(40, Number(minRun) || 3));
  const head = getRun(body);
  const tail = getRun(body, true);
  const hasHead = !!head.char && head.length >= requiredRun;
  const hasTail = !!tail.char && tail.length >= requiredRun;
  const matches: VanityExtraMatch[] = [];

  const up = longestEdgeSequence(body, 'up');
  if (up && up.length >= requiredRun) {
    matches.push({
      side: up.side,
      char: up.value[0] || '',
      length: up.length,
      patternType: 'sequence-up',
      [up.side === 'head' ? 'headRun' : 'tailRun']: up.value,
      score: up.length * 14 + (up.side === 'head' ? 8 : 7),
    });
  }

  const down = longestEdgeSequence(body, 'down');
  if (down && down.length >= requiredRun) {
    matches.push({
      side: down.side,
      char: down.value[0] || '',
      length: down.length,
      patternType: 'sequence-down',
      [down.side === 'head' ? 'headRun' : 'tailRun']: down.value,
      score: down.length * 14 + (down.side === 'head' ? 8 : 7),
    });
  }

  const mirror = detectMirror(body);
  if (mirror && mirror.length >= requiredRun) matches.push(mirror);

  if (!hasHead && !hasTail) {
    return matches.sort(compareVanityExtraMatches)[0] || null;
  }

  // A body made from one repeated character has overlapping head/tail runs.
  // Score it once instead of giving it an artificial double bonus.
  const overlappingRuns = hasHead && hasTail && head.length + tail.length > body.length;
  if (hasHead && hasTail && !overlappingRuns) {
    const preferred = head.length >= tail.length ? head : tail;
    matches.push({
      side: 'both',
      char: preferred.char,
      length: Math.max(head.length, tail.length),
      patternType: 'repeat',
      headRun: head.value,
      tailRun: tail.value,
      score: scoreRun(head.length, 'head') + scoreRun(tail.length, 'tail') + 20,
    });
    return matches.sort(compareVanityExtraMatches)[0] || null;
  }

  const selected = hasHead ? head : tail;
  const side: 'head' | 'tail' = hasHead ? 'head' : 'tail';
  matches.push({
    side,
    char: selected.char,
    length: selected.length,
    patternType: 'repeat',
    [side === 'head' ? 'headRun' : 'tailRun']: selected.value,
    score: scoreRun(selected.length, side),
  });
  return matches.sort(compareVanityExtraMatches)[0] || null;
};
