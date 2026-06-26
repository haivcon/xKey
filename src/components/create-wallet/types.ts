import type { ReactNode } from 'react';
import type { Wallet as WalletModel } from '../../types';
import type { VanityExtraFilterRule, VanityExtraPatternKey } from '../../utils/vanity/vanityMatch';

export type SelectOption = { value: string; label: ReactNode };
export type CreateWalletTab = 'manual' | 'generate' | 'hdTree' | 'vanity' | 'advancedEntropy';

export type GeneratedWallet = WalletModel & {
  mnemonic?: string;
  derivationPath?: string;
  path?: string;
  hdAccount?: number;
  hdIndex?: number;
  hdCoinType?: number;
  hdNetwork?: string;
  hdRootType?: string;
  vanityMatchType?: 'main' | 'primary' | 'extra';
  vanityRepeatSide?: 'head' | 'tail' | 'both';
  vanityRepeatChar?: string;
  vanityRepeatLength?: number;
  vanityScore?: number;
  vanityHeadRun?: string;
  vanityTailRun?: string;
  vanityPatternType?: string;
};

export type FloatingEffect = { key: number; count: number; address?: string };
export type VanityCandidate = { address: string; matched: boolean };
export type StorageInfo = { estimatedSize?: number; available?: number; quota?: number; usage?: number };
export type BulkResult = { count: number; sizeBytes?: number; storageInfo?: StorageInfo } | null;

export type VanityPerformanceMode = 'eco' | 'balanced' | 'fast';

export type VanitySettings = {
  targetCount?: number;
  timeLimit?: number;
  network?: string;
  folder?: string;
  captureExtras?: boolean;
  extraMinRun?: number;
  extraLimit?: number;
  extraFilters?: Partial<Record<VanityExtraPatternKey, Partial<VanityExtraFilterRule>>>;
  extraFolder?: string;
  performanceMode?: VanityPerformanceMode;
  generationMode?: 'privateKey' | 'mnemonic';
  mnemonicWords?: 12 | 24;
  customPatterns?: string[];
};

export type VanitySessionState = {
  prefix: string;
  suffix: string;
  scanned: number;
  elapsed: number;
  targetCount: number;
  timeLimit: number;
  network: string;
  folder: string;
  captureExtras: boolean;
  extraMinRun: number;
  extraLimit: number;
  extraFilters?: Partial<Record<VanityExtraPatternKey, Partial<VanityExtraFilterRule>>>;
  extraFolder: string;
  tags: string[];
  performanceMode: VanityPerformanceMode;
  generationMode?: 'privateKey' | 'mnemonic';
  mnemonicWords?: 12 | 24;
  candidates: VanityCandidate[];
  extraWallets: GeneratedWallet[];
  selectedAddresses: string[];
  savedAddresses: string[];
};

export type MathStep = { title: string; task: string; result: string; type?: string };

export type CreateWalletModalProps = {
  onClose: () => void;
  onSave: (wallet: GeneratedWallet | GeneratedWallet[]) => Promise<GeneratedWallet | GeneratedWallet[] | void> | GeneratedWallet | GeneratedWallet[] | void;
  existingWallets?: WalletModel[];
  folders?: string[];
  activeFolder?: string;
  allTags?: string[];
  aesKey: string;
  registerCloseHandler?: (handler: (() => void | Promise<void>) | null) => void;
};

export type VanityExtraFilterPreviewSegment = {
  text: string;
  highlight?: boolean;
};

export type VanityExtraFilterPreview = {
  before: string;
  highlight: string;
  after: string;
  segments: VanityExtraFilterPreviewSegment[];
};