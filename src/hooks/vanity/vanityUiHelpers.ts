import type { VanityExtraFilterConfig, VanityExtraPatternKey } from '../../utils/vanity/vanityMatch';
import {
  VANITY_DEFAULT_FOLDER,
  VANITY_EXTRA_DEFAULT_FOLDER,
  VANITY_EXTRA_FILTER_KEYS,
  VANITY_PRESET_GROUPS,
} from '../../components/create-wallet/constants';

export type VanityOption = {
  value: string;
  label: string;
};

export const getUsableVanityFolders = (folders: string[]) =>
  folders.filter(folder => folder && folder !== 'All');

export const getVisibleVanityPresetGroups = (expanded: boolean) =>
  expanded ? VANITY_PRESET_GROUPS : VANITY_PRESET_GROUPS.slice(0, 2);

export const getVanityHiddenPresetCount = (visiblePresetCount: number) =>
  Math.max(0, VANITY_PRESET_GROUPS.length - visiblePresetCount);

export const buildVanityFolderOptions = (
  usableFolders: string[],
  defaultLabel: string
): VanityOption[] => [
  { value: VANITY_DEFAULT_FOLDER, label: defaultLabel },
  ...usableFolders
    .filter(folder => folder !== VANITY_DEFAULT_FOLDER)
    .map(folder => ({ value: folder, label: folder })),
];

export const buildVanityExtraFolderOptions = (
  usableFolders: string[],
  defaultLabel: string
): VanityOption[] => [
  { value: VANITY_EXTRA_DEFAULT_FOLDER, label: defaultLabel },
  ...usableFolders
    .filter(folder => folder !== VANITY_EXTRA_DEFAULT_FOLDER)
    .map(folder => ({ value: folder, label: folder })),
];

export const getVanityOptionLabel = (options: VanityOption[], value: string) =>
  options.find(option => option.value === value)?.label ?? value;

export const getEnabledVanityExtraFilterCount = (filters: VanityExtraFilterConfig) =>
  VANITY_EXTRA_FILTER_KEYS.filter(
    key => filters[key as VanityExtraPatternKey]?.enabled
  ).length;

export const formatVanityStorageSummary = (
  targetCount: number,
  network: string,
  folderLabel: string
) => `${targetCount} · ${network} · ${folderLabel}`;

export const formatVanityExtraSummary = ({
  captureExtras,
  extraLimit,
  enabledFilterCount,
  totalFilterCount = VANITY_EXTRA_FILTER_KEYS.length,
  extraFolderLabel,
  disabledLabel,
}: {
  captureExtras: boolean;
  extraLimit: number;
  enabledFilterCount: number;
  totalFilterCount?: number;
  extraFolderLabel: string;
  disabledLabel: string;
}) =>
  captureExtras
    ? `${extraLimit} · ${enabledFilterCount}/${totalFilterCount} · ${extraFolderLabel}`
    : disabledLabel;