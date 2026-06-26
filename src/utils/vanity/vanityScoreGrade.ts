import type { Wallet } from '../../types';
import { detectExtraVanityMatch, type VanityExtraMatch, type VanityExtraPatternType } from './vanityMatch';

export const VANITY_SCORE_DISPLAY_THRESHOLD = 30;

export type VanityScoreGrade = 'S' | 'A' | 'B' | 'C';

export type VanityScoreMetadata = {
  vanityMatchType: 'main' | 'extra';
  vanityRepeatSide?: 'head' | 'tail' | 'both';
  vanityRepeatChar?: string;
  vanityRepeatLength?: number;
  vanityScore: number;
  vanityHeadRun?: string;
  vanityTailRun?: string;
  vanityPatternType?: VanityExtraPatternType;
};

export const getVanityScoreGrade = (score = 0): VanityScoreGrade => {
  if (score >= 90) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  return 'C';
};

export const getVanityScoreGradeLabel = (score = 0): string => {
  const grade = getVanityScoreGrade(score);
  return grade === 'S' ? 'S / Rare' : grade;
};

export const getVanityScoreTone = (score = 0): string => {
  if (score >= 90) {
    return 'border-cyan-300/50 bg-cyan-500/20 text-cyan-700 shadow-[0_0_8px_rgba(6,182,212,0.4)] dark:text-cyan-100 dark:shadow-[0_0_12px_rgba(6,182,212,0.3)] font-bold';
  }
  if (score >= 70) {
    return 'border-blue-400/40 bg-blue-500/15 text-blue-700 shadow-[0_0_6px_rgba(59,130,246,0.2)] dark:text-blue-200 font-semibold';
  }
  if (score >= 50) {
    return 'border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }
  return 'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300 opacity-80';
};

export const getVanityPatternLabel = (patternType?: string, side?: string): string => {
  const sideLabel = side === 'head' ? 'head' : side === 'tail' ? 'tail' : side === 'both' ? 'both ends' : '';
  switch (patternType) {
    case 'repeat':
      return sideLabel ? `Repeat ${sideLabel}` : 'Repeat';
    case 'sequence-up':
      return sideLabel ? `Sequence ↑ ${sideLabel}` : 'Sequence ↑';
    case 'sequence-down':
      return sideLabel ? `Sequence ↓ ${sideLabel}` : 'Sequence ↓';
    case 'mirror':
      return 'Mirror';
    case 'palindrome':
      return sideLabel ? `Palindrome ${sideLabel}` : 'Palindrome';
    case 'bracket':
      return 'Bracket';
    case 'lucky':
      return 'Lucky';
    case 'alternating':
      return sideLabel ? `Alternating ${sideLabel}` : 'Alternating';
    default:
      return sideLabel ? `Vanity ${sideLabel}` : 'Vanity';
  }
};

export const getVanityScoreReason = (wallet: Pick<Wallet, 'vanityPatternType' | 'vanityRepeatSide' | 'vanityRepeatChar' | 'vanityRepeatLength' | 'vanityHeadRun' | 'vanityTailRun'>): string => {
  const pattern = getVanityPatternLabel(wallet.vanityPatternType, wallet.vanityRepeatSide);
  const runs = [
    wallet.vanityHeadRun ? `Head ${wallet.vanityHeadRun}` : '',
    wallet.vanityTailRun ? `Tail ${wallet.vanityTailRun}` : '',
  ].filter(Boolean);

  if (runs.length) return `${pattern}: ${runs.join(' · ')}`;
  if (wallet.vanityRepeatChar && wallet.vanityRepeatLength) {
    return `${pattern}: ${wallet.vanityRepeatChar.repeat(wallet.vanityRepeatLength)}`;
  }
  return pattern;
};

export const shouldShowVanityScore = (
  wallet: Pick<Wallet, 'vanityMatchType' | 'vanityScore'>,
  showWalletScores = true,
): boolean => {
  if (!showWalletScores || !wallet.vanityMatchType || typeof wallet.vanityScore !== 'number') return false;
  return wallet.vanityScore >= VANITY_SCORE_DISPLAY_THRESHOLD || wallet.vanityMatchType === 'extra';
};

export const toVanityScoreMetadata = (
  match: VanityExtraMatch,
  matchType: 'main' | 'extra' = 'extra',
): VanityScoreMetadata => ({
  vanityMatchType: matchType,
  vanityRepeatSide: match.side,
  vanityRepeatChar: match.char,
  vanityRepeatLength: match.length,
  vanityScore: match.score,
  vanityHeadRun: match.headRun,
  vanityTailRun: match.tailRun,
  vanityPatternType: match.patternType,
});

export const inferVanityScoreMetadata = (wallet: Pick<Wallet, 'address' | 'vanityMatchType'>): VanityScoreMetadata | null => {
  if (!wallet.address) return null;
  const match = detectExtraVanityMatch(wallet.address, 3);
  if (!match || match.score < VANITY_SCORE_DISPLAY_THRESHOLD) return null;
  return toVanityScoreMetadata(match, wallet.vanityMatchType || 'extra');
};