import type { VanityExtraPatternKey } from '../../utils/vanityMatch';

export const NETWORKS = ['XLAYER', 'ETH', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Solana', 'Tron', 'Base'];

export const VANITY_PRESET_GROUPS = [
  { key: 'lucky', labelKey: 'vanityPresetLucky', icon: '🍀', items: ['888', '999', '666', '168', '369'] },
  { key: 'easy', labelKey: 'vanityPresetEasy', icon: '✨', items: ['123', '321', 'abc', 'cafe', 'babe'] },
  { key: 'premium', labelKey: 'vanityPresetPremium', icon: '💎', items: ['0000', '1111', '8888'] },
  { key: 'symmetry', labelKey: 'vanityPresetSymmetry', icon: '↔', items: ['aba', 'abba', 'c0c'] },
  { key: 'crypto', labelKey: 'vanityPresetCrypto', icon: '₿', items: ['defi', 'b0b', 'bad', 'feed', 'dead'] },
];

export const VANITY_HEX_PATTERN = /^[0-9a-f]*$/i;
export const VANITY_MAX_SAFE_LENGTH = 6;
export const VANITY_TIME_LIMITS = [60, 300, 600, 0];
export const VANITY_DEFAULT_FOLDER = 'Vanity Wallets';
export const VANITY_EXTRA_DEFAULT_FOLDER = 'Extra Vanity Wallets';
export const VANITY_EXTRA_LIMITS = [10, 25, 50, 100];
export const VANITY_EXTRA_MIN_RUNS = [3, 4, 5, 6];
export const VANITY_SETTINGS_KEY = 'xkey_vanity_settings_v1';
export const VANITY_SESSION_KEY = 'xkey_vanity_session_v1';
export const VANITY_EXTRA_FILTER_KEYS: VanityExtraPatternKey[] = ['repeat', 'sequenceUp', 'sequenceDown', 'bothEnds', 'mirror', 'bracket', 'palindrome', 'alternating', 'lucky'];

export const MATH_THEMES = [
  { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', label: 'text-blue-300', contentBorder: 'border-blue-500/20' },
  { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', label: 'text-purple-300', contentBorder: 'border-purple-500/20' },
  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', label: 'text-emerald-300', contentBorder: 'border-emerald-500/20' },
  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', label: 'text-amber-300', contentBorder: 'border-amber-500/20' },
  { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400', label: 'text-orange-300', contentBorder: 'border-orange-500/20' },
  { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400', label: 'text-pink-300', contentBorder: 'border-pink-500/20' },
  { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', label: 'text-rose-300', contentBorder: 'border-rose-500/20' },
];

export const VANITY_PREVIEW_FILL = 'a9c4e2b705d13f86c0a9d4e7b2c5f1089ab3c6d0';