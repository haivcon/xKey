export type VanityRepeatSide = 'head' | 'tail' | 'both';

export type VanityExtraMatch = {
  side: VanityRepeatSide;
  char: string;
  length: number;
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

  if (!hasHead && !hasTail) return null;

  // A body made from one repeated character has overlapping head/tail runs.
  // Score it once instead of giving it an artificial double bonus.
  const overlappingRuns = hasHead && hasTail && head.length + tail.length > body.length;
  if (hasHead && hasTail && !overlappingRuns) {
    const preferred = head.length >= tail.length ? head : tail;
    return {
      side: 'both',
      char: preferred.char,
      length: Math.max(head.length, tail.length),
      headRun: head.value,
      tailRun: tail.value,
      score: scoreRun(head.length, 'head') + scoreRun(tail.length, 'tail') + 20,
    };
  }

  const selected = hasHead ? head : tail;
  const side: 'head' | 'tail' = hasHead ? 'head' : 'tail';
  return {
    side,
    char: selected.char,
    length: selected.length,
    [side === 'head' ? 'headRun' : 'tailRun']: selected.value,
    score: scoreRun(selected.length, side),
  };
};
