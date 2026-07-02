export type VanityRepeatSide = 'head' | 'tail' | 'both';
export type VanityExtraCharType = 'any' | 'letters' | 'numbers';

export type VanityExtraPatternType =
  | 'repeat'
  | 'sequence-up'
  | 'sequence-down'
  | 'mirror'
  | 'palindrome'
  | 'bracket'
  | 'lucky'
  | 'alternating'
  | 'numeric-tail'
  | 'low-diversity';

export type VanityExtraPatternKey =
  | 'repeat'
  | 'sequenceUp'
  | 'sequenceDown'
  | 'mirror'
  | 'bothEnds'
  | 'palindrome'
  | 'bracket'
  | 'lucky'
  | 'alternating'
  | 'numericTail'
  | 'lowDiversity';

export type VanityExtraFilterRule = {
  enabled: boolean;
  minRun?: number;
  patterns?: string[];
  charType?: VanityExtraCharType;
};

export type VanityExtraFilterConfig = Record<VanityExtraPatternKey, VanityExtraFilterRule>;

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

const HEX_SEQUENCE = '0123456789abcdef';
const DEFAULT_LUCKY_PATTERNS = ['888', '666', '999', '000', '168', '520', '1314'];

export const DEFAULT_VANITY_EXTRA_FILTERS: VanityExtraFilterConfig = {
  repeat: { enabled: true, minRun: 4, charType: 'any' },
  sequenceUp: { enabled: true, minRun: 4, charType: 'any' },
  sequenceDown: { enabled: true, minRun: 4, charType: 'any' },
  mirror: { enabled: true, minRun: 3, charType: 'any' },
  bothEnds: { enabled: true, minRun: 3, charType: 'any' },
  palindrome: { enabled: false, minRun: 5, charType: 'any' },
  bracket: { enabled: true, minRun: 3, charType: 'any' },
  lucky: { enabled: false, patterns: DEFAULT_LUCKY_PATTERNS },
  alternating: { enabled: false, minRun: 6, charType: 'any' },
  numericTail: { enabled: false, minRun: 4 },
  lowDiversity: { enabled: false, minRun: 6 },
};

const clampMinRun = (value: unknown, fallback = 4): number => Math.max(3, Math.min(12, Number(value) || fallback));

const normalizeCharType = (value: unknown): VanityExtraCharType => (
  value === 'letters' || value === 'numbers' ? value : 'any'
);

const isCharTypeMatch = (value: string, charType: VanityExtraCharType = 'any'): boolean => {
  if (!value) return false;
  if (charType === 'letters') return /^[a-f]+$/.test(value);
  if (charType === 'numbers') return /^[0-9]+$/.test(value);
  return /^[0-9a-f]+$/.test(value);
};

export const normalizeVanityExtraFilters = (
  config?: Partial<Record<VanityExtraPatternKey, Partial<VanityExtraFilterRule>>> | null,
  fallbackMinRun = 4,
): VanityExtraFilterConfig => {
  const merged = { ...DEFAULT_VANITY_EXTRA_FILTERS } as VanityExtraFilterConfig;
  (Object.keys(merged) as VanityExtraPatternKey[]).forEach((key) => {
    const base = DEFAULT_VANITY_EXTRA_FILTERS[key];
    const incoming = config?.[key];
    merged[key] = {
      enabled: typeof incoming?.enabled === 'boolean' ? incoming.enabled : base.enabled,
      minRun: key === 'lucky' ? undefined : clampMinRun(incoming?.minRun, base.minRun || fallbackMinRun),
      patterns: key === 'lucky'
        ? (Array.isArray(incoming?.patterns) && incoming.patterns.length ? incoming.patterns : base.patterns || DEFAULT_LUCKY_PATTERNS)
          .map(pattern => String(pattern).replace(/^0x/i, '').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 12))
          .filter(pattern => pattern.length >= 2)
        : undefined,
      charType: key !== 'lucky' && key !== 'numericTail' && key !== 'lowDiversity'
        ? normalizeCharType(incoming?.charType ?? base.charType)
        : undefined,
    };
  });
  return merged;
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

const longestEdgeSequence = (
  body: string,
  direction: 'up' | 'down',
  charType: VanityExtraCharType = 'any',
): { length: number; value: string; side: 'head' | 'tail' } | null => {
  const source = direction === 'up' ? HEX_SEQUENCE : [...HEX_SEQUENCE].reverse().join('');
  const variants = Array.from({ length: source.length }, (_, index) => source.slice(index) + source.slice(0, index));
  let best: { length: number; value: string; side: 'head' | 'tail' } | null = null;
  for (const variant of variants) {
    for (const side of ['head', 'tail'] as const) {
      const target = side === 'head' ? body : [...body].reverse().join('');
      let length = 0;
      while (length < target.length && target[length] === variant[length % variant.length]) length += 1;
      if (length >= 3) {
        const value = side === 'head' ? body.slice(0, length) : body.slice(body.length - length);
        if (isCharTypeMatch(value, charType) && (!best || length > best.length)) {
          best = { length, value, side };
        }
      }
    }
  }
  return best;
};

const detectMirror = (body: string, charType: VanityExtraCharType = 'any'): VanityExtraMatch | null => {
  const edge = Math.min(8, Math.floor(body.length / 2));
  let length = 0;
  for (let i = 0; i < edge; i += 1) {
    if (body[i] !== body[body.length - 1 - i]) break;
    length += 1;
  }
  if (length < 3) return null;
  const headRun = body.slice(0, length);
  const tailRun = body.slice(body.length - length);
  if (!isCharTypeMatch(headRun, charType) || !isCharTypeMatch(tailRun, charType)) return null;
  return {
    side: 'both',
    char: body[0] || '',
    length,
    patternType: 'mirror',
    headRun,
    tailRun,
    score: length * 18 + 24,
  };
};

const detectPalindrome = (
  body: string,
  minRun: number,
  charType: VanityExtraCharType = 'any',
): VanityExtraMatch | null => {
  const max = Math.min(10, body.length);
  for (const side of ['head', 'tail'] as const) {
    const source = side === 'head' ? body.slice(0, max) : body.slice(-max);
    for (let length = max; length >= minRun; length -= 1) {
      const value = side === 'head' ? source.slice(0, length) : source.slice(source.length - length);
      if (value === [...value].reverse().join('') && isCharTypeMatch(value, charType)) {
        return {
          side,
          char: value[0] || '',
          length,
          patternType: 'palindrome',
          [side === 'head' ? 'headRun' : 'tailRun']: value,
          score: length * 16 + (side === 'head' ? 10 : 9),
        };
      }
    }
  }
  return null;
};

const detectBracket = (body: string, minRun: number, charType: VanityExtraCharType = 'any'): VanityExtraMatch | null => {
  const max = Math.min(8, Math.floor(body.length / 2));
  for (let length = max; length >= minRun; length -= 1) {
    const head = body.slice(0, length);
    const tail = body.slice(body.length - length);
    if (head && head === tail && isCharTypeMatch(head, charType)) {
      return {
        side: 'both',
        char: head[0] || '',
        length,
        patternType: 'bracket',
        headRun: head,
        tailRun: tail,
        score: length * 20 + 22,
      };
    }
  }
  return null;
};

const detectLucky = (body: string, patterns: string[]): VanityExtraMatch | null => {
  let best: VanityExtraMatch | null = null;
  for (const pattern of patterns) {
    if (!pattern || pattern.length < 2) continue;
    const head = body.startsWith(pattern);
    const tail = body.endsWith(pattern);
    const contains = body.includes(pattern);
    if (!head && !tail && !contains) continue;
    const side: VanityRepeatSide = head && tail ? 'both' : head ? 'head' : tail ? 'tail' : 'head';
    const match: VanityExtraMatch = {
      side,
      char: pattern[0] || '',
      length: pattern.length,
      patternType: 'lucky',
      headRun: head || contains ? pattern : undefined,
      tailRun: tail ? pattern : undefined,
      score: pattern.length * 9 + (head || tail ? 18 : 6) + (side === 'both' ? 18 : 0),
    };
    if (!best || compareVanityExtraMatches(match, best) < 0) best = match;
  }
  return best;
};

const detectAlternating = (
  body: string,
  minRun: number,
  charType: VanityExtraCharType = 'any',
): VanityExtraMatch | null => {
  let best: VanityExtraMatch | null = null;
  for (const side of ['head', 'tail'] as const) {
    const target = side === 'head' ? body : [...body].reverse().join('');
    if (target.length < minRun) continue;
    const a = target[0];
    const b = target[1];
    if (!a || !b || a === b) continue;
    let length = 0;
    while (length < target.length && target[length] === (length % 2 === 0 ? a : b)) length += 1;
    if (length >= minRun) {
      const value = side === 'head' ? body.slice(0, length) : body.slice(body.length - length);
      if (!isCharTypeMatch(value, charType)) continue;
      const match: VanityExtraMatch = {
        side,
        char: a,
        length,
        patternType: 'alternating',
        [side === 'head' ? 'headRun' : 'tailRun']: value,
        score: length * 13 + (side === 'head' ? 8 : 7),
      };
      if (!best || compareVanityExtraMatches(match, best) < 0) best = match;
    }
  }
  return best;
};

const detectNumericTail = (body: string, minRun: number): VanityExtraMatch | null => {
  let length = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    if (!/[0-9]/.test(body[index])) break;
    length += 1;
  }
  if (length < minRun) return null;
  const value = body.slice(body.length - length);
  return {
    side: 'tail',
    char: value[0] || '',
    length,
    patternType: 'numeric-tail',
    tailRun: value,
    score: length * 12 + 12,
  };
};

const detectLowDiversity = (body: string, minRun: number): VanityExtraMatch | null => {
  let best: VanityExtraMatch | null = null;
  for (const side of ['head', 'tail'] as const) {
    const target = side === 'head' ? body : [...body].reverse().join('');
    const seen = new Set<string>();
    let length = 0;
    while (length < target.length) {
      seen.add(target[length]);
      if (seen.size > 2) break;
      length += 1;
    }
    if (length >= minRun) {
      const value = side === 'head' ? body.slice(0, length) : body.slice(body.length - length);
      const match: VanityExtraMatch = {
        side,
        char: value[0] || '',
        length,
        patternType: 'low-diversity',
        [side === 'head' ? 'headRun' : 'tailRun']: value,
        score: length * 11 + (side === 'head' ? 7 : 6),
      };
      if (!best || compareVanityExtraMatches(match, best) < 0) best = match;
    }
  }
  return best;
};

export const compareVanityExtraMatches = (left: VanityExtraMatch, right: VanityExtraMatch): number => (
  right.score - left.score
  || right.length - left.length
  || left.side.localeCompare(right.side)
  || left.char.localeCompare(right.char)
);

export const detectExtraVanityMatch = (
  address: string,
  minRunOrConfig: number | Partial<Record<VanityExtraPatternKey, Partial<VanityExtraFilterRule>>>,
): VanityExtraMatch | null => {
  const body = address.replace(/^0x/i, '').toLowerCase();
  const legacyMinRun = typeof minRunOrConfig === 'number' ? minRunOrConfig : 4;
  const filters = typeof minRunOrConfig === 'number'
    ? normalizeVanityExtraFilters(null, legacyMinRun)
    : normalizeVanityExtraFilters(minRunOrConfig);
  const matches: VanityExtraMatch[] = [];

  const head = getRun(body);
  const tail = getRun(body, true);
  const repeatMinRun = clampMinRun(filters.repeat.minRun, legacyMinRun);
  const bothMinRun = clampMinRun(filters.bothEnds.minRun, Math.max(3, legacyMinRun - 1));
  const hasHead = !!head.char && head.length >= repeatMinRun;
  const hasTail = !!tail.char && tail.length >= repeatMinRun;
  const hasBothHead = !!head.char && head.length >= bothMinRun;
  const hasBothTail = !!tail.char && tail.length >= bothMinRun;
  const overlappingRuns = hasBothHead && hasBothTail && head.length + tail.length > body.length;

  if (
    filters.bothEnds.enabled
    && hasBothHead
    && hasBothTail
    && isCharTypeMatch(head.value, filters.bothEnds.charType)
    && isCharTypeMatch(tail.value, filters.bothEnds.charType)
    && !overlappingRuns
  ) {
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
  }

  if (filters.repeat.enabled) {
    if (hasHead && isCharTypeMatch(head.value, filters.repeat.charType)) {
      matches.push({
        side: 'head',
        char: head.char,
        length: head.length,
        patternType: 'repeat',
        headRun: head.value,
        score: scoreRun(head.length, 'head'),
      });
    }
    if (hasTail && isCharTypeMatch(tail.value, filters.repeat.charType)) {
      matches.push({
        side: 'tail',
        char: tail.char,
        length: tail.length,
        patternType: 'repeat',
        tailRun: tail.value,
        score: scoreRun(tail.length, 'tail'),
      });
    }
  }

  const up = filters.sequenceUp.enabled ? longestEdgeSequence(body, 'up', filters.sequenceUp.charType) : null;
  if (up && up.length >= clampMinRun(filters.sequenceUp.minRun, legacyMinRun)) {
    matches.push({
      side: up.side,
      char: up.value[0] || '',
      length: up.length,
      patternType: 'sequence-up',
      [up.side === 'head' ? 'headRun' : 'tailRun']: up.value,
      score: up.length * 14 + (up.side === 'head' ? 8 : 7),
    });
  }

  const down = filters.sequenceDown.enabled ? longestEdgeSequence(body, 'down', filters.sequenceDown.charType) : null;
  if (down && down.length >= clampMinRun(filters.sequenceDown.minRun, legacyMinRun)) {
    matches.push({
      side: down.side,
      char: down.value[0] || '',
      length: down.length,
      patternType: 'sequence-down',
      [down.side === 'head' ? 'headRun' : 'tailRun']: down.value,
      score: down.length * 14 + (down.side === 'head' ? 8 : 7),
    });
  }

  const mirror = filters.mirror.enabled ? detectMirror(body, filters.mirror.charType) : null;
  if (mirror && mirror.length >= clampMinRun(filters.mirror.minRun, 3)) matches.push(mirror);

  const palindrome = filters.palindrome.enabled ? detectPalindrome(body, clampMinRun(filters.palindrome.minRun, 5), filters.palindrome.charType) : null;
  if (palindrome) matches.push(palindrome);

  const bracket = filters.bracket.enabled ? detectBracket(body, clampMinRun(filters.bracket.minRun, 3), filters.bracket.charType) : null;
  if (bracket) matches.push(bracket);

  const lucky = filters.lucky.enabled ? detectLucky(body, filters.lucky.patterns || DEFAULT_LUCKY_PATTERNS) : null;
  if (lucky) matches.push(lucky);

  const alternating = filters.alternating.enabled ? detectAlternating(body, clampMinRun(filters.alternating.minRun, 6), filters.alternating.charType) : null;
  if (alternating) matches.push(alternating);

  const numericTail = filters.numericTail.enabled ? detectNumericTail(body, clampMinRun(filters.numericTail.minRun, 4)) : null;
  if (numericTail) matches.push(numericTail);

  const lowDiversity = filters.lowDiversity.enabled ? detectLowDiversity(body, clampMinRun(filters.lowDiversity.minRun, 6)) : null;
  if (lowDiversity) matches.push(lowDiversity);

  return matches.sort(compareVanityExtraMatches)[0] || null;
};