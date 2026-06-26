import type { GeneratedWallet, VanityPerformanceMode } from '../../components/create-wallet/types';

export type VanityDifficultyKey = 'easy' | 'medium' | 'hard' | 'extreme';

export type VanityDifficultyAnalyzer = {
  combinations: number;
  timeLabel: string;
  diffTone: string;
  difficultyBadgeTone: string;
  difficultyLabel: string;
  hasBoth: boolean;
  effectiveSpeed: number;
  sourceLabel: string;
};

type Translate = (key: string, vars?: unknown) => string;

export const getVanityDifficultyKey = (patternLength: number): VanityDifficultyKey => (
  patternLength <= 2
    ? 'easy'
    : patternLength <= 4
      ? 'medium'
      : patternLength <= 6
        ? 'hard'
        : 'extreme'
);

export const getVanityDifficultyTone = (difficultyKey: VanityDifficultyKey): string => ({
  easy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  hard: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
  extreme: 'bg-red-500/10 text-red-300 border-red-500/25',
})[difficultyKey];

export const getVanityBatchSize = (
  performanceMode: VanityPerformanceMode,
  liteModeActive: boolean,
  generationMode: 'privateKey' | 'mnemonic' = 'privateKey',
  mnemonicWords: 12 | 24 = 12
): number => {
  if (generationMode === 'mnemonic') {
    if (mnemonicWords === 24) {
      return performanceMode === 'eco'
        ? 8
        : performanceMode === 'fast'
          ? 32
          : 16;
    }

    return performanceMode === 'eco'
      ? 16
      : performanceMode === 'fast'
        ? 64
        : 32;
  }

  if (liteModeActive) {
    return performanceMode === 'eco'
      ? 128
      : performanceMode === 'fast'
        ? 2048
        : 512;
  }

  return performanceMode === 'eco'
    ? 256
    : performanceMode === 'fast'
      ? 4096
      : 1024;
};

export const getVanityWorkerCount = (
  performanceMode: VanityPerformanceMode,
  hardwareConcurrency = 2
): number => (
  performanceMode === 'eco'
    ? 1
    : Math.max(
        1,
        Math.min(
          performanceMode === 'fast' ? 8 : 4,
          Math.max(
            1,
            Math.floor(hardwareConcurrency * (performanceMode === 'fast' ? 1 : 0.6))
          )
        )
      )
);

export const createVanityDifficultyAnalyzer = ({
  t,
  patternLength,
  speed,
  prefix,
  suffix,
  hasPattern,
  generationMode,
  mnemonicWords,
}: {
  t: Translate;
  patternLength: number;
  speed: number;
  prefix: string;
  suffix: string;
  hasPattern: boolean;
  generationMode: 'privateKey' | 'mnemonic';
  mnemonicWords: 12 | 24;
}): VanityDifficultyAnalyzer | null => {
  if (!hasPattern) return null;

  const hasBoth = prefix.length > 0 && suffix.length > 0;
  const combinations = Math.pow(16, patternLength);
  const generationCostFactor = generationMode === 'mnemonic' ? (mnemonicWords === 24 ? 50 : 25) : 1;
  const effectiveSpeed = Math.max(1, speed > 0 ? speed : Math.floor(25000 / generationCostFactor));
  const timeInSeconds = combinations / effectiveSpeed;
  const timeLabel =
    timeInSeconds < 60
      ? t('createWallet.vanityTimeSeconds', { seconds: Math.ceil(timeInSeconds) })
      : timeInSeconds < 3600
        ? t('createWallet.vanityTimeMinutes', { minutes: Math.ceil(timeInSeconds / 60) })
        : timeInSeconds < 86400
          ? t('createWallet.vanityTimeHours', { hours: (timeInSeconds / 3600).toFixed(1) })
          : timeInSeconds < 31536000
            ? t('createWallet.vanityTimeDays', { days: (timeInSeconds / 86400).toFixed(1) })
            : t('createWallet.vanityTimeOverYear');

  let diffTone =
    'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/30';
  let difficultyBadgeTone =
    'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/25';
  let difficultyLabel = t('createWallet.vanityDifficultyEasy');

  if (patternLength >= 8 || timeInSeconds > 86400) {
    diffTone =
      'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-500/30';
    difficultyBadgeTone =
      'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/25';
    difficultyLabel = t('createWallet.vanityDifficultyExtreme');
  } else if (patternLength >= 6 || timeInSeconds > 3600) {
    diffTone =
      'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-500/30';
    difficultyBadgeTone =
      'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:border-orange-400/25';
    difficultyLabel = t('createWallet.vanityDifficultyHard');
  } else if (patternLength >= 4 || timeInSeconds > 60) {
    diffTone =
      'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-500/30';
    difficultyBadgeTone =
      'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/25';
    difficultyLabel = t('createWallet.vanityDifficultyMedium');
  }

  const sourceLabel =
    generationMode === 'mnemonic'
      ? t('createWallet.vanitySourceMnemonic', { words: mnemonicWords })
      : t('createWallet.vanitySourcePrivateKey');

  return {
    combinations,
    timeLabel,
    diffTone,
    difficultyBadgeTone,
    difficultyLabel,
    hasBoth,
    effectiveSpeed,
    sourceLabel,
  };
};

export const getVanityExtraLabel = (
  wallet: GeneratedWallet,
  t: Translate
): string => {
  if (wallet.vanityPatternType === 'sequence-up') {
    return t('createWallet.vanityExtraSequenceUp', { pattern: wallet.vanityRepeatChar || '-' });
  }
  if (wallet.vanityPatternType === 'sequence-down') {
    return t('createWallet.vanityExtraSequenceDown', { pattern: wallet.vanityRepeatChar || '-' });
  }
  if (wallet.vanityPatternType === 'mirror') {
    return t('createWallet.vanityExtraMirror', { pattern: wallet.vanityRepeatChar || '-' });
  }
  if (wallet.vanityPatternType === 'palindrome') {
    return t('createWallet.vanityExtraPalindrome', { pattern: wallet.vanityRepeatChar || '-' });
  }
  if (wallet.vanityPatternType === 'bracket') {
    return t('createWallet.vanityExtraBracket', { pattern: wallet.vanityRepeatChar || '-' });
  }
  if (wallet.vanityPatternType === 'lucky') {
    return t('createWallet.vanityExtraLucky', { pattern: wallet.vanityRepeatChar || '-' });
  }
  if (wallet.vanityPatternType === 'alternating') {
    return t('createWallet.vanityExtraAlternating', { pattern: wallet.vanityRepeatChar || '-' });
  }
  if (wallet.vanityRepeatSide === 'both') {
    return t('createWallet.vanityExtraBoth', {
      head: wallet.vanityHeadRun || '-',
      tail: wallet.vanityTailRun || '-',
    });
  }

  const sideKey =
    wallet.vanityRepeatSide === 'head'
      ? 'createWallet.vanityExtraHead'
      : 'createWallet.vanityExtraTail';
  const repeat = `${wallet.vanityRepeatChar || ''}`.repeat(
    Math.max(0, wallet.vanityRepeatLength || 0)
  );

  return t(sideKey, { pattern: repeat || '-' });
};