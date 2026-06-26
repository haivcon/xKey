import { Preferences } from '@capacitor/preferences';
import {
  NETWORKS,
  VANITY_EXTRA_MIN_RUNS,
  VANITY_HEX_PATTERN,
  VANITY_SETTINGS_KEY,
} from '../../components/create-wallet/constants';
import type {
  VanityPerformanceMode,
  VanitySettings,
} from '../../components/create-wallet/types';
import {
  DEFAULT_VANITY_EXTRA_FILTERS,
  normalizeVanityExtraFilters,
  type VanityExtraFilterConfig,
} from '../../utils/vanity/vanityMatch';

export type VanitySettingsSnapshot = {
  targetCount: number;
  timeLimit: number;
  network: string;
  folder: string;
  captureExtras: boolean;
  extraMinRun: number;
  extraLimit: number;
  extraFilters: VanityExtraFilterConfig;
  extraFolder: string;
  performanceMode: VanityPerformanceMode;
  generationMode: 'privateKey' | 'mnemonic';
  mnemonicWords: 12 | 24;
  customPatterns: string[];
};

export type VanitySettingsSetters = {
  setVanityTargetCount: (value: number) => void;
  setVanityTimeLimit: (value: number) => void;
  setVanityNetwork: (value: string) => void;
  setVanityFolder: (value: string) => void;
  setVanityCaptureExtras: (value: boolean) => void;
  setVanityExtraMinRun: (value: number) => void;
  setVanityExtraLimit: (value: number) => void;
  setVanityExtraFilters: (value: VanityExtraFilterConfig) => void;
  setVanityExtraFolder: (value: string) => void;
  setVanityPerformanceMode: (value: VanityPerformanceMode) => void;
  setVanityGenerationMode: (value: 'privateKey' | 'mnemonic') => void;
  setVanityMnemonicWords: (value: 12 | 24) => void;
  setVanityCustomPatterns: (value: string[]) => void;
};

export const sanitizeVanityCustomPatterns = (patterns: unknown): string[] => {
  if (!Array.isArray(patterns)) return [];
  return [
    ...new Set(
      patterns
        .map(pattern => String(pattern).replace(/\s/g, '').toLowerCase().slice(0, 12))
        .filter(pattern => pattern && VANITY_HEX_PATTERN.test(pattern))
    ),
  ].slice(-12);
};

export const loadVanitySettings = async (
  setters: VanitySettingsSetters,
  activeRef: { current: boolean }
): Promise<void> => {
  const { value } = await Preferences.get({ key: VANITY_SETTINGS_KEY });
  if (!value || !activeRef.current) return;

  const settings = JSON.parse(value) as VanitySettings;
  if (settings.targetCount)
    setters.setVanityTargetCount(Math.max(1, Math.floor(Number(settings.targetCount) || 1)));
  if (typeof settings.timeLimit === 'number')
    setters.setVanityTimeLimit(Math.max(0, Math.floor(settings.timeLimit)));
  if (settings.network && NETWORKS.includes(settings.network))
    setters.setVanityNetwork(settings.network);
  if (settings.folder) setters.setVanityFolder(settings.folder);
  if (typeof settings.captureExtras === 'boolean')
    setters.setVanityCaptureExtras(settings.captureExtras);
  if (settings.extraMinRun && VANITY_EXTRA_MIN_RUNS.includes(settings.extraMinRun))
    setters.setVanityExtraMinRun(settings.extraMinRun);
  if (settings.extraLimit)
    setters.setVanityExtraLimit(Math.max(1, Math.min(500, settings.extraLimit)));
  if (settings.extraFilters)
    setters.setVanityExtraFilters(
      normalizeVanityExtraFilters(settings.extraFilters, settings.extraMinRun || 4)
    );
  else setters.setVanityExtraFilters(normalizeVanityExtraFilters(DEFAULT_VANITY_EXTRA_FILTERS));
  if (settings.extraFolder) setters.setVanityExtraFolder(settings.extraFolder);
  if (
    settings.performanceMode === 'eco' ||
    settings.performanceMode === 'balanced' ||
    settings.performanceMode === 'fast'
  )
    setters.setVanityPerformanceMode(settings.performanceMode);
  if (settings.generationMode === 'privateKey' || settings.generationMode === 'mnemonic')
    setters.setVanityGenerationMode(settings.generationMode);
  if (settings.mnemonicWords === 12 || settings.mnemonicWords === 24)
    setters.setVanityMnemonicWords(settings.mnemonicWords);
  setters.setVanityCustomPatterns(sanitizeVanityCustomPatterns(settings.customPatterns));
};

export const persistVanitySettings = async (
  snapshot: VanitySettingsSnapshot
): Promise<void> => {
  await Preferences.set({
    key: VANITY_SETTINGS_KEY,
    value: JSON.stringify({
      targetCount: snapshot.targetCount,
      timeLimit: snapshot.timeLimit,
      network: snapshot.network,
      folder: snapshot.folder,
      captureExtras: snapshot.captureExtras,
      extraMinRun: snapshot.extraMinRun,
      extraLimit: snapshot.extraLimit,
      extraFilters: snapshot.extraFilters,
      extraFolder: snapshot.extraFolder,
      performanceMode: snapshot.performanceMode,
      generationMode: snapshot.generationMode,
      mnemonicWords: snapshot.mnemonicWords,
      customPatterns: snapshot.customPatterns,
    } satisfies VanitySettings),
  });
};