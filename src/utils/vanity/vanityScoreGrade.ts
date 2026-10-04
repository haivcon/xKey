import type { Wallet } from '../../types';
import type { TranslationFn } from '../../contexts/LanguageContext';
import { detectExtraVanityMatch, scoreVanityBits, scoreVanityMatch, VANITY_SCORE_VERSION, type VanityExtraMatch, type VanityExtraPatternType } from './vanityMatch';

export const VANITY_SCORE_DISPLAY_THRESHOLD = 30;

export type VanityScoreGrade = 'S' | 'A' | 'B' | 'C';

export type VanityScoreMetadata = {
  vanityMatchType: 'main' | 'extra';
  vanityRepeatSide?: 'head' | 'tail' | 'both';
  vanityRepeatChar?: string;
  vanityRepeatLength?: number;
  vanityScore: number;
  vanityScoreVersion: number;
  vanityHeadRun?: string;
  vanityTailRun?: string;
  vanityPatternType?: VanityExtraPatternType;
  vanityMatchStart?: number;
};

export const getVanityScoreGrade = (score = 0): VanityScoreGrade => {
  if (score >= 90) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  return 'C';
};

export const getVanityScoreGradeLabel = (score: number, t: TranslationFn): string => {
  const grade = getVanityScoreGrade(score);
  return grade === 'S' ? t('createWallet.vanityGradeRare', { grade }) : grade;
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

export const getVanityPatternLabel = (patternType: VanityExtraPatternType | undefined, side: string | undefined, t: TranslationFn): string => {
  const keys: Record<VanityExtraPatternType, string> = {
    repeat: 'repeat', 'sequence-up': 'sequenceUp', 'sequence-down': 'sequenceDown',
    mirror: 'mirror', palindrome: 'palindrome', bracket: 'bracket', lucky: 'lucky',
    alternating: 'alternating', 'numeric-tail': 'numericTail', 'low-diversity': 'lowDiversity',
  };
  const pattern = patternType ? t(`createWallet.vanityExtraFilter_${keys[patternType]}`) : t('actionBar.vanityScore');
  const sideLabel = side === 'head' ? t('createWallet.vanityPrefix')
    : side === 'tail' ? t('createWallet.vanitySuffix')
      : side === 'both' ? `${t('createWallet.vanityPrefix')} / ${t('createWallet.vanitySuffix')}` : '';
  return sideLabel ? `${pattern} (${sideLabel})` : pattern;
};

export const getVanityScoreReason = (wallet: Pick<Wallet, 'vanityPatternType' | 'vanityRepeatSide' | 'vanityRepeatChar' | 'vanityRepeatLength' | 'vanityHeadRun' | 'vanityTailRun'>, t: TranslationFn): string => {
  const pattern = getVanityPatternLabel(wallet.vanityPatternType, wallet.vanityRepeatSide, t);
  const runs = [
    wallet.vanityHeadRun ? `${t('createWallet.vanityPrefix')}: ${wallet.vanityHeadRun}` : '',
    wallet.vanityTailRun ? `${t('createWallet.vanitySuffix')}: ${wallet.vanityTailRun}` : '',
  ].filter(Boolean);

  if (runs.length) return `${pattern}: ${runs.join(' · ')}`;
  if (wallet.vanityRepeatChar && wallet.vanityRepeatLength) {
    const value = wallet.vanityPatternType === 'lucky'
      ? wallet.vanityRepeatChar
      : wallet.vanityPatternType === 'repeat' && wallet.vanityRepeatChar.length === 1
        ? wallet.vanityRepeatChar.repeat(wallet.vanityRepeatLength)
        : wallet.vanityRepeatChar;
    return `${pattern}: ${value}`;
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
  vanityScoreVersion: VANITY_SCORE_VERSION,
  vanityHeadRun: match.headRun,
  vanityTailRun: match.tailRun,
  vanityPatternType: match.patternType,
  vanityMatchStart: match.matchStart,
});

export const primaryVanityScoreMetadata = (prefix: string, suffix: string): VanityScoreMetadata => ({
  vanityMatchType: 'main',
  vanityScoreVersion: VANITY_SCORE_VERSION,
  vanityScore: scoreVanityBits(4 * Math.min(40, prefix.length + suffix.length)),
  vanityHeadRun: prefix || undefined,
  vanityTailRun: suffix || undefined,
  vanityRepeatSide: prefix && suffix ? 'both' : prefix ? 'head' : 'tail',
  vanityPatternType: undefined,
  vanityRepeatChar: undefined,
  vanityRepeatLength: undefined,
  vanityMatchStart: undefined,
});

export const inferVanityScoreMetadata = (wallet: Partial<Wallet>): VanityScoreMetadata | null => {
  if (!wallet.address) return null;
  // Preserve known primary highlights; old mixed extra metadata cannot prove a primary target.
  if (wallet.vanityMatchType === 'main') {
    if (wallet.vanityPatternType) return null;
    const body = wallet.address.replace(/^0x/i, '').toLowerCase();
    const head = wallet.vanityHeadRun?.toLowerCase() || '';
    const tail = wallet.vanityTailRun?.toLowerCase() || '';
    if ((!head && !tail) || !body.startsWith(head) || !body.endsWith(tail)) return null;
    return primaryVanityScoreMetadata(head, tail);
  }
  if (wallet.vanityPatternType && wallet.vanityRepeatLength) {
    const match: VanityExtraMatch = {
      side: wallet.vanityRepeatSide || 'head', char: wallet.vanityRepeatChar || '',
      length: wallet.vanityRepeatLength, patternType: wallet.vanityPatternType,
      headRun: wallet.vanityHeadRun, tailRun: wallet.vanityTailRun,
      matchStart: wallet.vanityMatchStart, score: 0,
    };
    return toVanityScoreMetadata({ ...match, score: scoreVanityMatch(match) });
  }
  const match = detectExtraVanityMatch(wallet.address, 3);
  if (!match || match.score < VANITY_SCORE_DISPLAY_THRESHOLD) return null;
  return toVanityScoreMetadata(match, wallet.vanityMatchType || 'extra');
};