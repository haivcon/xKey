import { VANITY_PREVIEW_FILL } from './constants';
import type { VanityExtraFilterPreview, VanityExtraFilterPreviewSegment } from './types';
import type { VanityExtraFilterRule, VanityExtraPatternKey } from '../../utils/vanityMatch';

const clampVanityPreviewLength = (value: unknown, fallback = 4) => Math.max(3, Math.min(12, Math.floor(Number(value) || fallback)));

const fitVanityPreviewBody = (body: string) => (body + VANITY_PREVIEW_FILL).slice(0, 40);

const makeVanityPreview = (
  body: string,
  highlights: Array<{ start: number; length: number }> | { start: number; length: number },
): VanityExtraFilterPreview => {
  const fitted = fitVanityPreviewBody(body.toLowerCase().replace(/[^0-9a-f]/g, ''));
  const normalized = (Array.isArray(highlights) ? highlights : [highlights])
    .map(({ start, length }) => ({
      start: Math.max(0, Math.min(fitted.length, start)),
      end: Math.max(0, Math.min(fitted.length, start + Math.max(1, length))),
    }))
    .filter(({ start, end }) => end > start)
    .sort((left, right) => left.start - right.start)
    .reduce<Array<{ start: number; end: number }>>((merged, current) => {
      const previous = merged[merged.length - 1];
      if (previous && current.start <= previous.end) {
        previous.end = Math.max(previous.end, current.end);
      } else {
        merged.push({ ...current });
      }
      return merged;
    }, []);
  const first = normalized[0] || { start: 0, end: 0 };
  const segments: VanityExtraFilterPreviewSegment[] = [];
  let cursor = 0;

  normalized.forEach(({ start, end }) => {
    if (start > cursor) segments.push({ text: fitted.slice(cursor, start) });
    segments.push({ text: fitted.slice(start, end), highlight: true });
    cursor = end;
  });
  if (cursor < fitted.length) segments.push({ text: fitted.slice(cursor) });

  return {
    before: `0x${fitted.slice(0, first.start)}`,
    highlight: fitted.slice(first.start, first.end),
    after: fitted.slice(first.end),
    segments: [{ text: '0x' }, ...segments],
  };
};

export const buildVanityExtraFilterPreview = (key: VanityExtraPatternKey, rule: VanityExtraFilterRule, fallbackMinRun: number): VanityExtraFilterPreview => {
  const minRun = clampVanityPreviewLength(rule.minRun, fallbackMinRun);
  const filler = VANITY_PREVIEW_FILL;
  const firstLucky =
    (rule.patterns || [])
      .map(pattern =>
        String(pattern)
          .replace(/^0x/i, '')
          .toLowerCase()
          .replace(/[^0-9a-f]/g, '')
          .slice(0, 12),
      )
      .find(pattern => pattern.length >= 2) || '888';

  switch (key) {
    case 'repeat': {
      const pattern = 'f'.repeat(minRun);
      return makeVanityPreview(`${pattern}${filler}`, { start: 0, length: pattern.length });
    }
    case 'sequenceUp': {
      const pattern = '123456789abcdef0'.slice(0, minRun);
      return makeVanityPreview(`${pattern}${filler}`, { start: 0, length: pattern.length });
    }
    case 'sequenceDown': {
      const pattern = 'fedcba9876543210'.slice(0, minRun);
      return makeVanityPreview(`${pattern}${filler}`, { start: 0, length: pattern.length });
    }
    case 'bothEnds': {
      const head = '8'.repeat(minRun);
      const tail = '1'.repeat(minRun);
      return makeVanityPreview(`${head}${filler.slice(0, 40 - head.length - tail.length)}${tail}`, [
        { start: 0, length: head.length },
        { start: 40 - tail.length, length: tail.length },
      ]);
    }
    case 'mirror': {
      const head = 'abcde0123456'.slice(0, minRun);
      const tail = [...head].reverse().join('');
      return makeVanityPreview(`${head}${filler.slice(0, 40 - head.length - tail.length)}${tail}`, [
        { start: 0, length: head.length },
        { start: 40 - tail.length, length: tail.length },
      ]);
    }
    case 'bracket': {
      const pattern = '123abc456def'.slice(0, minRun);
      return makeVanityPreview(`${pattern}${filler.slice(0, 40 - pattern.length * 2)}${pattern}`, [
        { start: 0, length: pattern.length },
        { start: 40 - pattern.length, length: pattern.length },
      ]);
    }
    case 'palindrome': {
      const half = 'ab8c9d'.slice(0, Math.ceil(minRun / 2));
      const pattern = (half + [...half].reverse().join('')).slice(0, minRun);
      return makeVanityPreview(`${pattern}${filler}`, { start: 0, length: pattern.length });
    }
    case 'alternating': {
      const pattern = Array.from({ length: minRun }, (_, index) => (index % 2 === 0 ? 'a' : 'b')).join('');
      return makeVanityPreview(`${pattern}${filler}`, { start: 0, length: pattern.length });
    }
    case 'lucky':
    default:
      return makeVanityPreview(`${filler.slice(0, 10)}${firstLucky}${filler}`, { start: 10, length: firstLucky.length });
  }
};