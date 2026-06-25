import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as CapacitorApp } from '@capacitor/app';
import { X, Plus, Copy, Check, Wallet, RefreshCw, Keyboard, AlertTriangle, Info, Camera, ChevronDown, Gauge, Timer, ShieldCheck, Sparkles, Folder, Tag, Trees, Pause, Play, Square, KeyRound, Maximize2, Minimize2, Save, Trash2, Star, BrainCircuit, AlertCircle, Target } from 'lucide-react';
import { ethers } from 'ethers';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import { useConfirm } from '../contexts/ConfirmContext';
import QRScannerModal from './QRScannerModal';
import PasswordInput from './PasswordInput';
import SecureTextarea from './SecureTextarea';
import HDWalletTreeVisualizer from './HDWalletTreeVisualizer';
import { formatAmountInput, normalizeAmountInput } from '../utils/amountFormat';
import { APP_ACTIVITY_EVENT } from '../hooks/useAutoLock';
import { deleteInternalText, parseInternalTextRef, readInternalText, serializeInternalTextRef, writeInternalText } from '../utils/internalTextStore';
import { createPostQuantumEnvelope, DEFAULT_ROTATION_MONTHS } from '../utils/keyHealth';
import type { Wallet as WalletModel } from '../types';
import AdvancedEntropyPanel from './entropy/AdvancedEntropyPanel';
import {
  DEFAULT_VANITY_EXTRA_FILTERS,
  normalizeVanityExtraFilters,
  type VanityExtraFilterConfig,
  type VanityExtraFilterRule,
  type VanityExtraPatternKey,
} from '../utils/vanityMatch';

const NETWORKS = ['XLAYER', 'ETH', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Solana', 'Tron', 'Base'];
const VANITY_PRESET_GROUPS = [
  { key: 'lucky', labelKey: 'vanityPresetLucky', icon: '🍀', items: ['888', '999', '666', '168', '369'] },
  { key: 'easy', labelKey: 'vanityPresetEasy', icon: '✨', items: ['123', '321', 'abc', 'cafe', 'babe'] },
  { key: 'premium', labelKey: 'vanityPresetPremium', icon: '💎', items: ['0000', '1111', '8888'] },
  { key: 'symmetry', labelKey: 'vanityPresetSymmetry', icon: '↔', items: ['aba', 'abba', 'c0c'] },
  { key: 'crypto', labelKey: 'vanityPresetCrypto', icon: '₿', items: ['defi', 'b0b', 'bad', 'feed', 'dead'] }
];
const VANITY_HEX_PATTERN = /^[0-9a-f]*$/i;
const VANITY_MAX_SAFE_LENGTH = 6;
const VANITY_TIME_LIMITS = [60, 300, 600, 0];
const VANITY_DEFAULT_FOLDER = 'Vanity Wallets';
const VANITY_EXTRA_DEFAULT_FOLDER = 'Extra Vanity Wallets';
const VANITY_EXTRA_LIMITS = [10, 25, 50, 100];
const VANITY_EXTRA_MIN_RUNS = [3, 4, 5, 6];
const VANITY_SETTINGS_KEY = 'xkey_vanity_settings_v1';
const VANITY_SESSION_KEY = 'xkey_vanity_session_v1';
const VANITY_EXTRA_FILTER_KEYS: VanityExtraPatternKey[] = ['repeat', 'sequenceUp', 'sequenceDown', 'bothEnds', 'mirror', 'bracket', 'palindrome', 'alternating', 'lucky'];

type SelectOption = { value: string; label: ReactNode };
type CreateWalletTab = 'manual' | 'generate' | 'hdTree' | 'vanity' | 'advancedEntropy';
type GeneratedWallet = WalletModel & {
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
type FloatingEffect = { key: number; count: number; address?: string };
type VanityCandidate = { address: string; matched: boolean };
type StorageInfo = { estimatedSize?: number; available?: number; quota?: number; usage?: number };
type BulkResult = { count: number; sizeBytes?: number; storageInfo?: StorageInfo } | null;
type VanitySettings = {
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
type VanityPerformanceMode = 'eco' | 'balanced' | 'fast';
type VanitySessionState = {
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
type MathStep = { title: string; task: string; result: string; type?: string };
type CreateWalletModalProps = {
  onClose: () => void;
  onSave: (wallet: GeneratedWallet | GeneratedWallet[]) => Promise<GeneratedWallet | GeneratedWallet[] | void> | GeneratedWallet | GeneratedWallet[] | void;
  existingWallets?: WalletModel[];
  folders?: string[];
  activeFolder?: string;
  allTags?: string[];
  aesKey: string;
  registerCloseHandler?: (handler: (() => void | Promise<void>) | null) => void;
};

const formatCompactNumber = (value: number) => {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(value);
  }
};

const formatVanitySeconds = (seconds: number | string) => {
  const safeSeconds = Number(seconds) || 0;
  if (safeSeconds < 60) return `${safeSeconds.toFixed(1)}s`;
  const minutes = Math.floor(safeSeconds / 60);
  const rest = Math.floor(safeSeconds % 60);
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

const MATH_THEMES = [
  { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', label: 'text-blue-300', contentBorder: 'border-blue-500/20' },
  { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', label: 'text-purple-300', contentBorder: 'border-purple-500/20' },
  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', label: 'text-emerald-300', contentBorder: 'border-emerald-500/20' },
  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', label: 'text-amber-300', contentBorder: 'border-amber-500/20' },
  { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400', label: 'text-orange-300', contentBorder: 'border-orange-500/20' },
  { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400', label: 'text-pink-300', contentBorder: 'border-pink-500/20' },
  { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', label: 'text-rose-300', contentBorder: 'border-rose-500/20' }
];

function InlineSelect({ value, options, onChange, disabled = false, placeholder = '' }: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
          open
            ? 'border-brand-500 bg-brand-500/10 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]'
            : 'border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-surface-500 dark:hover:bg-surface-800'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`min-w-0 truncate ${selected ? 'text-surface-950 dark:text-white' : 'text-surface-500'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-surface-400 transition-transform ${open ? 'rotate-180 text-brand-600 dark:text-brand-300' : 'group-hover:text-surface-600 dark:group-hover:text-surface-200'}`} />
      </button>

      {open && !disabled && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-surface-200 bg-white p-1.5 shadow-xl shadow-surface-900/10 dark:border-surface-700 dark:bg-surface-900 dark:shadow-black/20">
          {options.map(option => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'bg-brand-500/15 text-brand-700 dark:text-brand-200'
                    : 'text-surface-700 hover:bg-surface-100 hover:text-surface-950 dark:text-surface-200 dark:hover:bg-surface-800 dark:hover:text-white'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-brand-400 bg-brand-500 text-white' : 'border-surface-300 dark:border-surface-600'
                }`}>
                  {active && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CreateWalletModal({ onClose, onSave, existingWallets = [], folders = [], activeFolder = 'All', allTags = [], aesKey, registerCloseHandler }: CreateWalletModalProps) {
  const [tab, setTab] = useState<CreateWalletTab>('manual');
  const [generateCount, setGenerateCount] = useState<number | string>(1);
  const [seedWordCount, setSeedWordCount] = useState(12);
  const [generatedWallets, setGeneratedWallets] = useState<GeneratedWallet[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [bulkResult, setBulkResult] = useState<BulkResult>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [postQuantumMode, setPostQuantumMode] = useState(false);
  const [showPostQuantumOptions, setShowPostQuantumOptions] = useState(false);
  const [rotationReminderMonths, setRotationReminderMonths] = useState(DEFAULT_ROTATION_MONTHS);
  const { showToast } = useToast();
  const showConfirm = useConfirm();
  const t = useT();

  const [manualAddress, setManualAddress] = useState('');
  const [manualPK, setManualPK] = useState('');
  const [manualSeed, setManualSeed] = useState('');
  const [manualBalance, setManualBalance] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualNetwork, setManualNetwork] = useState('XLAYER');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Vanity
  const [vanityPrefix, setVanityPrefix] = useState('');
  const [vanitySuffix, setVanitySuffix] = useState('');
  const [vanityGenerating, setVanityGenerating] = useState(false);
  const [vanityScanned, setVanityScanned] = useState(0);
  const [vanitySpeed, setVanitySpeed] = useState(0);
  const [vanityTime, setVanityTime] = useState(0);
  const [vanityTimeLimit, setVanityTimeLimit] = useState(300);
  const [vanityTargetCount, setVanityTargetCount] = useState<number | string>(1);
  const [vanityNetwork, setVanityNetwork] = useState('XLAYER');
  const defaultSaveFolder = activeFolder && activeFolder !== 'All' ? activeFolder : VANITY_DEFAULT_FOLDER;
  const [vanityFolder, setVanityFolder] = useState(defaultSaveFolder);
  const [vanityCaptureExtras, setVanityCaptureExtras] = useState(true);
  const [vanityExtraMinRun, setVanityExtraMinRun] = useState(4);
  const [vanityExtraLimit, setVanityExtraLimit] = useState<number | string>(50);
  const [vanityExtraFilters, setVanityExtraFilters] = useState<VanityExtraFilterConfig>(() => normalizeVanityExtraFilters(DEFAULT_VANITY_EXTRA_FILTERS));
  const [vanityExtraFolder, setVanityExtraFolder] = useState(VANITY_EXTRA_DEFAULT_FOLDER);
  const [vanityTagInput, setVanityTagInput] = useState('');
  const [vanityTags, setVanityTags] = useState<string[]>([]);
  const [vanityStopReason, setVanityStopReason] = useState('');
  const [vanitySavedCount, setVanitySavedCount] = useState(0);
  const [vanityCandidates, setVanityCandidates] = useState<VanityCandidate[]>([]);
  const [vanityExtraWallets, setVanityExtraWallets] = useState<GeneratedWallet[]>([]);
  const [selectedVanityAddresses, setSelectedVanityAddresses] = useState<string[]>([]);
  const [vanityPaused, setVanityPaused] = useState(false);
  const [vanityGenerationMode, setVanityGenerationMode] = useState<'privateKey' | 'mnemonic'>('privateKey');
  const [vanityMnemonicWords, setVanityMnemonicWords] = useState<12 | 24>(12);
  const [vanityExpandedSections, setVanityExpandedSections] = useState<Record<'target' | 'storage' | 'performance' | 'extraFilters' | 'terminal' | 'primary' | 'extra', boolean>>({
    target: true,
    storage: false,
    performance: false,
    extraFilters: false,
    terminal: false,
    primary: true,
    extra: true,
  });
  const [expandedVanitySecrets, setExpandedVanitySecrets] = useState<Record<string, boolean>>({});
  const [visibleVanitySecrets, setVisibleVanitySecrets] = useState<Record<string, boolean>>({});
  const [vanityBackupConfirmed, setVanityBackupConfirmed] = useState(false);
  const [vanityPerformanceMode, setVanityPerformanceMode] = useState<VanityPerformanceMode>('balanced');
  const [vanityPresetsExpanded, setVanityPresetsExpanded] = useState(false);
  const [vanityCustomPattern, setVanityCustomPattern] = useState('');
  const [vanityCustomPatterns, setVanityCustomPatterns] = useState<string[]>([]);
  const [hasRecoverableVanitySession, setHasRecoverableVanitySession] = useState(false);
  const isVanityRunningRef = useRef(false);
  const vanityWorkerRef = useRef<Worker[]>([]);
  const vanityActivityRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vanityFoundRef = useRef<GeneratedWallet[]>([]);
  const vanityExtraRef = useRef<GeneratedWallet[]>([]);
  const vanitySelectedRef = useRef<Set<string>>(new Set());
  const vanitySavedRef = useRef<Set<string>>(new Set());
  const vanitySettingsLoadedRef = useRef(false);
  const vanitySessionPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vanitySessionPersistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const vanitySessionGenerationRef = useRef(0);
  const vanitySessionPersistNowRef = useRef<() => Promise<void>>(async () => {});
  const closingRef = useRef(false);

  const vanityPrefixRaw = vanityPrefix.trim();
  const vanitySuffixRaw = vanitySuffix.trim();
  const vanityPrefixClean = vanityPrefixRaw.toLowerCase();
  const vanitySuffixClean = vanitySuffixRaw.toLowerCase();
  const vanityInvalidChars = !VANITY_HEX_PATTERN.test(vanityPrefixRaw) || !VANITY_HEX_PATTERN.test(vanitySuffixRaw);
  const vanityPatternLength = vanityPrefixClean.length + vanitySuffixClean.length;
  const vanityHasPattern = vanityPatternLength > 0;
  const vanitySafeTargetCount = Math.max(1, Math.floor(Number(vanityTargetCount) || 1));
  const vanityExpectedTries = Math.pow(16, vanityPatternLength || 0);
  const vanityCompletionRatio = vanityHasPattern ? Math.min(0.999999, vanityScanned / Math.max(1, vanityExpectedTries * vanitySafeTargetCount)) : 0;
  const vanityTooLong = vanityPatternLength > VANITY_MAX_SAFE_LENGTH;
  const vanityCanStart = vanityHasPattern && !vanityInvalidChars && !vanityGenerating;
  const vanityCanResume = vanityPaused && vanityHasPattern && !vanityInvalidChars && !vanityGenerating;
  const vanitySafeExtraLimit = Math.max(0, Math.min(500, Number(vanityExtraLimit) || 0));
  const vanitySafeExtraMinRun = Math.max(3, Math.min(6, Number(vanityExtraMinRun) || 4));
  const vanitySafeExtraFilters = useMemo(() => normalizeVanityExtraFilters(vanityExtraFilters, vanitySafeExtraMinRun), [vanityExtraFilters, vanitySafeExtraMinRun]);
  const liteModeActive = typeof document !== 'undefined' && document.documentElement.classList.contains('lite-mode');
  const vanityBatchSize = liteModeActive
    ? (vanityPerformanceMode === 'eco' ? 128 : vanityPerformanceMode === 'fast' ? 2048 : 512)
    : (vanityPerformanceMode === 'eco' ? 256 : vanityPerformanceMode === 'fast' ? 4096 : 1024);
  const vanityWorkerCount = vanityPerformanceMode === 'eco'
    ? 1
    : Math.max(1, Math.min(
      vanityPerformanceMode === 'fast' ? 8 : 4,
      Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) * (vanityPerformanceMode === 'fast' ? 1 : 0.6)))
    ));
  const vanityDifficultyKey = vanityPatternLength <= 2 ? 'easy' : vanityPatternLength <= 4 ? 'medium' : vanityPatternLength <= 6 ? 'hard' : 'extreme';
  const vanityDifficultyTone = {
    easy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    medium: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    hard: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
    extreme: 'bg-red-500/10 text-red-300 border-red-500/25'
  }[vanityDifficultyKey];
  const vanityRunActive = vanityGenerating || vanityPaused;
  const vanityProgress = vanityTimeLimit > 0
    ? Math.min(100, (vanityTime / vanityTimeLimit) * 100)
    : Math.min(100, Math.max((generatedWallets.length / vanitySafeTargetCount) * 100, vanityCompletionRatio * 100));
  const vanityRemainingPrimary = Math.max(0, vanitySafeTargetCount - generatedWallets.length);
  const vanityEstimatedRemainingTries = vanityHasPattern
    ? Math.max(0, (vanityExpectedTries * vanityRemainingPrimary) - vanityScanned)
    : 0;
  const vanityEtaSeconds = vanitySpeed > 0 ? vanityEstimatedRemainingTries / vanitySpeed : 0;
  const vanityProgressPercentLabel = `${Math.min(99.9999, Math.max(0, vanityCompletionRatio * 100)).toFixed(vanityCompletionRatio < 0.01 ? 4 : 2)}%`;
  const vanityEffectiveThroughput = vanityWorkerCount * vanityBatchSize;
  const allVanityWallets = useMemo(() => [...generatedWallets, ...vanityExtraWallets], [generatedWallets, vanityExtraWallets]);
  const hasSelectedUnsavedVanityWallets = selectedVanityAddresses.some(address => !vanitySavedRef.current.has(address));
  const compactAddress = (address: string, head = 6, tail = 6) => {
    if (!address) return '';
    const clean = address.startsWith('0x') ? address : `0x${address}`;
    if (clean.length <= head + tail + 5) return clean;
    return `${clean.slice(0, head)}...${clean.slice(-tail)}`;
  };

  const toggleVanitySection = (section: 'target' | 'storage' | 'performance' | 'extraFilters' | 'terminal' | 'primary' | 'extra') => {
    setVanityExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleVanitySecret = (address: string) => {
    setExpandedVanitySecrets(prev => ({ ...prev, [address]: !prev[address] }));
  };

  const vanityDifficultyAnalyzer = useMemo(() => {
    if (!vanityHasPattern) return null;
    const len = vanityPatternLength;
    const hasBoth = vanityPrefixClean.length > 0 && vanitySuffixClean.length > 0;

    // EVM address matching probability is 16^n for the visible hex constraints.
    // Private-key generation only derives a keypair, while mnemonic mode must also
    // generate BIP39 entropy + derive the first account, so its effective rate is lower.
    const combinations = Math.pow(16, len);
    const generationCostFactor = vanityGenerationMode === 'mnemonic'
      ? (vanityMnemonicWords === 24 ? 50 : 25)
      : 1;
    const effectiveSpeed = Math.max(1, vanitySpeed > 0 ? vanitySpeed : Math.floor(25000 / generationCostFactor));
    const timeInSeconds = combinations / effectiveSpeed;
    const timeLabelStr = timeInSeconds < 60
      ? t('createWallet.vanityTimeSeconds', { seconds: Math.ceil(timeInSeconds) })
      : timeInSeconds < 3600
        ? t('createWallet.vanityTimeMinutes', { minutes: Math.ceil(timeInSeconds / 60) })
        : timeInSeconds < 86400
          ? t('createWallet.vanityTimeHours', { hours: (timeInSeconds / 3600).toFixed(1) })
        : timeInSeconds < 31536000
            ? t('createWallet.vanityTimeDays', { days: (timeInSeconds / 86400).toFixed(1) })
            : t('createWallet.vanityTimeOverYear');

    let diffTone = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/30';
    let difficultyBadgeTone = 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/25';
    let difficultyLabel = t('createWallet.vanityDifficultyEasy');
    if (len >= 8 || timeInSeconds > 86400) { diffTone = 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-500/30'; difficultyBadgeTone = 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/25'; difficultyLabel = t('createWallet.vanityDifficultyExtreme'); }
    else if (len >= 6 || timeInSeconds > 3600) { diffTone = 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-500/30'; difficultyBadgeTone = 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:border-orange-400/25'; difficultyLabel = t('createWallet.vanityDifficultyHard'); }
    else if (len >= 4 || timeInSeconds > 60) { diffTone = 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-500/30'; difficultyBadgeTone = 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/25'; difficultyLabel = t('createWallet.vanityDifficultyMedium'); }

    const sourceLabel = vanityGenerationMode === 'mnemonic'
      ? t('createWallet.vanitySourceMnemonic', { words: vanityMnemonicWords })
      : t('createWallet.vanitySourcePrivateKey');

    return { combinations, timeLabel: timeLabelStr, diffTone, difficultyBadgeTone, difficultyLabel, hasBoth, effectiveSpeed, sourceLabel };
  }, [t, vanityPatternLength, vanitySpeed, vanityPrefixClean, vanitySuffixClean, vanityHasPattern, vanityGenerationMode, vanityMnemonicWords]);

  const visibleVanityPresetGroups = vanityPresetsExpanded ? VANITY_PRESET_GROUPS : VANITY_PRESET_GROUPS.slice(0, 2);
  const vanityHiddenPresetCount = Math.max(0, VANITY_PRESET_GROUPS.length - visibleVanityPresetGroups.length);

  const applyVanitySuffixPattern = (pattern: string) => {
    const clean = pattern.replace(/\s/g, '').toLowerCase().slice(0, 12);
    setVanitySuffix(clean);
  };

  const getVanityExtraLabel = (wallet: GeneratedWallet) => {
    if (wallet.vanityPatternType === 'sequence-up') return t('createWallet.vanityExtraSequenceUp', { pattern: wallet.vanityRepeatChar || '-' });
    if (wallet.vanityPatternType === 'sequence-down') return t('createWallet.vanityExtraSequenceDown', { pattern: wallet.vanityRepeatChar || '-' });
    if (wallet.vanityPatternType === 'mirror') return t('createWallet.vanityExtraMirror', { pattern: wallet.vanityRepeatChar || '-' });
    if (wallet.vanityPatternType === 'palindrome') return t('createWallet.vanityExtraPalindrome', { pattern: wallet.vanityRepeatChar || '-' });
    if (wallet.vanityPatternType === 'bracket') return t('createWallet.vanityExtraBracket', { pattern: wallet.vanityRepeatChar || '-' });
    if (wallet.vanityPatternType === 'lucky') return t('createWallet.vanityExtraLucky', { pattern: wallet.vanityRepeatChar || '-' });
    if (wallet.vanityPatternType === 'alternating') return t('createWallet.vanityExtraAlternating', { pattern: wallet.vanityRepeatChar || '-' });
    if (wallet.vanityRepeatSide === 'both') {
      return t('createWallet.vanityExtraBoth', {
        head: wallet.vanityHeadRun || '-',
        tail: wallet.vanityTailRun || '-',
      });
    }
    const sideKey = wallet.vanityRepeatSide === 'head' ? 'createWallet.vanityExtraHead' : 'createWallet.vanityExtraTail';
    const repeat = `${wallet.vanityRepeatChar || ''}`.repeat(Math.max(0, wallet.vanityRepeatLength || 0));
    return t(sideKey, { pattern: repeat || '-' });
  };
  const renderVanityExtraAddress = (address: string, wallet: GeneratedWallet, compact = false) => {
    const clean = address.slice(2).toLowerCase();
    if (compact) {
      return renderVanityAddress(address, false);
    }
    if (wallet.vanityPatternType === 'sequence-up' || wallet.vanityPatternType === 'sequence-down' || wallet.vanityPatternType === 'mirror') {
      return renderVanityAddress(address, compact);
    }
    const headLength = Math.max(0, wallet.vanityHeadRun?.length || (wallet.vanityRepeatSide === 'head' ? wallet.vanityRepeatLength || 0 : 0));
    const tailLength = Math.max(0, wallet.vanityTailRun?.length || (wallet.vanityRepeatSide === 'tail' ? wallet.vanityRepeatLength || 0 : 0));
    if (!headLength && !tailLength) return renderVanityAddress(address);
    const middleStart = Math.min(headLength, clean.length);
    const middleEnd = Math.max(middleStart, clean.length - tailLength);

    // Rút gọn đoạn giữa nếu nó quá dài
    const MAX_MIDDLE_LENGTH = 16;
    const middlePart = clean.slice(middleStart, middleEnd);
    const compactMiddle = middlePart.length > MAX_MIDDLE_LENGTH
        ? `${middlePart.slice(0, 6)}...${middlePart.slice(-6)}`
        : middlePart;

    return <>
      <span>0x</span>
      {headLength ? <span className="rounded bg-cyan-500/20 px-1 py-0.5 font-extrabold text-cyan-200 ring-1 ring-cyan-400/30">{clean.slice(0, middleStart)}</span> : null}
      <span className="mx-0.5 opacity-80">{compactMiddle}</span>
      {tailLength ? <span className="rounded bg-cyan-500/20 px-1 py-0.5 font-extrabold text-cyan-200 ring-1 ring-cyan-400/30">{clean.slice(middleEnd)}</span> : null}
    </>;
  };
  const renderVanityAddress = (address: string, compact = false) => {
    if (compact) {
      return <>{compactAddress(address)}</>;
    }
    const clean = address.slice(2).toLowerCase();
    const prefixEnd = vanityPrefixClean.length;
    const suffixStart = Math.max(prefixEnd, clean.length - vanitySuffixClean.length);

    // Rút gọn đoạn giữa
    const MAX_MIDDLE_LENGTH = 16;
    const middlePart = clean.slice(prefixEnd, suffixStart);
    const compactMiddle = middlePart.length > MAX_MIDDLE_LENGTH
        ? `${middlePart.slice(0, 6)}...${middlePart.slice(-6)}`
        : middlePart;

    return <>
      <span>0x</span>
      {prefixEnd ? <span className="rounded bg-brand-500/20 px-1 py-0.5 font-extrabold text-brand-200 ring-1 ring-brand-400/30">{clean.slice(0, prefixEnd)}</span> : null}
      <span className="mx-0.5 opacity-80">{compactMiddle}</span>
      {vanitySuffixClean.length ? <span className="rounded bg-brand-500/20 px-1 py-0.5 font-extrabold text-brand-200 ring-1 ring-brand-400/30">{clean.slice(suffixStart)}</span> : null}
    </>;
  };
  const updateVanityExtraFilter = (key: VanityExtraPatternKey, patch: Partial<VanityExtraFilterRule>) => {
    setVanityExtraFilters(prev => normalizeVanityExtraFilters({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }, vanitySafeExtraMinRun));
  };

  const mathStepItems = t('createWallet.mathSteps.steps') as unknown as MathStep[];

  // Derivation Path
  const [manualDerivationPath, setManualDerivationPath] = useState("m/44'/60'/0'/0/0");
  const usableFolders = folders.filter(folder => folder && folder !== 'All');
  const vanityNetworkOptions = NETWORKS.map(network => ({ value: network, label: network }));
  const vanityFolderOptions = [
    { value: VANITY_DEFAULT_FOLDER, label: t('createWallet.vanityFolder') },
    ...usableFolders
      .filter(folder => folder !== VANITY_DEFAULT_FOLDER)
      .map(folder => ({ value: folder, label: folder }))
  ];
  const vanityFolderLabel = vanityFolderOptions.find(option => option.value === vanityFolder)?.label ?? vanityFolder;
  const vanityStorageSummary = `${vanitySafeTargetCount} · ${vanityNetwork} · ${vanityFolderLabel}`;
  const vanityExtraFolderOptions = [
    { value: VANITY_EXTRA_DEFAULT_FOLDER, label: t('createWallet.vanityExtraFolderDefault') },
    ...usableFolders
      .filter(folder => folder !== VANITY_EXTRA_DEFAULT_FOLDER)
      .map(folder => ({ value: folder, label: folder }))
  ];

  const handleAdvancedEntropyGenerated = (_entropy: Uint8Array, seedPhrase: string, address: string) => {
    // Fill the manual input form with the generated phrase
    setManualSeed(seedPhrase);
    setManualAddress(address);
    setWalletName(`${t('createWallet.tabAdvancedEntropy')} Wallet`);
    setTab('manual');
  };

  const closeCreateWalletModal = async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      if (vanityGenerating) {
        await pauseVanity();
      } else if (vanityPaused) {
        await enqueueVanitySessionPersist().catch(() => {});
      }
      onClose();
    } finally {
      closingRef.current = false;
    }
  };

  useEffect(() => {
    if (manualPK && !manualAddress) {
      try {
        const w = new ethers.Wallet(manualPK.trim());
        setManualAddress(w.address);
      } catch {
        // Ignore partial private-key input while the user is typing.
      }
    }
  }, [manualPK, manualAddress]);

  useEffect(() => {
    if (manualSeed && !manualAddress) {
      try {
        let hdNode;
        if (ethers.HDNodeWallet) {
           hdNode = ethers.HDNodeWallet.fromPhrase(manualSeed.trim(), undefined, manualDerivationPath || "m/44'/60'/0'/0/0");
        } else {
           hdNode = ethers.Wallet.fromPhrase(manualSeed.trim());
        }
        setManualAddress(hdNode.address);
        if (hdNode.privateKey) setManualPK(hdNode.privateKey);
      } catch {
        // Ignore partial seed phrase/path input while the user is typing.
      }
    }
  }, [manualSeed, manualDerivationPath, manualAddress]);

  useEffect(() => {
    return () => {
      isVanityRunningRef.current = false;
      if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
      vanityWorkerRef.current.forEach(worker => worker.terminate());
      vanityWorkerRef.current = [];
      if (vanitySessionPersistTimerRef.current) clearTimeout(vanitySessionPersistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    registerCloseHandler?.(closeCreateWalletModal);
    return () => registerCloseHandler?.(null);
  });

  useEffect(() => {
    let active = true;
    Preferences.get({ key: VANITY_SETTINGS_KEY })
      .then(({ value }) => {
        if (!value || !active) return;
        const settings = JSON.parse(value) as VanitySettings;
        if (settings.targetCount) setVanityTargetCount(Math.max(1, Math.floor(Number(settings.targetCount) || 1)));
        if (typeof settings.timeLimit === 'number') setVanityTimeLimit(Math.max(0, Math.floor(settings.timeLimit)));
        if (settings.network && NETWORKS.includes(settings.network)) setVanityNetwork(settings.network);
        if (settings.folder) setVanityFolder(settings.folder);
        if (typeof settings.captureExtras === 'boolean') setVanityCaptureExtras(settings.captureExtras);
        if (settings.extraMinRun && VANITY_EXTRA_MIN_RUNS.includes(settings.extraMinRun)) setVanityExtraMinRun(settings.extraMinRun);
        if (settings.extraLimit) setVanityExtraLimit(Math.max(1, Math.min(500, settings.extraLimit)));
        if (settings.extraFilters) setVanityExtraFilters(normalizeVanityExtraFilters(settings.extraFilters, settings.extraMinRun || 4));
        if (settings.extraFolder) setVanityExtraFolder(settings.extraFolder);
        if (settings.performanceMode === 'eco' || settings.performanceMode === 'balanced' || settings.performanceMode === 'fast') setVanityPerformanceMode(settings.performanceMode);
        if (settings.generationMode === 'privateKey' || settings.generationMode === 'mnemonic') setVanityGenerationMode(settings.generationMode);
        if (settings.mnemonicWords === 12 || settings.mnemonicWords === 24) setVanityMnemonicWords(settings.mnemonicWords);
        if (Array.isArray(settings.customPatterns)) {
          setVanityCustomPatterns([...new Set(settings.customPatterns.map(pattern => String(pattern).replace(/\s/g, '').toLowerCase().slice(0, 12)).filter(pattern => pattern && VANITY_HEX_PATTERN.test(pattern)))].slice(-12));
        }
      })
      .catch(() => {})
      .finally(() => { if (active) vanitySettingsLoadedRef.current = true; });
    return () => { active = false; };
  }, []);

  // Persist periodically while scanning. Writes are queued so a slower native write
  // cannot overwrite a newer encrypted session.
  useEffect(() => {
    if ((!generatedWallets.length && !vanityExtraWallets.length) || !vanityGenerating) return;
    scheduleVanitySessionPersist();
  }, [generatedWallets, vanityExtraWallets, selectedVanityAddresses, vanityScanned, vanityTime, vanityCandidates, vanityGenerating]);

  useEffect(() => {
    if (!vanitySettingsLoadedRef.current) return;
    Preferences.set({
      key: VANITY_SETTINGS_KEY,
      value: JSON.stringify({
        targetCount: vanitySafeTargetCount,
        timeLimit: vanityTimeLimit,
        network: vanityNetwork,
        folder: vanityFolder,
        captureExtras: vanityCaptureExtras,
        extraMinRun: vanitySafeExtraMinRun,
        extraLimit: vanitySafeExtraLimit,
        extraFilters: vanitySafeExtraFilters,
        extraFolder: vanityExtraFolder,
        performanceMode: vanityPerformanceMode,
        generationMode: vanityGenerationMode,
        mnemonicWords: vanityMnemonicWords,
        customPatterns: vanityCustomPatterns
      } satisfies VanitySettings)
    }).catch(() => {});
  }, [vanitySafeTargetCount, vanityTimeLimit, vanityNetwork, vanityFolder, vanityCaptureExtras, vanitySafeExtraMinRun, vanitySafeExtraLimit, vanitySafeExtraFilters, vanityExtraFolder, vanityPerformanceMode, vanityGenerationMode, vanityMnemonicWords, vanityCustomPatterns]);

  const clearVanitySession = async () => {
    vanitySessionGenerationRef.current += 1;
    if (vanitySessionPersistTimerRef.current) {
      clearTimeout(vanitySessionPersistTimerRef.current);
      vanitySessionPersistTimerRef.current = null;
    }
    await vanitySessionPersistQueueRef.current.catch(() => {});
    const { value } = await Preferences.get({ key: VANITY_SESSION_KEY });
    const storedRef = parseInternalTextRef(value);
    setHasRecoverableVanitySession(false);
    await Preferences.remove({ key: VANITY_SESSION_KEY });
    if (storedRef) await deleteInternalText(storedRef);
  };

  const persistVanitySession = async () => {
    if (!vanityFoundRef.current.length && !vanityExtraRef.current.length) return;
    const state: VanitySessionState = {
      prefix: vanityPrefix,
      suffix: vanitySuffix,
      scanned: vanityScanned,
      elapsed: vanityTime,
      targetCount: vanitySafeTargetCount,
      timeLimit: vanityTimeLimit,
      network: vanityNetwork,
      folder: vanityFolder,
      captureExtras: vanityCaptureExtras,
      extraMinRun: vanitySafeExtraMinRun,
      extraLimit: vanitySafeExtraLimit,
      extraFilters: vanitySafeExtraFilters,
      extraFolder: vanityExtraFolder,
      tags: vanityTags,
      performanceMode: vanityPerformanceMode,
      generationMode: vanityGenerationMode,
      mnemonicWords: vanityMnemonicWords,
      candidates: vanityCandidates,
      extraWallets: vanityExtraRef.current,
      selectedAddresses: [...vanitySelectedRef.current],
      savedAddresses: [...vanitySavedRef.current],
    };
    const { createPortableBackupText } = await import('../utils/backupUtils');
    const container = await createPortableBackupText(vanityFoundRef.current, { scope: 'vanity-session', state }, aesKey);
    const { value: previousValue } = await Preferences.get({ key: VANITY_SESSION_KEY });
    const previousRef = parseInternalTextRef(previousValue);
    const sessionRef = await writeInternalText('xkey-vanity-session', container);
    await Preferences.set({ key: VANITY_SESSION_KEY, value: serializeInternalTextRef(sessionRef) });
    if (previousRef) await deleteInternalText(previousRef);
    setHasRecoverableVanitySession(true);
  };

  const enqueueVanitySessionPersist = async () => {
    const generation = vanitySessionGenerationRef.current;
    const nextWrite = vanitySessionPersistQueueRef.current
      .catch(() => {})
      .then(() => generation === vanitySessionGenerationRef.current ? persistVanitySession() : undefined);
    vanitySessionPersistQueueRef.current = nextWrite;
    await nextWrite;
  };
  vanitySessionPersistNowRef.current = enqueueVanitySessionPersist;

  const scheduleVanitySessionPersist = () => {
    if (vanitySessionPersistTimerRef.current) return;
    vanitySessionPersistTimerRef.current = setTimeout(() => {
      vanitySessionPersistTimerRef.current = null;
      void vanitySessionPersistNowRef.current().catch(() => {});
    }, 1500);
  };

  useEffect(() => {
    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) void vanitySessionPersistNowRef.current().catch(() => {});
    });
    return () => { void appStateListener.then(listener => listener.remove()); };
  }, []);

  const restoreVanitySession = async () => {
    try {
      const { value } = await Preferences.get({ key: VANITY_SESSION_KEY });
      if (!value) return;
      const storedRef = parseInternalTextRef(value);
      const sessionText = storedRef ? await readInternalText(storedRef) : value;
      const { parseVaultBackupFile } = await import('../utils/backupUtils');
      const restored = await parseVaultBackupFile(sessionText, aesKey, aesKey) as { wallets?: GeneratedWallet[]; config?: { state?: VanitySessionState } };
      const state = restored.config?.state;
      if (!state || !Array.isArray(restored.wallets)) throw new Error('Invalid vanity session');
      setVanityPrefix(state.prefix || '');
      setVanitySuffix(state.suffix || '');
      setVanityScanned(Math.max(0, Number(state.scanned) || 0));
      setVanityTime(Math.max(0, Number(state.elapsed) || 0));
      setVanityTargetCount(Math.max(1, Math.floor(Number(state.targetCount) || 1)));
      setVanityTimeLimit(Math.max(0, Math.floor(Number(state.timeLimit) || 300)));
      setVanityNetwork(NETWORKS.includes(state.network) ? state.network : 'XLAYER');
      setVanityFolder(state.folder || VANITY_DEFAULT_FOLDER);
      setVanityCaptureExtras(typeof state.captureExtras === 'boolean' ? state.captureExtras : true);
      setVanityExtraMinRun(VANITY_EXTRA_MIN_RUNS.includes(state.extraMinRun) ? state.extraMinRun : 4);
      setVanityExtraLimit(Math.max(1, Math.min(500, Number(state.extraLimit) || 50)));
      if (state.extraFilters) setVanityExtraFilters(normalizeVanityExtraFilters(state.extraFilters, state.extraMinRun || 4));
      setVanityExtraFolder(state.extraFolder || VANITY_EXTRA_DEFAULT_FOLDER);
      setVanityTags(Array.isArray(state.tags) ? state.tags : []);
      setVanityPerformanceMode(state.performanceMode === 'eco' || state.performanceMode === 'fast' ? state.performanceMode : 'balanced');
      if (state.generationMode === 'privateKey' || state.generationMode === 'mnemonic') setVanityGenerationMode(state.generationMode);
      if (state.mnemonicWords === 12 || state.mnemonicWords === 24) setVanityMnemonicWords(state.mnemonicWords);
      setVanityCandidates(Array.isArray(state.candidates) ? state.candidates.slice(-6) : []);
      vanityFoundRef.current = restored.wallets;
      vanityExtraRef.current = Array.isArray(state.extraWallets) ? state.extraWallets : [];
      vanitySelectedRef.current = new Set(
        state.selectedAddresses
        || [...restored.wallets, ...vanityExtraRef.current].map(wallet => wallet.address).filter(Boolean) as string[]
      );
      vanitySavedRef.current = new Set(state.savedAddresses || []);
      setGeneratedWallets(restored.wallets);
      setVanityExtraWallets(vanityExtraRef.current);
      setSelectedVanityAddresses([...vanitySelectedRef.current]);
      setVanityPaused(true);
      setVanityStopReason(t('createWallet.vanitySessionRestored'));
    } catch {
      await clearVanitySession();
      showToast({ key: 'createWallet.vanitySessionUnavailable', category: 'warning' }, 'error');
    }
  };

  useEffect(() => {
    let active = true;
    Preferences.get({ key: VANITY_SESSION_KEY }).then(({ value }) => {
      if (active && !!value) setHasRecoverableVanitySession(true);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const validFolders = new Set([VANITY_DEFAULT_FOLDER, ...usableFolders]);
    if (!validFolders.has(vanityFolder)) setVanityFolder(defaultSaveFolder);
    const validExtraFolders = new Set([VANITY_EXTRA_DEFAULT_FOLDER, ...usableFolders]);
    if (!validExtraFolders.has(vanityExtraFolder)) setVanityExtraFolder(VANITY_EXTRA_DEFAULT_FOLDER);
  }, [defaultSaveFolder, usableFolders, vanityFolder, vanityExtraFolder]);

  const addVanityTag = () => {
    const next = vanityTagInput.trim().toLowerCase();
    if (!next || vanityTags.includes(next)) return;
    setVanityTags(prev => [...prev, next]);
    setVanityTagInput('');
  };

  const buildVanityWallet = (wallet: GeneratedWallet, index: number): GeneratedWallet => ({
    ...wallet,
    name: vanitySafeTargetCount === 1 ? t('createWallet.vanityWalletName') : `${t('createWallet.vanityWalletName')} ${index + 1}`,
    network: vanityNetwork,
    groupId: vanityFolder || VANITY_DEFAULT_FOLDER,
    tags: vanityTags,
    balance: '0.00',
    createdAt: Date.now() + index
  });

  const buildVanityExtraWallet = (wallet: GeneratedWallet, index: number): GeneratedWallet => ({
    ...wallet,
    name: `${t('createWallet.vanityExtraWalletName')} ${index + 1}`,
    network: vanityNetwork,
    groupId: vanityExtraFolder || VANITY_EXTRA_DEFAULT_FOLDER,
    tags: [...new Set([...vanityTags, 'extra-vanity'])],
    balance: '0.00',
    createdAt: Date.now() + index + 100000,
    seedPhrase: wallet.seedPhrase || wallet.mnemonic || '',
    mnemonic: wallet.mnemonic || wallet.seedPhrase || '',
  });

  const getVanityScoreTone = (score = 0) => {
    if (score >= 80) return 'border-emerald-400/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
    if (score >= 50) return 'border-amber-400/35 bg-amber-500/15 text-amber-700 dark:text-amber-200';
    if (score >= 30) return 'border-orange-400/35 bg-orange-500/15 text-orange-700 dark:text-orange-200';
    return 'border-rose-400/35 bg-rose-500/15 text-rose-700 dark:text-rose-200';
  };

  const syncVanityExtraWallets = (wallets: GeneratedWallet[]) => {
    const nextExtras = wallets
      .filter(wallet => !!wallet.address)
      .filter((wallet, index, array) => array.findIndex(other => other.address?.toLowerCase() === wallet.address?.toLowerCase()) === index)
      .sort((left, right) => (right.vanityScore || 0) - (left.vanityScore || 0))
      .slice(0, vanitySafeExtraLimit);
    vanityExtraRef.current = nextExtras;
    setVanityExtraWallets(nextExtras);
    return nextExtras;
  };

  const removeVanityExtraWallet = (address: string) => {
    const nextExtras = syncVanityExtraWallets(vanityExtraRef.current.filter(wallet => wallet.address !== address));
    vanitySelectedRef.current.delete(address);
    vanitySavedRef.current.delete(address);
    setSelectedVanityAddresses([...vanitySelectedRef.current].filter(item => nextExtras.some(wallet => wallet.address === item) || vanityFoundRef.current.some(wallet => wallet.address === item)));
  };

  const removeVanityPrimaryWallet = (address: string) => {
    const nextPrimary = vanityFoundRef.current.filter(wallet => wallet.address !== address);
    vanityFoundRef.current = nextPrimary;
    setGeneratedWallets(nextPrimary);
    vanitySelectedRef.current.delete(address);
    vanitySavedRef.current.delete(address);
    setSelectedVanityAddresses([...vanitySelectedRef.current].filter(item => nextPrimary.some(wallet => wallet.address === item) || vanityExtraRef.current.some(wallet => wallet.address === item)));
  };

  const clearVanityExtraWallets = () => {
    vanityExtraRef.current.forEach(wallet => {
      if (wallet.address) {
        vanitySelectedRef.current.delete(wallet.address);
        vanitySavedRef.current.delete(wallet.address);
      }
    });
    syncVanityExtraWallets([]);
    setSelectedVanityAddresses([...vanitySelectedRef.current].filter(item => vanityFoundRef.current.some(wallet => wallet.address === item)));
  };

  const saveSingleVanityWallet = async (wallet: GeneratedWallet) => {
    if (!vanityBackupConfirmed) {
      showToast(t('createWallet.vanityBackupConfirmRequired'), 'warning');
      return;
    }
    if (!wallet.address || vanitySavedRef.current.has(wallet.address)) return;
    const rank = wallet.vanityMatchType === 'extra'
      ? vanityExtraRef.current
        .filter((item: GeneratedWallet) => !!item.address)
        .sort((left: GeneratedWallet, right: GeneratedWallet) => (right.vanityScore || 0) - (left.vanityScore || 0))
        .findIndex((item: GeneratedWallet) => item.address?.toLowerCase() === wallet.address?.toLowerCase()) + 1
      : 0;
    const walletToSave = rank > 0 ? { ...wallet, name: `${t('createWallet.vanityExtraWalletName')} ${rank}` } : wallet;

    try {
      await onSave(walletToSave);
      vanitySavedRef.current.add(wallet.address);
      setVanitySavedCount(1);
      showToast({ key: 'createWallet.vanityAutoSaved', vars: { count: 1, folder: walletToSave.groupId, label: t('walletCard.new') }, category: 'data' }, 'success');
    } catch {
      await enqueueVanitySessionPersist().catch(() => {});
      showToast(t('assetBalance.autoSaveError'), 'error');
    }
  };

  const saveAllVanityExtraWallets = async () => {
    vanityExtraRef.current.forEach(wallet => {
      if (wallet.address) vanitySelectedRef.current.add(wallet.address);
    });
    setSelectedVanityAddresses([...vanitySelectedRef.current]);
    await saveVanityWallets(vanityExtraRef.current, false);
  };

  const saveVanityWallets = async (walletsToSave: GeneratedWallet[], closeAfterSave = false): Promise<boolean> => {
    const extraRanks = new Map(
      walletsToSave
        .filter(wallet => wallet.vanityMatchType === 'extra' && !!wallet.address)
        .sort((left, right) => (right.vanityScore || 0) - (left.vanityScore || 0))
        .map((wallet, index) => [wallet.address!.toLowerCase(), index + 1]),
    );
    const selectedWallets = walletsToSave
      .filter(wallet => !!wallet.address && vanitySelectedRef.current.has(wallet.address) && !vanitySavedRef.current.has(wallet.address))
      .map(wallet => {
        const rank = wallet.address ? extraRanks.get(wallet.address.toLowerCase()) : undefined;
        return rank ? { ...wallet, name: `${t('createWallet.vanityExtraWalletName')} ${rank}` } : wallet;
      });
    if (!selectedWallets.length) return true;
    if (!vanityBackupConfirmed) {
      showToast(t('createWallet.vanityBackupConfirmRequired'), 'warning');
      return false;
    }

    try {
      await onSave(selectedWallets.length === 1 ? selectedWallets[0] : selectedWallets);
      selectedWallets.forEach(wallet => {
        if (wallet.address) vanitySavedRef.current.add(wallet.address);
      });
      setVanitySavedCount(selectedWallets.length);
      showToast({ key: 'createWallet.vanityAutoSaved', vars: { count: selectedWallets.length, folder: selectedWallets[0].groupId, label: t('walletCard.new') }, category: 'data' }, 'success');
      if (closeAfterSave) onClose();
      return true;
    } catch {
      await enqueueVanitySessionPersist().catch(() => {});
      showToast(t('assetBalance.autoSaveError'), 'error');
      return false;
    }
  };

  const finishVanityRun = async ({ reason = '', closeAfterSave = false, saveFound = true } = {}): Promise<boolean> => {
    isVanityRunningRef.current = false;
    setVanityGenerating(false);
    setVanityPaused(false);
    if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
    vanityActivityRef.current = null;
    vanityWorkerRef.current.forEach(worker => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    });
    vanityWorkerRef.current = [];
    if (reason) setVanityStopReason(reason);
    const foundWallets = [...vanityFoundRef.current, ...vanityExtraRef.current];
    if (foundWallets.length > 0 && saveFound) {
      const saved = await saveVanityWallets(foundWallets, closeAfterSave);
      if (!saved) return false;
      if (foundWallets.every(wallet => !!wallet.address && vanitySavedRef.current.has(wallet.address))) {
        await clearVanitySession();
      }
    } else if (foundWallets.length > 0) {
      await enqueueVanitySessionPersist().catch(() => {});
    }
    return true;
  };

  const startVanity = async (resume = false) => {
     if (!vanityCanStart) return;
      if (resume && !vanityCanResume) return;
      if (!resume && vanityTooLong) {
       const ok = await showConfirm(t('createWallet.vanityLongConfirm'), {
         danger: true,
         title: t('createWallet.vanityLongTitle'),
         confirmText: t('createWallet.startVanity')
       });
       if (!ok) return;
     }

     isVanityRunningRef.current = true;
     setVanityGenerating(true);
     setVanityPaused(false);
     if (!resume) {
       await clearVanitySession();
       setVanityScanned(0);
       setVanitySpeed(0);
       setVanityTime(0);
       setVanityStopReason('');
       setVanitySavedCount(0);
      setGeneratedWallets([]);
      setVanityExtraWallets([]);
      setVanityCandidates([]);
      setSelectedVanityAddresses([]);
      vanitySelectedRef.current = new Set();
      vanitySavedRef.current = new Set();
      vanityFoundRef.current = [];
      vanityExtraRef.current = [];
     }

     window.dispatchEvent(new Event(APP_ACTIVITY_EVENT));
     if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
     vanityActivityRef.current = setInterval(() => {
       window.dispatchEvent(new Event(APP_ACTIVITY_EVENT));
     }, 15000);

     vanityWorkerRef.current.forEach(worker => worker.terminate());
     const workers = Array.from({ length: vanityWorkerCount }, () => new Worker(new URL('../workers/vanityWorker.ts', import.meta.url), { type: 'module' }));
     vanityWorkerRef.current = workers;
     const workerScanned = new Array(workers.length).fill(0);
     const elapsedBase = resume ? vanityTime : 0;

     const handleWorkerMessage = (workerIndex: number) => (event: MessageEvent) => {
       const { type, scanned, elapsed, wallet, candidate, matchType } = event.data || {};
       if (!isVanityRunningRef.current) return;

       window.dispatchEvent(new Event(APP_ACTIVITY_EVENT));
       workerScanned[workerIndex] = Math.max(0, Number(scanned) || 0);
       const totalScanned = workerScanned.reduce((sum, count) => sum + count, resume ? vanityScanned : 0);
       const safeElapsed = elapsedBase + Math.max(0, Number(elapsed) || 0);
       if (safeElapsed > 0) {
         setVanityScanned(totalScanned);
         setVanityTime(Number(safeElapsed.toFixed(1)));
         setVanitySpeed(Math.floor(totalScanned / safeElapsed));
       }

       if (candidate) {
         setVanityCandidates(prev => [...prev.slice(-5), { address: candidate, matched: false }]);
       }

       if (vanityTimeLimit > 0 && safeElapsed >= vanityTimeLimit) {
         void finishVanityRun({ reason: t('createWallet.vanityTimeLimitReached'), saveFound: false });
         return;
       }

       if (type === 'extras' && Array.isArray(event.data.wallets)) {
          const previousExtras = vanityExtraRef.current;
          const byAddress = new Map(previousExtras.map(item => [item.address?.toLowerCase(), item]));
          const mergedExtras = [...previousExtras, ...(event.data.wallets as GeneratedWallet[])]
            .filter((item: GeneratedWallet) => !!item.address)
            .sort((left, right) => (right.vanityScore || 0) - (left.vanityScore || 0));
          const nextExtras: GeneratedWallet[] = mergedExtras
            .filter((item: GeneratedWallet, index, array) => array.findIndex(other => other.address?.toLowerCase() === item.address?.toLowerCase()) === index)
            .slice(0, vanitySafeExtraLimit)
            .map((item: GeneratedWallet, index: number) => {
              const existing = byAddress.get(item.address?.toLowerCase() || '');
              const base = existing || buildVanityExtraWallet(item, index);
              return {
                ...base,
                ...item,
                privateKey: item.privateKey || base.privateKey,
                seedPhrase: item.seedPhrase || item.mnemonic || base.seedPhrase || base.mnemonic || '',
                mnemonic: item.mnemonic || item.seedPhrase || base.mnemonic || base.seedPhrase || '',
                name: `${t('createWallet.vanityExtraWalletName')} ${index + 1}`,
              };
            });
         const nextAddresses = new Set(nextExtras.map(item => item.address?.toLowerCase()).filter(Boolean));
         const previousAddresses = new Set(previousExtras.map(item => item.address?.toLowerCase()).filter(Boolean));
         previousExtras.forEach(item => {
           const address = item.address?.toLowerCase();
           if (address && !nextAddresses.has(address)) vanitySelectedRef.current.delete(item.address || '');
         });
         nextExtras.forEach(item => {
           const address = item.address?.toLowerCase();
           if (address && !previousAddresses.has(address)) vanitySelectedRef.current.add(item.address || '');
         });
         vanityExtraRef.current = nextExtras;
         setVanityExtraWallets(nextExtras);
         setSelectedVanityAddresses([...vanitySelectedRef.current]);
         const newest = nextExtras.find(item => !previousAddresses.has(item.address?.toLowerCase() || ''));
         if (newest?.address) setVanityCandidates(prev => [...prev.slice(-5), { address: newest.address!, matched: true }]);
       }

       if (type === 'found' && wallet && matchType !== 'extra') {
         if (!vanityFoundRef.current.some(item => item.address?.toLowerCase() === wallet.address?.toLowerCase())) {
           const nextWallet = buildVanityWallet(wallet, vanityFoundRef.current.length);
           vanityFoundRef.current = [...vanityFoundRef.current, nextWallet];
           setGeneratedWallets(vanityFoundRef.current);
           vanitySelectedRef.current.add(wallet.address);
           setSelectedVanityAddresses(prev => prev.includes(wallet.address) ? prev : [...prev, wallet.address]);
           setVanityCandidates(prev => [...prev.slice(-5), { address: wallet.address, matched: true }]);
           setWalletName(t('createWallet.vanityWalletName'));
         }

         if (vanityFoundRef.current.length >= vanitySafeTargetCount) {
           void finishVanityRun({ reason: t('createWallet.vanityComplete', { count: vanityFoundRef.current.length }), closeAfterSave: true });
         }
       }
     };

     workers.forEach((worker, workerIndex) => {
       worker.onmessage = handleWorkerMessage(workerIndex);
       worker.onerror = () => {
         void finishVanityRun({ reason: t('createWallet.vanityWorkerError'), saveFound: false });
         showToast({ key: 'createWallet.vanityWorkerError', category: 'warning' }, 'error');
       };
       worker.postMessage({
         type: 'start',
         prefix: vanityPrefixClean,
         suffix: vanitySuffixClean,
         batchSize: vanityBatchSize,
         targetCount: Math.max(1, vanitySafeTargetCount - vanityFoundRef.current.length),
         initialScanned: 0,
         elapsedOffset: 0,
         captureExtras: vanityCaptureExtras,
         extraMinRun: vanitySafeExtraMinRun,
         extraLimit: vanitySafeExtraLimit,
         extraFilters: vanitySafeExtraFilters,
         generationMode: vanityGenerationMode,
         mnemonicWords: vanityMnemonicWords,
          initialExtraCandidates: vanityExtraRef.current.map(wallet => ({
            address: wallet.address,
            vanityMatchType: 'extra' as const,
            vanityRepeatSide: wallet.vanityRepeatSide,
            vanityRepeatChar: wallet.vanityRepeatChar,
            vanityRepeatLength: wallet.vanityRepeatLength,
            vanityScore: wallet.vanityScore,
            vanityHeadRun: wallet.vanityHeadRun,
            vanityTailRun: wallet.vanityTailRun,
             vanityPatternType: wallet.vanityPatternType,
             privateKey: wallet.privateKey,
             seedPhrase: wallet.seedPhrase,
             mnemonic: wallet.mnemonic,
           })),
       });
     });
  };

  const pauseVanity = async () => {
    isVanityRunningRef.current = false;
    vanityWorkerRef.current.forEach(worker => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    });
    vanityWorkerRef.current = [];
    if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
    vanityActivityRef.current = null;
    setVanityGenerating(false);
    setVanityPaused(true);
    setVanityStopReason(t('createWallet.vanityPaused'));
    await enqueueVanitySessionPersist().catch(() => {});
  };

  const stopVanity = async () => {
     await finishVanityRun({ reason: t('createWallet.vanityStopped'), saveFound: false });
  };

  const toggleVanitySelection = (address: string) => {
    setSelectedVanityAddresses(current => {
      const selected = current.includes(address);
      if (selected) vanitySelectedRef.current.delete(address);
      else vanitySelectedRef.current.add(address);
      return selected ? current.filter(value => value !== address) : [...current, address];
    });
  };

  const resetVanityResults = () => {
    setGeneratedWallets([]);
    setVanityExtraWallets([]);
    setVanityScanned(0);
    setVanitySavedCount(0);
    setSelectedVanityAddresses([]);
    setExpandedVanitySecrets({});
    setVisibleVanitySecrets({});
    vanitySelectedRef.current = new Set();
    vanitySavedRef.current = new Set();
    vanityFoundRef.current = [];
    vanityExtraRef.current = [];
    void clearVanitySession().catch(() => {});
  };

  const createRandomWalletRecord = async (name: string): Promise<GeneratedWallet> => {
    let w;
    if (Number(seedWordCount) === 24) {
      const mnemonic = ethers.Mnemonic.fromEntropy(ethers.randomBytes(32));
      w = ethers.HDNodeWallet.fromMnemonic(mnemonic, manualDerivationPath || "m/44'/60'/0'/0/0");
    } else {
      w = ethers.Wallet.createRandom();
    }

    const phrase = w.mnemonic?.phrase || '';
    return {
      name,
      address: w.address,
      privateKey: w.privateKey,
      mnemonic: phrase,
      seedPhrase: phrase,
      balance: '0.00',
      network: 'XLAYER',
      rotationReminderMonths,
      ...(postQuantumMode ? await createPostQuantumEnvelope(aesKey) : {})
    };
  };

  const generateWallet = async () => {
    const count = Number.parseInt(String(generateCount), 10) || 1;
    if (count < 1) return;
    if (!await ensureStorageCapacity(count)) return;

    if (count < 10) {
      setGenerating(true);
      setGenerateProgress(0);
      setFloatingEffects([]);

      const processSingle = async (i: number, newWallets: GeneratedWallet[]) => {
        if (i < count) {
          const record = await createRandomWalletRecord(count === 1 ? `Wallet ${Date.now().toString(36).slice(-4).toUpperCase()}` : `Wallet ${i + 1}`);
          newWallets.push(record);
          setGenerateProgress(i + 1);
          setFloatingEffects(prev => [...prev.slice(-4), { count: i + 1, address: record.address, key: Math.random() }]);
          setTimeout(() => processSingle(i + 1, newWallets), 150);
        } else {
          setTimeout(() => {
            setGeneratedWallets(newWallets);
            if (count === 1) {
              setWalletName(newWallets[0]?.name || 'New Wallet');
            }
            setGenerating(false);
          }, 800);
        }
      };
      processSingle(0, []);
    } else {
      setGenerating(true);
      setGenerateProgress(0);
      setFloatingEffects([]);
      const newWallets: GeneratedWallet[] = [];
      const chunkSize = 20;

      const processChunk = async (i: number) => {
        const limit = Math.min(i + chunkSize, count);
        for (let j = i; j < limit; j++) {
          newWallets.push(await createRandomWalletRecord(`Wallet ${j + 1}`));
        }
        setGenerateProgress(limit);
        const lastW = newWallets[newWallets.length - 1];
        setFloatingEffects(prev => [...prev.slice(-4), { count: limit, address: lastW.address, key: Math.random() }]);

        if (limit < count) {
          setTimeout(() => processChunk(limit), 100);
        } else {
          setTimeout(async () => {
            const sizeBytes = new Blob([JSON.stringify(newWallets)]).size;
            let storageInfo: StorageInfo | undefined;
            if (navigator.storage && navigator.storage.estimate) {
              try { storageInfo = await navigator.storage.estimate(); } catch {
                storageInfo = undefined;
              }
            }
            onSave(newWallets);
            setBulkResult({ count, sizeBytes, storageInfo });
            setGenerating(false);
          }, 800);
        }
      };
      processChunk(0);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const checkDuplicate = (address: string) => {
    if (!address) { setDuplicateWarning(false); return; }
    setDuplicateWarning(existingWallets.some(w => w.address?.toLowerCase() === address.toLowerCase()));
  };

  const handleSaveGenerated = async () => {
    if (generatedWallets.length === 0) return;

    // Auto-save logic was already mapped. We just map the generatedWallets to standard format.
    const toSave = generatedWallets.map((w, index) => ({
      name: (generatedWallets.length === 1 ? walletName : w.name) || 'New Wallet',
      address: w.address,
      privateKey: w.privateKey,
      seedPhrase: w.mnemonic || w.seedPhrase,
      balance: '0.00',
      network: w.network || 'XLAYER',
      groupId: w.groupId,
      tags: w.tags || [],
      rotationReminderMonths: w.rotationReminderMonths || rotationReminderMonths,
      ...(w.pqPrepared ? {
        pqPrepared: w.pqPrepared,
        pqScheme: w.pqScheme,
        pqCreatedAt: w.pqCreatedAt,
        pqPublicCommitment: w.pqPublicCommitment,
        pqOneTimeSlots: w.pqOneTimeSlots,
        pqUsedSlots: w.pqUsedSlots,
        pqReserveId: w.pqReserveId,
      } : {}),
      createdAt: Date.now() + index
    }));

    const saved = await onSave(toSave.length === 1 ? toSave[0] : toSave);
    const savedList = (Array.isArray(saved) ? saved : saved ? [saved] : []) as GeneratedWallet[];
    showToast({ key: 'createWallet.walletCreated', vars: { count: savedList.length || toSave.length, folder: savedList[0]?.groupId || toSave[0]?.groupId || 'Created', label: t('walletCard.new') }, category: 'data' }, 'success');
    onClose();
  };

  const ensureStorageCapacity = async (walletCount: number): Promise<boolean> => {
    try {
      const estimate = await navigator.storage?.estimate?.();
      const available = (estimate?.quota || 0) - (estimate?.usage || 0);
      const required = Math.max(128 * 1024, walletCount * 4096);
      if (estimate?.quota && available < required) {
        showToast({ key: 'createWallet.storageCapacityLow', category: 'warning' }, 'warning');
        return false;
      }
    } catch {
      // Storage estimates are advisory; do not block if unavailable.
    }
    return true;
  };

  const handleSaveManual = async () => {
    if (!manualAddress && !manualPK && !manualSeed) {
      showToast({ key: 'createWallet.fillRequired', category: 'warning' }, 'warning');
      return;
    }
    const saved = await onSave({
      name: walletName || 'Manual Wallet',
      address: manualAddress.trim(),
      privateKey: manualPK.trim(),
      seedPhrase: manualSeed.trim(),
      balance: normalizeAmountInput(manualBalance) || '0.00',
      notes: manualNotes.trim(),
      network: manualNetwork,
      rotationReminderMonths,
      ...(postQuantumMode ? await createPostQuantumEnvelope(aesKey) : {}),
      createdAt: Date.now()
    });
    const savedWallet = (Array.isArray(saved) ? saved[0] : saved) as GeneratedWallet | undefined;
    showToast(duplicateWarning
      ? { key: 'createWallet.walletAddedDuplicate', category: 'warning' }
      : { key: 'createWallet.walletAdded', vars: { folder: savedWallet?.groupId || 'Created', label: t('walletCard.new') }, category: 'data' },
    duplicateWarning ? 'warning' : 'success');
    onClose();
  };

  const handleSaveHDWallet = async (wallet: GeneratedWallet) => {
    const path = wallet.derivationPath || wallet.path;
    const saved = await onSave({
      name: wallet.name || t('createWallet.hdTreeWalletName'),
      address: wallet.address,
      privateKey: wallet.privateKey,
      balance: wallet.balance || '0.00',
      notes: wallet.notes || t('createWallet.hdTreeDerivedNote', { path }),
      network: wallet.network || 'XLAYER',
      derivationPath: path,
      hdAccount: wallet.hdAccount,
      hdIndex: wallet.hdIndex,
      hdCoinType: wallet.hdCoinType,
      hdNetwork: wallet.hdNetwork || wallet.network || 'XLAYER',
      hdRootType: wallet.hdRootType,
      createdAt: Date.now(),
    });
    const savedWallet = (Array.isArray(saved) ? saved[0] : saved) as GeneratedWallet | undefined;
    showToast({ key: 'createWallet.walletAdded', vars: { folder: savedWallet?.groupId || 'Created', label: t('walletCard.new') }, category: 'data' }, 'success');
    onClose();
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="create-wallet-modal-panel flex max-h-[90dvh] flex-col rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-brand-400" />
            {t('createWallet.title')}
          </h2>
          <button onClick={closeCreateWalletModal} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-b border-surface-800">
          <button onClick={() => setTab('manual')} className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 sm:text-sm sm:gap-2 ${tab === 'manual' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/10' : 'text-surface-400 hover:text-white'}`}>
            <Keyboard size={16} /> {t('createWallet.tabManual')}
          </button>
          <button onClick={() => setTab('generate')} className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 sm:text-sm sm:gap-2 ${['generate', 'hdTree', 'advancedEntropy'].includes(tab) ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/10' : 'text-surface-400 hover:text-white'}`}>
            <RefreshCw size={16} /> {t('createWallet.tabGenerate')}
          </button>
          <button onClick={() => setTab('vanity')} className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 sm:text-sm sm:gap-2 ${tab === 'vanity' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/10' : 'text-surface-400 hover:text-white'}`}>
            <Wallet size={16} /> {t('createWallet.tabVanity')}
          </button>
        </div>

        <div className="keyboard-scroll-target p-5 space-y-4 overflow-y-auto flex-1">
          {['generate', 'hdTree', 'advancedEntropy'].includes(tab) && (
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-surface-700 bg-surface-900/60 p-1">
              <button type="button" onClick={() => setTab('generate')} className={`rounded-lg px-2 py-2 text-[11px] font-bold transition-colors sm:text-xs ${tab === 'generate' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-300 hover:bg-surface-800'}`}>
                <RefreshCw size={14} className="mx-auto mb-0.5" /> {t('createWallet.tabGenerate')}
              </button>
              <button type="button" onClick={() => setTab('hdTree')} className={`rounded-lg px-2 py-2 text-[11px] font-bold transition-colors sm:text-xs ${tab === 'hdTree' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-300 hover:bg-surface-800'}`}>
                <Trees size={14} className="mx-auto mb-0.5" /> {t('createWallet.tabHdTree')}
              </button>
              <button type="button" onClick={() => setTab('advancedEntropy')} className={`rounded-lg px-2 py-2 text-[11px] font-bold transition-colors sm:text-xs ${tab === 'advancedEntropy' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-300 hover:bg-surface-800'}`}>
                <Sparkles size={14} className="mx-auto mb-0.5" /> {t('createWallet.tabAdvancedEntropy')}
              </button>
            </div>
          )}
          {(tab === 'manual' || tab === 'generate') && (
            <section className={`rounded-xl border transition-colors overflow-hidden ${postQuantumMode ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/40'}`}>
              <div 
                className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-700/50 transition-colors"
                onClick={() => setShowPostQuantumOptions(!showPostQuantumOptions)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <ShieldCheck size={18} className={`shrink-0 ${postQuantumMode ? 'text-emerald-500 dark:text-emerald-400' : 'text-surface-400'}`} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[11px] font-semibold text-surface-900 dark:text-white truncate">{t('keyHealth.pqCreateTitle')}</h3>
                      <span className="shrink-0 rounded bg-brand-500/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                        {t('keyHealth.pqAdvancedBadge')}
                      </span>
                    </div>
                    <p className="text-[9px] text-surface-500 dark:text-surface-400 mt-0.5 truncate">{t('keyHealth.pqCreateDesc')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={postQuantumMode}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPostQuantumMode(!postQuantumMode);
                      if (!postQuantumMode && !showPostQuantumOptions) setShowPostQuantumOptions(true);
                    }}
                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${postQuantumMode ? 'bg-emerald-500' : 'bg-surface-300 dark:bg-surface-600'}`}
                  >
                    <span className="sr-only">{postQuantumMode ? t('common.enabled') : t('common.disabled')}</span>
                    <span aria-hidden="true" className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${postQuantumMode ? 'translate-x-1.5' : '-translate-x-1.5'}`} />
                  </button>
                  <ChevronDown size={14} className={`text-surface-400 transition-transform ${showPostQuantumOptions ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {showPostQuantumOptions && (
                <div className="px-2.5 pb-2.5">
                  <div className="space-y-2.5 pt-2.5 border-t border-surface-200 dark:border-surface-700/50">
                    <div className="flex flex-col">
                      <div className="mb-1.5 text-[9px] font-bold text-surface-600 dark:text-surface-400">
                        {t('keyHealth.rotationCadence')}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1.5 w-full">
                        {[
                          { value: 6, label: t('keyHealth.rotation6mo'), desc: t('keyHealth.rotation6moDesc') },
                          { value: 12, label: t('keyHealth.rotation1y'), desc: t('keyHealth.rotation1yDesc') },
                          { value: 36, label: t('keyHealth.rotation3y'), desc: t('keyHealth.rotation3yDesc') },
                        ].map(option => {
                          const active = rotationReminderMonths === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setRotationReminderMonths(option.value)}
                              className={`flex-1 flex flex-col items-start rounded border p-1.5 transition-colors ${active ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-100 shadow-sm' : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900/70 text-surface-600 dark:text-surface-300 hover:border-surface-300 dark:hover:border-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className={`flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-300 dark:border-surface-600'}`}>
                                  {active && <Check size={6} />}
                                </span>
                                <span className="text-[10px] font-bold">{option.label}</span>
                              </div>
                              <span className="text-[8px] leading-snug opacity-80 pl-3.5 text-left">{option.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {postQuantumMode && (
                      <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-[9px] leading-relaxed text-emerald-800 dark:text-emerald-200 w-full flex items-start gap-1">
                        <Info size={10} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{t('keyHealth.pqBetaWarning')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Manual Entry Tab ── */}
          {tab === 'manual' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.walletName')}</label>
                <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)} placeholder={t('createWallet.walletNamePlaceholder')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.address')} <span className="text-surface-600">{t('createWallet.addressRequired')}</span></label>
                <div className="flex gap-2">
                  <input type="text" value={manualAddress} onChange={(e) => { setManualAddress(e.target.value); checkDuplicate(e.target.value); }} placeholder="0x..."
                    className={`flex-1 bg-surface-800 border rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none placeholder:text-surface-600 ${duplicateWarning ? 'border-yellow-500/50 focus:border-yellow-500' : 'border-surface-700 focus:border-brand-500'}`} />
                  <button onClick={() => setShowQRScanner(true)} className="btn-glow flex-shrink-0 bg-surface-800 border border-surface-700 hover:bg-surface-700 text-brand-400 px-3 rounded-lg transition-colors" title={t('createWallet.scanQR')}>
                    <Camera size={18} />
                  </button>
                </div>
                {duplicateWarning && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-yellow-400 text-xs"><AlertTriangle size={12} /><span>{t('createWallet.duplicateWarning')}</span></div>
                )}
                <p className="text-[11px] text-surface-500 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.addressExplain')}</p>
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.network')}</label>
                <div
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 flex justify-between items-center cursor-pointer hover:bg-surface-700/50 transition-colors"
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                >
                  <span>{manualNetwork}</span>
                  <ChevronDown size={16} className={`text-surface-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showNetworkDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNetworkDropdown(false)}></div>
                    <div className="absolute z-20 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                      {NETWORKS.map(n => (
                        <div
                          key={n}
                          className={`px-4 py-3 text-sm cursor-pointer transition-colors ${manualNetwork === n ? 'bg-brand-500/10 text-brand-400' : 'text-white hover:bg-surface-700'}`}
                          onClick={() => { setManualNetwork(n); setShowNetworkDropdown(false); }}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.privateKey')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <PasswordInput value={manualPK} onChange={(e) => setManualPK(e.target.value)} placeholder={t('createWallet.privateKey') + '...'}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <p className="text-[11px] text-red-400/70 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.pkExplain')}</p>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.seedPhrase')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <SecureTextarea value={manualSeed} onChange={(e) => setManualSeed(e.target.value)} placeholder="word1 word2 word3 ..." rows={2}
                  secureLabel={t('createWallet.seedPhrase')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
                <p className="text-[11px] text-surface-500 mt-1 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.seedExplain')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.derivationPath')}</label>
                <input type="text" value={manualDerivationPath} onChange={(e) => setManualDerivationPath(e.target.value)} placeholder="m/44'/60'/0'/0/0"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <p className="text-[11px] text-surface-500 mt-1 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.derivationPathHelp')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.balance')} <span className="text-surface-600">({t('createWallet.optional')})</span></label>
                <input type="text" inputMode="decimal" value={formatAmountInput(manualBalance)} onChange={(e) => setManualBalance(normalizeAmountInput(e.target.value))} placeholder="0.00"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.notes')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder={t('createWallet.notesPlaceholder')} rows={2}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
              </div>
            </div>
          )}

          {/* ── Generate Tab ── */}
          {tab === 'generate' && (
            <div className="flex flex-col space-y-4">
              {generating ? (
                <div className="text-center py-10 relative">
                  <style>{`
                    @keyframes floatUpFade {
                      0% { opacity: 0; transform: translateY(20px) scale(0.9); }
                      20% { opacity: 1; transform: translateY(0px) scale(1.1); }
                      100% { opacity: 0; transform: translateY(-50px) scale(1); }
                    }
                    .animate-float-up-fade {
                      animation: floatUpFade 1.2s ease-out forwards;
                    }
                  `}</style>

                  <div className="relative h-24 flex items-end justify-center overflow-hidden mb-4">
                    {floatingEffects.map(effect => (
                      <div key={effect.key} className="absolute bottom-0 text-center animate-float-up-fade pointer-events-none">
                        <span className="text-brand-400 font-black text-3xl drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">+{effect.count}</span>
                        <p className="text-[10px] text-brand-300/80 font-mono mt-1 bg-surface-900/80 px-2 py-0.5 rounded-full border border-surface-700/50 shadow-lg">{(effect.address || '').substring(0,8)}...{(effect.address || '').substring(34)}</p>
                      </div>
                    ))}
                    {floatingEffects.length === 0 && (
                      <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center">
                        <RefreshCw size={32} className="text-brand-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{t('createWallet.bulkGenerating', { count: generateCount }) || 'Generating Wallets...'}</h3>
                  <div className="w-full bg-surface-800 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-brand-600 to-brand-400 h-2.5 rounded-full transition-all duration-300 relative overflow-hidden" style={{ width: `${(generateProgress / (Number.parseInt(String(generateCount), 10)||1)) * 100}%` }}>
                       <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-sm text-surface-400 font-medium">{generateProgress} / {generateCount}</p>
                </div>
              ) : bulkResult ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t('createWallet.bulkSuccess', { count: bulkResult.count }) || `Successfully generated and saved ${bulkResult.count} wallets.`}</h3>
                  <div className="bg-surface-800 rounded-lg p-4 text-left space-y-3 mb-6">
                    <div className="flex justify-between items-center border-b border-surface-700 pb-2">
                      <span className="text-surface-400 text-sm">{t('createWallet.bulkSize') || 'Estimated Data Size'}</span>
                      <span className="text-white font-mono text-sm">{((bulkResult.sizeBytes || 0) / 1024).toFixed(2)} KB</span>
                    </div>
                    {bulkResult.storageInfo && (
                      <div className="flex justify-between items-center">
                        <span className="text-surface-400 text-sm">{t('createWallet.bulkStorage') || 'Available Storage'}</span>
                        <span className="text-white font-mono text-sm">{(((bulkResult.storageInfo.quota || 0) - (bulkResult.storageInfo.usage || 0)) / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    )}
                  </div>
                  <button onClick={onClose} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-lg w-full transition-colors">
                    {t('common.close')}
                  </button>
                </div>
              ) : generatedWallets.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={32} className="text-brand-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{t('createWallet.bulkTitle') || 'Bulk Generate Wallets'}</h3>
                  <p className="text-surface-400 text-sm mb-6">{t('createWallet.generateInfo')}</p>

                  <div className="mb-6 text-left">
                    <label className="block text-xs font-medium text-surface-400 mb-2">{t('createWallet.bulkQuantity') || 'Number of wallets to generate'}</label>
                    <div className="flex items-center bg-surface-800 border border-surface-700 rounded-lg overflow-hidden mb-3 focus-within:border-brand-500 transition-colors">
                      <button onClick={() => setGenerateCount(Math.max(1, (Number.parseInt(String(generateCount), 10) || 1) - 1))} className="px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors border-r border-surface-700 active:bg-surface-600">-</button>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(e.target.value)}
                        className="flex-1 bg-transparent px-4 py-3 text-white text-center font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button onClick={() => setGenerateCount(Math.min(10000, (Number.parseInt(String(generateCount), 10) || 1) + 1))} className="px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors border-l border-surface-700 active:bg-surface-600">+</button>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[1, 5, 10, 50, 100, 200].map(num => (
                        <button key={num} onClick={() => setGenerateCount(num)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${Number.parseInt(String(generateCount), 10) === num ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'}`}>
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6 text-left">
                    <label className="block text-xs font-medium text-surface-400 mb-2">{t('createWallet.seedLength')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[12, 24].map(words => (
                        <button
                          key={words}
                          type="button"
                          onClick={() => setSeedWordCount(words)}
                          className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                            seedWordCount === words
                              ? 'border-brand-500/50 bg-brand-500/15 text-white'
                              : 'border-surface-700 bg-surface-800/60 text-surface-300 hover:border-surface-600 hover:text-white'
                          }`}
                        >
                          {t(words === 24 ? 'createWallet.mnemonic24' : 'createWallet.mnemonic12')}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-surface-500">{t('createWallet.seedLengthHint')}</p>
                  </div>

                  <div className="bg-surface-800/30 border border-surface-700/50 rounded-lg p-3 mb-6 text-left">
                    <p className="text-[11px] text-surface-300 leading-relaxed flex items-start gap-1.5 mb-3">
                      <Info size={12} className="text-brand-400 mt-0.5 flex-shrink-0" />
                      {t('createWallet.generateExplain')}
                    </p>

                    {t('createWallet.mathSteps') && Array.isArray(mathStepItems) && (
                      <div className="space-y-2 mt-2">
                        {mathStepItems.map((step, idx) => {
                          const theme = MATH_THEMES[idx % MATH_THEMES.length];
                          const isExpanded = expandedStep === idx;
                          return (
                            <div key={idx} className={`border ${theme.border} ${theme.bg} rounded-lg overflow-hidden transition-all duration-300`}>
                              <button onClick={() => setExpandedStep(isExpanded ? null : idx)} className="w-full px-3 py-2 flex items-center justify-between text-left focus:outline-none">
                                <span className={`text-[11px] font-semibold ${theme.text}`}>{step.title}</span>
                                <ChevronDown size={14} className={`${theme.text} transition-transform ${isExpanded ? 'rotate-180' : ''} flex-shrink-0 ml-2`} />
                              </button>
                              {isExpanded && (
                                <div className={`px-3 pb-3 text-[10px] text-surface-300 space-y-2 border-t ${theme.contentBorder} pt-2`}>
                                  <div>
                                    <span className={`font-semibold ${theme.label}`}>{t('createWallet.mathSteps.task')}: </span>
                                    <span className="opacity-90">{step.task}</span>
                                  </div>
                                  <div>
                                    <span className={`font-semibold ${theme.label}`}>{step.type === 'meaning' ? t('createWallet.mathSteps.meaning') : t('createWallet.mathSteps.result')}: </span>
                                    <span className="opacity-90">{step.result}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={generateWallet} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 w-full">
                    <Plus size={18} /> {t('createWallet.bulkGenerateBtn') || 'Generate & Save'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 pb-20">
                  {generatedWallets.map((w, index) => (
                    <div key={index} className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 space-y-4">
                      {generatedWallets.length === 1 ? (
                        <div>
                          <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.walletName')}</label>
                          <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)}
                            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500" />
                        </div>
                      ) : (
                        <h4 className="text-sm font-medium text-white">{w.name}</h4>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.address')}</label>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[13px] bg-blue-100/50 dark:bg-blue-500/20 px-2 rounded truncate max-w-[200px] sm:max-w-[300px]">
                              {w.address?.slice(0, 8)}...{w.address?.slice(-6)}
                            </span>
                            <span className="text-xs text-slate-400 font-mono flex-shrink-0">
                              {(w as GeneratedWallet).vanityScore !== undefined ? `${t('createWallet.vanityExtraScore', { score: (w as GeneratedWallet).vanityScore })}` : ''}
                            </span>
                          </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.privateKey')}</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-surface-800 text-red-300 p-3 rounded-lg text-xs break-all font-mono">{w.privateKey}</code>
                          <button onClick={() => handleCopy(w.privateKey || '', `pk_${index}`)} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg">
                            {copiedField === `pk_${index}` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      {w.mnemonic && (
                        <div>
                          <label className="block text-xs font-medium text-surface-400 mb-1">
                            {w.mnemonic.split(' ').length >= 24 ? t('createWallet.mnemonic24') : t('createWallet.mnemonic12')}
                          </label>
                          <div className="bg-surface-800 p-3 rounded-lg">
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              {w.mnemonic.split(' ').map((word, i) => (
                                <span key={i} className="text-[10px] text-surface-200 bg-surface-700 px-1 py-1 rounded text-center truncate">
                                  <span className="text-surface-500 mr-1">{i + 1}.</span>{word}
                                </span>
                              ))}
                            </div>
                            <button onClick={() => handleCopy(w.mnemonic || '', `mn_${index}`)} className="text-xs text-surface-400 hover:text-brand-400 flex items-center gap-1">
                              {copiedField === `mn_${index}` ? <><Check size={12} className="text-green-400" /> {t('common.copied')}</> : <><Copy size={12} /> {t('createWallet.copyMnemonic')}</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                    ⚠️ <strong>{t('createWallet.backupWarning')}</strong>
                  </div>

                  <button onClick={() => { setGeneratedWallets([]); setGenerateCount(1); }} className="text-xs text-surface-500 hover:text-brand-400 flex items-center gap-1 mx-auto pb-4">
                    <RefreshCw size={12} /> {t('createWallet.generateAnother')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── HD Wallet Explorer Tab ── */}
          {tab === 'hdTree' && (
            <HDWalletTreeVisualizer onSaveWallet={handleSaveHDWallet} existingWallets={existingWallets} />
          )}

          {/* ── Advanced Entropy Tab ── */}
          {tab === 'advancedEntropy' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles size={16} className="text-brand-400" />
                  {t('createWallet.advancedEntropyTitle')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                  {t('createWallet.advancedEntropyInfo')}
                </p>
              </div>
              <AdvancedEntropyPanel onGenerated={handleAdvancedEntropyGenerated} />
            </section>
          )}

          {/* ── Vanity Tab ── */}
          {tab === 'vanity' && (
            <div className="vanity-theme-sync space-y-6 pb-20">
              <div className={`mb-4 space-y-4 rounded-xl border border-surface-200 bg-surface-50/80 p-4 shadow-sm shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-800/40 dark:shadow-none ${vanityRunActive ? 'hidden' : ''}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-surface-950 dark:text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-brand-400" />
                      {t('createWallet.vanityTitle')}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('createWallet.vanitySubtitle')}</p>
                  </div>
                  <div className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${vanityDifficultyTone}`}>
                    {t(`createWallet.vanityDifficulty_${vanityDifficultyKey}`)}
                  </div>
                </div>

                <div className="rounded-xl border border-brand-500/20 bg-brand-500/5">
                  <button
                    type="button"
                    onClick={() => toggleVanitySection('primary')}
                    className="w-full flex items-center justify-between p-3 transition-colors hover:bg-brand-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound size={16} className="text-brand-400" />
                      <span className="text-sm font-bold text-brand-700 dark:text-brand-200">{t('createWallet.seedPhrase')} / {t('createWallet.privateKey')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-200">
                        {vanityGenerationMode === 'mnemonic' ? t('createWallet.seedPhrase') : t('createWallet.privateKey')}
                      </span>
                      <ChevronDown size={16} className={`text-brand-400 transition-transform ${vanityExpandedSections.primary ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {vanityExpandedSections.primary && (
                    <div className="px-3 pb-3 space-y-3">
                      <p className="text-[11px] leading-relaxed text-surface-400">
                        {t('createWallet.vanityGenerationModeDesc')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={vanityGenerating}
                          onClick={() => setVanityGenerationMode('privateKey')}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${vanityGenerationMode === 'privateKey' ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                        >
                          {t('createWallet.privateKey')}
                        </button>
                        <button
                          type="button"
                          disabled={vanityGenerating}
                          onClick={() => setVanityGenerationMode('mnemonic')}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${vanityGenerationMode === 'mnemonic' ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                        >
                          {t('createWallet.seedPhrase')}
                        </button>
                      </div>

                      {vanityGenerationMode === 'mnemonic' && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-500/10">
                          <button
                            type="button"
                            disabled={vanityGenerating}
                            onClick={() => setVanityMnemonicWords(12)}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${vanityMnemonicWords === 12 ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500'} disabled:opacity-50`}
                          >
                            12 {t('createWallet.words')}
                          </button>
                          <button
                            type="button"
                            disabled={vanityGenerating}
                            onClick={() => setVanityMnemonicWords(24)}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${vanityMnemonicWords === 24 ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-200' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500'} disabled:opacity-50`}
                          >
                            24 {t('createWallet.words')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <section className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50/70 dark:border-surface-700 dark:bg-surface-900/50">
                  <button type="button" onClick={() => toggleVanitySection('target')} className="flex w-full items-center justify-between border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-brand-400" />
                      <span className="text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityTitle') || 'Mục tiêu tìm kiếm'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(vanityPrefix || vanitySuffix) && <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-300">{vanityPrefix}...{vanitySuffix}</span>}
                      <ChevronDown size={16} className={`text-surface-400 transition-transform ${vanityExpandedSections.target ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {vanityExpandedSections.target && (
                    <div className="space-y-4 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-surface-400">{t('createWallet.vanityPrefix') || 'Prefix'}</label>
                          <input type="text" value={vanityPrefix} onChange={(e) => setVanityPrefix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. 123" disabled={vanityGenerating}
                            className={`w-full rounded-lg border bg-surface-50 px-4 py-3 font-mono text-sm text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-900 dark:text-white ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'}`} />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityPrefixHint')}</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-surface-400">{t('createWallet.vanitySuffix') || 'Suffix'}</label>
                          <input type="text" value={vanitySuffix} onChange={(e) => setVanitySuffix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. abc" disabled={vanityGenerating}
                            className={`w-full rounded-lg border bg-surface-50 px-4 py-3 font-mono text-sm text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-900 dark:text-white ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'}`} />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanitySuffixHint')}</p>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                            {t('createWallet.vanityPresets')}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setVanityPresetsExpanded(prev => !prev)}
                              className="rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-surface-600 transition-colors hover:border-brand-500 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-brand-400 dark:hover:text-brand-300"
                            >
                              {vanityPresetsExpanded ? t('common.showLess') : t('common.showMore', { count: vanityHiddenPresetCount })}
                            </button>
                            {(vanityPrefix || vanitySuffix) && (
                              <button
                                type="button"
                                disabled={vanityGenerating}
                                onClick={() => {
                                  setVanityPrefix('');
                                  setVanitySuffix('');
                                }}
                                className="rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-surface-600 transition-colors hover:border-surface-300 hover:text-surface-950 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-500 dark:hover:text-white"
                              >
                                {t('createWallet.clearPattern')}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {visibleVanityPresetGroups.map((group) => (
                            <div
                              key={group.key}
                              className="min-w-0 rounded-xl border border-surface-200/80 bg-white/70 p-2.5 dark:border-surface-700/80 dark:bg-surface-900/70"
                            >
                              <div className="mb-2 flex min-w-0 items-center gap-1.5">
                                <span
                                  aria-hidden="true"
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-xs dark:bg-brand-500/15"
                                >
                                  {group.icon}
                                </span>
                                <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300">
                                  {t(`createWallet.${group.labelKey}`)}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {group.items.map((preset) => {
                                  const active = vanitySuffixClean === preset.toLowerCase();
                                  return (
                                    <button
                                      key={preset}
                                      type="button"
                                      disabled={vanityGenerating}
                                      onClick={() => applyVanitySuffixPattern(preset)}
                                      className={`min-w-0 rounded-lg border px-2 py-1.5 font-mono text-[11px] font-bold transition-colors disabled:opacity-50 ${
                                        active
                                          ? 'border-brand-500 bg-brand-500/15 text-brand-700 shadow-sm shadow-brand-500/10 dark:text-brand-200'
                                          : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-brand-500 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-950/50 dark:text-surface-200 dark:hover:text-brand-300'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 rounded-xl border border-surface-200/80 bg-white/70 p-2.5 dark:border-surface-700/80 dark:bg-surface-900/70">
                          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-surface-600 dark:text-surface-300">
                            {t('createWallet.vanityCustomPattern')}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={vanityCustomPattern}
                              disabled={vanityGenerating}
                              onChange={(e) => setVanityCustomPattern(e.target.value.replace(/\s/g, '').slice(0, 12))}
                              placeholder="e.g. babe"
                              className={`min-w-0 flex-1 rounded-lg border bg-surface-50 px-3 py-2 font-mono text-xs font-semibold text-surface-950 focus:outline-none disabled:opacity-50 dark:bg-surface-950/50 dark:text-white ${
                                vanityCustomPattern && !VANITY_HEX_PATTERN.test(vanityCustomPattern)
                                  ? 'border-red-500/60 focus:border-red-400'
                                  : 'border-surface-200 focus:border-brand-500 dark:border-surface-700'
                              }`}
                            />
                            <button
                              type="button"
                              disabled={vanityGenerating || !vanityCustomPattern || !VANITY_HEX_PATTERN.test(vanityCustomPattern)}
                              onClick={() => applyVanitySuffixPattern(vanityCustomPattern)}
                              className="shrink-0 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-200"
                            >
                              {t('createWallet.vanityApplyCustom')}
                            </button>
                            <button
                              type="button"
                              disabled={vanityGenerating || !vanityCustomPattern}
                              onClick={() => {
                                const appliedCustomPattern = vanityCustomPattern.trim().toLowerCase();
                                setVanityCustomPattern('');
                                if (vanitySuffixClean === appliedCustomPattern) setVanitySuffix('');
                              }}
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                              className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {vanityHasPattern && vanityDifficultyAnalyzer ? (
                        <div className={`rounded-xl border ${vanityDifficultyAnalyzer.diffTone} p-4`}>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="flex min-w-0 items-center gap-2 text-sm font-bold">
                              <BrainCircuit size={16} className="shrink-0" /> <span className="min-w-0 truncate">{t('createWallet.vanityPatternAnalyzer')}</span>
                            </h4>
                            <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${vanityDifficultyAnalyzer.difficultyBadgeTone}`}>
                              {vanityDifficultyAnalyzer.difficultyLabel}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <Gauge size={14} /> {t('createWallet.vanityProbability')}
                              </div>
                              <div className="font-mono text-sm font-extrabold">1 / {formatCompactNumber(vanityDifficultyAnalyzer.combinations)}</div>
                            </div>
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <Timer size={14} /> {t('createWallet.vanityEstimatedTime')}
                              </div>
                              <div className="text-sm font-extrabold">{vanityDifficultyAnalyzer.timeLabel}</div>
                            </div>
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <Target size={14} /> {t('createWallet.vanityPatternType')}
                              </div>
                              <div className="text-sm font-extrabold">{vanityDifficultyAnalyzer.hasBoth ? t('createWallet.vanityPatternBoth') : (vanityPrefixClean ? t('createWallet.vanityPatternPrefix') : t('createWallet.vanityPatternSuffix'))}</div>
                            </div>
                            <div className="rounded-lg bg-white/45 p-3 ring-1 ring-current/10 dark:bg-black/10">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-70">
                                <ShieldCheck size={14} /> {t('createWallet.vanityLocal')}
                              </div>
                              <div className="text-sm font-extrabold">{vanitySpeed > 0 ? t('createWallet.vanitySpeedValue', { speed: formatCompactNumber(Math.round(vanityDifficultyAnalyzer.effectiveSpeed)) }) : t('createWallet.vanityOffline')}</div>
                              <div className="mt-0.5 text-[10px] font-semibold opacity-70">{vanityDifficultyAnalyzer.sourceLabel}</div>
                            </div>
                          </div>

                          {vanityDifficultyAnalyzer.hasBoth && (
                            <p className="mt-3 flex items-start gap-1.5 rounded bg-white/45 p-2 text-[11px] opacity-80 dark:bg-black/10">
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />
                              {t('createWallet.vanityBothWarning')}
                            </p>
                          )}
                          {vanityPatternLength > 6 && (
                            <p className="mt-2 flex items-start gap-1.5 rounded bg-white/45 p-2 text-[11px] opacity-80 dark:bg-black/10">
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />
                              {t('createWallet.vanityLengthWarning')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 dark:border-brand-400/20 dark:bg-brand-500/10">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-300">
                              <Sparkles size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityTitle')}</h4>
                              <p className="mt-1 text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                                {t('createWallet.vanityDescription')}
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <button
                                  type="button"
                                  disabled={vanityGenerating}
                                  onClick={() => setVanitySuffix('888')}
                                  className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-left transition-colors hover:border-brand-500 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900"
                                >
                                  <span className="block text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityPresetLucky')}</span>
                                  <span className="font-mono text-sm font-extrabold text-surface-950 dark:text-white">...888</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={vanityGenerating}
                                  onClick={() => setVanitySuffix('abc')}
                                  className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-left transition-colors hover:border-brand-500 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900"
                                >
                                  <span className="block text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityPresetEasy')}</span>
                                  <span className="font-mono text-sm font-extrabold text-surface-950 dark:text-white">...abc</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={vanityGenerating}
                                  onClick={() => setVanitySuffix('0000')}
                                  className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-left transition-colors hover:border-brand-500 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900"
                                >
                                  <span className="block text-[10px] font-bold uppercase tracking-wide text-surface-500">{t('createWallet.vanityPresetPremium')}</span>
                                  <span className="font-mono text-sm font-extrabold text-surface-950 dark:text-white">...0000</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50/70 dark:border-surface-700 dark:bg-surface-900/50">
                  <button type="button" onClick={() => toggleVanitySection('storage')} className="flex w-full items-center justify-between gap-3 border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
                    <div className="flex min-w-0 items-center gap-2">
                      <Folder size={16} className="shrink-0 text-blue-400" />
                      <span className="shrink-0 text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityStorage')}</span>
                      <span className="min-w-0 truncate rounded-full border border-surface-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-surface-600 dark:border-surface-700 dark:bg-surface-950/40 dark:text-surface-300">
                        {vanityStorageSummary}
                      </span>
                    </div>
                    <ChevronDown size={16} className={`shrink-0 text-surface-400 transition-transform ${vanityExpandedSections.storage ? 'rotate-180' : ''}`} />
                  </button>
                  {vanityExpandedSections.storage && (
                    <div className="space-y-4 p-4">
                      <div className="grid gap-3 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                            <Copy size={13} /> {t('createWallet.vanityQuantity')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={vanityTargetCount}
                            disabled={vanityGenerating}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setVanityTargetCount('');
                                return;
                              }
                              setVanityTargetCount(Math.max(1, Math.floor(Number(raw) || 1)));
                            }}
                            onBlur={() => setVanityTargetCount(vanitySafeTargetCount)}
                            className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm font-semibold text-surface-950 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                          />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityQuantityHint')}</p>
                        </div>

                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                            <Wallet size={13} /> {t('createWallet.network')}
                          </label>
                          <InlineSelect
                            value={vanityNetwork}
                            disabled={vanityGenerating}
                            onChange={setVanityNetwork}
                            options={vanityNetworkOptions}
                          />
                        </div>

                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                            <Folder size={13} /> {t('home.folders')}
                          </label>
                          <InlineSelect
                            value={vanityFolder}
                            disabled={vanityGenerating}
                            onChange={setVanityFolder}
                            options={vanityFolderOptions}
                          />
                          <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityFolderHint')}</p>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                          <Tag size={13} /> {t('createWallet.tags')}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={vanityTagInput}
                            disabled={vanityGenerating}
                            onChange={(e) => setVanityTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addVanityTag();
                              }
                            }}
                            placeholder={t('createWallet.tagPlaceholder')}
                            className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-sm text-surface-950 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:placeholder:text-surface-600"
                          />
                          <button
                            type="button"
                            disabled={vanityGenerating || !vanityTagInput.trim()}
                            onClick={addVanityTag}
                            className="rounded-lg border border-surface-200 bg-surface-50 px-3 text-sm font-semibold text-surface-700 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:text-brand-300"
                          >
                            {t('common.add')}
                          </button>
                        </div>
                        {(vanityTags.length > 0 || allTags.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {vanityTags.map(tag => (
                              <button
                                key={tag}
                                type="button"
                                disabled={vanityGenerating}
                                onClick={() => setVanityTags(prev => prev.filter(item => item !== tag))}
                                className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 disabled:opacity-50 dark:text-brand-300"
                              >
                                {tag} ×
                              </button>
                            ))}
                            {allTags.filter(tag => !vanityTags.includes(tag)).slice(0, 6).map(tag => (
                              <button
                                key={tag}
                                type="button"
                                disabled={vanityGenerating}
                                onClick={() => setVanityTags(prev => [...prev, tag])}
                                className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 text-xs font-semibold text-surface-600 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:text-brand-300"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50/70 dark:border-surface-700 dark:bg-surface-900/50">
                  <button type="button" onClick={() => toggleVanitySection('performance')} className="flex w-full items-center justify-between border-b border-surface-200 bg-surface-50/80 px-4 py-3 transition-colors hover:bg-surface-100 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:bg-surface-800/60">
                    <div className="flex items-center gap-2">
                      <Gauge size={16} className="text-orange-400" />
                      <span className="text-sm font-bold text-surface-950 dark:text-white">{t('createWallet.vanityPerformanceSafety')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-300 uppercase">{vanityPerformanceMode}</span>
                      <ChevronDown size={16} className={`text-surface-400 transition-transform ${vanityExpandedSections.performance ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {vanityExpandedSections.performance && (
                    <div className="space-y-4 p-4">
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                          <Gauge size={13} /> {t('createWallet.vanityPerformance')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['eco', 'balanced', 'fast'] as VanityPerformanceMode[]).map(mode => (
                            <button
                              key={mode}
                              type="button"
                              disabled={vanityGenerating}
                              onClick={() => setVanityPerformanceMode(mode)}
                              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanityPerformanceMode === mode ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                            >
                              {t(`createWallet.vanityPerformance_${mode}`)}
                            </button>
                          ))}
                        </div>
                          <p className="mt-1 text-[11px] text-surface-500">
                            {t(`createWallet.vanityPerformanceHint_${vanityPerformanceMode}`)} · {t('createWallet.vanityWorkers', { count: vanityWorkerCount })} · {t('createWallet.vanityBatch', { count: vanityBatchSize })}
                          </p>
                      </div>

                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                          <Timer size={13} /> {t('createWallet.vanityTimeLimit')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {VANITY_TIME_LIMITS.map((seconds) => (
                            <button
                              key={seconds}
                              type="button"
                              disabled={vanityGenerating}
                              onClick={() => setVanityTimeLimit(seconds)}
                              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanityTimeLimit === seconds ? 'border-brand-500 bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-500'} disabled:opacity-50`}
                            >
                              {seconds === 0 ? t('createWallet.vanityNoLimit') : formatVanitySeconds(seconds)}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={vanityTimeLimit}
                            disabled={vanityGenerating}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setVanityTimeLimit(Math.max(0, Math.floor(Number(raw) || 0)));
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-950 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                            placeholder={t('createWallet.vanityCustomTimePlaceholder')}
                          />
                          <span className="shrink-0 text-[11px] font-semibold text-surface-500">{t('createWallet.vanityTimeSeconds', { seconds: '' }).trim()}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-orange-500" />
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-orange-700 dark:text-orange-100">{t('createWallet.vanityNoticeTitle')}</h4>
                            <p className="mt-1 text-xs leading-relaxed text-orange-700/85 dark:text-orange-100/75">{t('createWallet.vanityHeatDesc')}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-orange-700/80 dark:text-orange-100/70">
                              <li>{t('createWallet.vanitySafeTipShortPattern')}</li>
                              <li>{t('createWallet.vanitySafeTipNoHotCharge')}</li>
                              <li>{t('createWallet.vanityHeatCooling')}</li>
                              <li>{t('createWallet.vanitySafeTipVentilation')}</li>
                              <li>{t('createWallet.vanityHeatRisk')}</li>
                              <li>{t('createWallet.vanityHeatFix')}</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <div className="flex items-start gap-3">
                          <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                          <div>
                            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-100">{t('createWallet.vanitySecurityTitle')}</h4>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-700/85 dark:text-emerald-100/75">{t('createWallet.vanitySecurityDesc')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={vanityCaptureExtras}
                        disabled={vanityGenerating}
                        onChange={(event) => setVanityCaptureExtras(event.target.checked)}
                        className="h-4 w-4 shrink-0 accent-cyan-500 disabled:opacity-50"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-cyan-700 dark:text-cyan-100">{t('createWallet.vanityExtraCaptureTitle')}</span>
                      </span>
                    </label>
                    <button type="button" onClick={() => toggleVanitySection('extraFilters')} className="ml-4 p-1">
                      <ChevronDown size={16} className={`text-cyan-600 dark:text-cyan-400 transition-transform ${vanityExpandedSections.extraFilters ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {vanityCaptureExtras && vanityExpandedSections.extraFilters && (
                    <div className="p-4 space-y-4 bg-cyan-50/50 dark:bg-surface-950/40">
                      <p className="text-[11px] leading-relaxed text-cyan-700/80 dark:text-cyan-100/75">{t('createWallet.vanityExtraCaptureDesc')}</p>
                      <div className="grid gap-3 lg:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-cyan-700/80 dark:text-cyan-100/80">{t('createWallet.vanityExtraLimit')}</label>
                          <div className="grid grid-cols-2 gap-2">
                            {VANITY_EXTRA_LIMITS.map(count => (
                              <button
                                key={count}
                                type="button"
                                disabled={vanityGenerating}
                                onClick={() => setVanityExtraLimit(count)}
                                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanitySafeExtraLimit === count ? 'border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-100' : 'border-surface-200 bg-surface-50 text-surface-700 hover:border-cyan-400/60 hover:bg-cyan-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-cyan-500/50'} disabled:opacity-50`}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={vanityExtraLimit}
                            disabled={vanityGenerating}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setVanityExtraLimit('');
                                return;
                              }
                              setVanityExtraLimit(Math.max(1, Math.min(500, Number(raw) || 1)));
                            }}
                            onBlur={() => setVanityExtraLimit(vanitySafeExtraLimit)}
                            placeholder={t('common.custom')}
                            className="mt-2 w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs font-semibold text-surface-950 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-cyan-700/80 dark:text-cyan-100/80">
                            <Folder size={13} /> {t('createWallet.vanityExtraFolder')}
                          </label>
                          <InlineSelect
                            value={vanityExtraFolder}
                            disabled={vanityGenerating}
                            onChange={setVanityExtraFolder}
                            options={vanityExtraFolderOptions}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-cyan-800 dark:text-cyan-100">{t('createWallet.vanityExtraFilterTitle')}</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-cyan-700/75 dark:text-cyan-100/65">{t('createWallet.vanityExtraFilterDesc')}</p>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {VANITY_EXTRA_FILTER_KEYS.map((key) => {
                            const rule = vanitySafeExtraFilters[key];
                            const enabled = !!rule.enabled;
                            return (
                              <div key={key} className={`rounded-lg border p-2 transition-colors ${enabled ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-surface-200 bg-surface-50/80 dark:border-surface-700 dark:bg-surface-900/70'}`}>
                                <label className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    disabled={vanityGenerating}
                                    onChange={(event) => updateVanityExtraFilter(key, { enabled: event.target.checked })}
                                    className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-500 disabled:opacity-50"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-bold text-surface-950 dark:text-white">{t(`createWallet.vanityExtraFilter_${key}`)}</span>
                                    <span className="mt-0.5 block text-[11px] leading-relaxed text-surface-600 dark:text-surface-400">{t(`createWallet.vanityExtraFilterHint_${key}`)}</span>
                                  </span>
                                </label>
                                {key !== 'lucky' ? (
                                  <div className="mt-2 flex items-center gap-2 pl-6">
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-surface-500">{t('createWallet.vanityExtraFilterMin')}</span>
                                    <input
                                      type="number"
                                      min="3"
                                      max="12"
                                      value={rule.minRun || vanitySafeExtraMinRun}
                                      disabled={vanityGenerating || !enabled}
                                      onChange={(event) => updateVanityExtraFilter(key, { minRun: Math.max(3, Math.min(12, Number(event.target.value) || vanitySafeExtraMinRun)) })}
                                      className="w-16 rounded-md border border-surface-200 bg-surface-50 px-2 py-1 text-xs font-bold text-surface-950 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-950 dark:text-white"
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={(rule.patterns || []).join(', ')}
                                    disabled={vanityGenerating || !enabled}
                                    onChange={(event) => updateVanityExtraFilter(key, { patterns: event.target.value.split(',') })}
                                    placeholder="888, 666, 168"
                                    className="mt-2 w-full rounded-md border border-surface-200 bg-surface-50 px-2 py-1.5 text-xs font-semibold text-surface-950 placeholder:text-surface-400 focus:border-cyan-500 focus:outline-none disabled:opacity-50 dark:border-surface-700 dark:bg-surface-950 dark:text-white dark:placeholder:text-surface-500"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {vanityInvalidChars ? (
                  <div className="danger-note">
                    <AlertTriangle size={16} className="danger-note-icon" />
                    <span className="danger-note-body">{t('createWallet.vanityInvalidChars')}</span>
                  </div>
                ) : null}
              </div>

              {!vanityGenerating && !vanityPaused && allVanityWallets.length === 0 ? (
                <>
                {hasRecoverableVanitySession && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                        <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-200">{t('createWallet.vanitySessionAvailable')}</p>
                    <button type="button" onClick={() => void restoreVanitySession()} className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20">
                      {t('createWallet.vanitySessionRestore')}
                    </button>
                  </div>
                )}
                {vanityStopReason && (
                  <div className="warning-note flex items-start gap-2 rounded-xl border p-3 text-sm">
                    <AlertTriangle size={16} className="warning-note-icon mt-0.5 flex-shrink-0" />
                    <span className="warning-note-body">{vanityStopReason}</span>
                  </div>
                )}
                <button onClick={() => startVanity()} disabled={!vanityCanStart} className="group relative w-full overflow-hidden rounded-2xl border border-brand-500/50 bg-brand-500 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/40 disabled:translate-y-0 disabled:border-surface-300 disabled:bg-surface-200 disabled:text-surface-500 disabled:shadow-none disabled:cursor-not-allowed dark:border-brand-400/30 dark:bg-brand-500 dark:shadow-brand-500/20 dark:hover:bg-brand-400 dark:disabled:border-surface-700 dark:disabled:bg-surface-800 dark:disabled:text-surface-600 theme-amoled:border-brand-400/50 theme-amoled:bg-brand-500 theme-amoled:shadow-[0_0_24px_rgba(var(--color-brand-500),0.3)] theme-amoled:hover:bg-brand-400 theme-amoled:hover:shadow-[0_0_32px_rgba(var(--color-brand-500),0.4)]">
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center gap-2">
                    <RefreshCw size={18} />
                    {vanityHasPattern ? t('createWallet.startVanity') : t('createWallet.vanityNeedPattern')}
                  </span>
                </button>
                </>
              ) : vanityGenerating || vanityPaused ? (
                <div className="space-y-3">
                  <section className="rounded-xl border border-brand-200 bg-brand-50/80 p-4 shadow-sm dark:border-brand-500/25 dark:bg-brand-500/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-400/30 bg-brand-500/10 ${vanityPaused ? '' : 'animate-pulse'}`}>
                          {vanityPaused ? <Pause size={17} className="text-amber-300" /> : <Sparkles size={17} className="text-brand-300" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-surface-950 dark:text-white">{vanityPaused ? t('createWallet.vanityPaused') : t('createWallet.vanityGeneratingCount', { current: generatedWallets.length, total: vanitySafeTargetCount })}</p>
                          <p className="mt-0.5 text-[11px] text-surface-600 dark:text-surface-400">{vanityPrefixClean || vanitySuffixClean ? `0x${vanityPrefixClean}...${vanitySuffixClean}` : t('createWallet.vanityScanning')}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-brand-400/25 bg-brand-500/10 px-2 py-1 text-xs font-bold text-brand-200">{generatedWallets.length}/{vanitySafeTargetCount}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full border border-surface-200 bg-surface-100 dark:border-surface-700/50 dark:bg-surface-900">
                      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300 shadow-[0_0_8px_rgba(14,165,233,0.5)]" style={{ width: `${Math.max(vanityProgress, vanityGenerating ? 2 : 0)}%` }} />
                  </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                      <div className="rounded-lg border border-surface-200 bg-surface-50/85 p-2 dark:border-surface-700/70 dark:bg-surface-950/70">
                        <p className="text-surface-500">{t('createWallet.vanityScanned')}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-surface-950 dark:text-white">{formatCompactNumber(vanityScanned)}</p>
                      </div>
                      <div className="rounded-lg border border-surface-200 bg-surface-50/85 p-2 dark:border-surface-700/70 dark:bg-surface-950/70">
                        <p className="text-surface-500">{t('createWallet.vanitySpeed')}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-brand-700 dark:text-brand-200">{vanitySpeed > 0 ? t('createWallet.vanitySpeedValue', { speed: formatCompactNumber(vanitySpeed) }) : t('createWallet.vanitySpeedMeasuring')}</p>
                      </div>
                      <div className="rounded-lg border border-surface-200 bg-surface-50/85 p-2 dark:border-surface-700/70 dark:bg-surface-950/70">
                        <p className="text-surface-500">{t('createWallet.vanityElapsed')}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-surface-950 dark:text-white">{formatVanitySeconds(vanityTime)}</p>
                      </div>
                      <div className="rounded-lg border border-surface-200 bg-surface-50/85 p-2 dark:border-surface-700/70 dark:bg-surface-950/70">
                        <p className="text-surface-500">{t('createWallet.vanityEstimatedTime')}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-surface-950 dark:text-white">{vanitySpeed > 0 && vanityRemainingPrimary > 0 ? formatVanitySeconds(vanityEtaSeconds) : '--'}</p>
                      </div>
                      <div className="rounded-lg border border-surface-200 bg-surface-50/85 p-2 dark:border-surface-700/70 dark:bg-surface-950/70">
                        <p className="text-surface-500">{t('createWallet.vanityScanProgress')}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-surface-950 dark:text-white">{vanityProgressPercentLabel}</p>
                      </div>
                      <div className="rounded-lg border border-surface-200 bg-surface-50/85 p-2 dark:border-surface-700/70 dark:bg-surface-950/70">
                        <p className="text-surface-500">{t('createWallet.vanityThreadsBatch')}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-surface-950 dark:text-white">{vanityWorkerCount} × {formatCompactNumber(vanityBatchSize)}</p>
                      </div>
                      <div className="rounded-lg border border-surface-200 bg-surface-50/85 p-2 sm:col-span-3 dark:border-surface-700/70 dark:bg-surface-950/70">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-surface-500">{t('createWallet.vanityMode')} <b className="text-orange-600 dark:text-orange-300 uppercase">{vanityPerformanceMode}</b></span>
                          <span className="font-mono text-surface-700 dark:text-surface-300">
                            {t('createWallet.vanityChunk', { chunk: formatCompactNumber(vanityEffectiveThroughput) })} · {t('createWallet.vanityPrimary', { current: generatedWallets.length, total: vanitySafeTargetCount })} · {t('createWallet.vanityExtra', { current: vanityExtraWallets.length, total: vanitySafeExtraLimit })}
                          </span>
                        </div>
                      </div>
                    </div>

                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <AlertTriangle size={14} />
                      {t('createWallet.vanityNoticeTitle')}
                    </h4>
                    <ul className="mt-2 space-y-1 pl-5 text-[11px] leading-relaxed text-amber-700/80 dark:text-amber-200/80 list-disc">
                      <li>{t('createWallet.vanityHeatDesc')}</li>
                      <li>{t('createWallet.vanitySafeTipShortPattern')}</li>
                      <li>{t('createWallet.vanitySafeTipNoHotCharge')}</li>
                      <li>{t('createWallet.vanityHeatCooling')}</li>
                      <li>{t('createWallet.vanitySafeTipVentilation')}</li>
                    </ul>
                  </div>
                </section>

                  <section className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-sm shadow-emerald-900/5 dark:border-emerald-500/20 dark:bg-surface-950/60 dark:shadow-emerald-950/10">
                    <div className="border-b border-emerald-500/15 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.04] to-transparent px-3 py-2.5">
                      <button type="button" onClick={() => toggleVanitySection('primary')} className="flex w-full items-center justify-between gap-3 text-left transition-opacity hover:opacity-85">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300">
                            <Target size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-emerald-800 dark:text-emerald-100">{t('createWallet.vanityPrimaryMatches')}</p>
                            <p className="mt-0.5 truncate text-[10px] text-emerald-700/75 dark:text-emerald-100/55">{vanityPrefixClean || vanitySuffixClean ? `0x${vanityPrefixClean}...${vanitySuffixClean}` : t('createWallet.vanityScanning')}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-100">{generatedWallets.length}/{vanitySafeTargetCount}</span>
                          <ChevronDown size={14} className={`text-emerald-600 dark:text-emerald-400 transition-transform ${vanityExpandedSections.primary ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    </div>
                    {vanityExpandedSections.primary && (
                      <div className="max-h-56 space-y-1.5 overflow-y-auto p-2">
                        {generatedWallets.length === 0 ? <p className="px-2 py-3 text-center text-[11px] text-emerald-600/70 dark:text-emerald-200/50">{t('createWallet.vanityScanning')}</p> : generatedWallets.map((wallet, index) => {
                          const address = wallet.address || '';
                          const selected = selectedVanityAddresses.includes(address);
                          const saved = !!address && vanitySavedRef.current.has(address);
                          return <div key={address || index} className={`rounded-xl border p-2 transition-all ${selected ? 'border-emerald-400/60 bg-emerald-100/80 shadow-sm shadow-emerald-900/5 dark:bg-emerald-500/15 dark:shadow-emerald-950/20' : 'border-surface-200 bg-surface-50/90 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-surface-700/80 dark:bg-surface-900/80 dark:hover:border-emerald-500/35 dark:hover:bg-surface-900'}`}>
                            <div className="flex items-start gap-2">
                              <button type="button" onClick={() => toggleVanitySelection(address)} className="flex min-w-0 flex-1 items-start gap-2 text-left" aria-pressed={selected}>
                                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${selected ? 'bg-emerald-500 text-white shadow shadow-emerald-500/25' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'}`}>{index + 1}</span>
                                <span className="min-w-0 flex-1">
                                  <code className="block break-all text-[11px] font-bold leading-snug tracking-tight text-surface-950 dark:text-white sm:text-[12px]">{renderVanityAddress(address)}</code>
                                  <span className="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-semibold text-emerald-700/80 dark:text-emerald-100/75">
                                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-1.5 py-0.5">{t('createWallet.vanityExtraTypePrimary')}</span>
                                    {saved && <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 shadow-sm dark:text-emerald-200">{t('createWallet.vanityExtraSaved')}</span>}
                                  </span>
                                </span>
                              </button>
                              <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg border border-surface-200 bg-surface-50/90 p-1 shadow-inner shadow-surface-900/5 dark:border-surface-700/60 dark:bg-surface-950/60 dark:shadow-black/10">
                                <button type="button" onClick={() => handleCopy(address, `vanity-found-${index}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white active:scale-95" aria-label={t('common.copy')}>
                                  {copiedField === `vanity-found-${index}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                </button>
                                <button type="button" disabled={saved} onClick={() => saveSingleVanityWallet(wallet)} className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95" aria-label={t('createWallet.vanityExtraSaveOne')}>
                                  <Save size={13} />
                                </button>
                                <button type="button" onClick={() => removeVanityPrimaryWallet(address)} className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400 active:scale-95" aria-label={t('createWallet.vanityExtraRemoveOne')}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>;
                        })}
                      </div>
                    )}
                  </section>

                  {vanityCaptureExtras && (
                    <section className="overflow-hidden rounded-xl border border-cyan-200 bg-cyan-50/70 shadow-sm shadow-cyan-900/5 dark:border-cyan-500/20 dark:bg-surface-950/60 dark:shadow-cyan-950/10">
                      <div className="border-b border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-cyan-500/[0.04] to-transparent px-3 py-2.5">
                        <button type="button" onClick={() => toggleVanitySection('extra')} className="flex w-full items-center justify-between gap-3 text-left transition-opacity hover:opacity-85">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-500/10 text-cyan-500 dark:text-cyan-300">
                              <Sparkles size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-cyan-800 dark:text-cyan-100">{t('createWallet.vanityExtraKept')}</p>
                              <p className="mt-0.5 truncate text-[10px] text-cyan-700/75 dark:text-cyan-100/55">{t('createWallet.vanityExtraAutoReplaceHint')}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-100">{vanityExtraWallets.length}/{vanitySafeExtraLimit}</span>
                            <ChevronDown size={14} className={`text-cyan-600 dark:text-cyan-400 transition-transform ${vanityExpandedSections.extra ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {vanityExpandedSections.extra && (
                          <div className="mt-2 flex items-center justify-end gap-1.5">
                            <button type="button" disabled={vanityExtraWallets.length === 0} onClick={saveAllVanityExtraWallets} className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-200">
                              {t('createWallet.vanityExtraSaveAll')}
                            </button>
                            <button type="button" disabled={vanityExtraWallets.length === 0} onClick={clearVanityExtraWallets} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-700 shadow-sm transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-200">
                              {t('createWallet.vanityExtraClearAll')}
                            </button>
                          </div>
                        )}
                      </div>
                      {vanityExpandedSections.extra && (
                        <div className="max-h-56 space-y-1.5 overflow-y-auto p-2">
                          {vanityExtraWallets.length === 0 ? <p className="px-2 py-3 text-center text-[11px] text-cyan-600/70 dark:text-cyan-200/50">{t('createWallet.vanityExtraEmpty')}</p> : vanityExtraWallets.map((wallet, index) => {
                            const address = wallet.address || '';
                            const selected = selectedVanityAddresses.includes(address);
                            const saved = !!address && vanitySavedRef.current.has(address);
                            const score = wallet.vanityScore || 0;
                            return <div key={address || index} className={`rounded-xl border p-2 transition-all ${selected ? 'border-cyan-400/60 bg-cyan-100/80 shadow-sm shadow-cyan-900/5 dark:bg-cyan-500/15 dark:shadow-cyan-950/20' : 'border-surface-200 bg-surface-50/90 hover:border-cyan-300 hover:bg-cyan-50/70 dark:border-surface-700/80 dark:bg-surface-900/80 dark:hover:border-cyan-500/35 dark:hover:bg-surface-900'}`}>
                              <div className="flex items-start gap-2">
                                <button type="button" onClick={() => toggleVanitySelection(address)} className="flex min-w-0 flex-1 items-start gap-2 text-left" aria-pressed={selected}>
                                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${selected ? 'bg-cyan-500 text-white shadow shadow-cyan-500/25' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'}`}>{index + 1}</span>
                                  <span className="min-w-0 flex-1">
                                    <code className="block break-all text-[11px] font-bold leading-snug tracking-tight text-surface-950 dark:text-white sm:text-[12px]">{renderVanityExtraAddress(address, wallet, true)}</code>
                                    <span className="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-semibold text-cyan-700/80 dark:text-cyan-100/75">
                                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 py-0.5">{getVanityExtraLabel(wallet)}</span>
                                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-bold shadow-sm ${getVanityScoreTone(score)}`}>{t('createWallet.vanityExtraScore', { score })}</span>
                                      {saved && <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 shadow-sm dark:text-emerald-200">{t('createWallet.vanityExtraSaved')}</span>}
                                    </span>
                                  </span>
                                </button>
                                <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg border border-surface-200 bg-surface-50/90 p-1 shadow-inner shadow-surface-900/5 dark:border-surface-700/60 dark:bg-surface-950/60 dark:shadow-black/10">
                                  <button type="button" onClick={() => handleCopy(address, `vanity-extra-${index}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white active:scale-95" aria-label={t('common.copy')}>
                                    {copiedField === `vanity-extra-${index}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                  </button>
                                  <button type="button" disabled={saved} onClick={() => saveSingleVanityWallet(wallet)} className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30 active:scale-95" aria-label={t('createWallet.vanityExtraSaveOne')}>
                                    <Save size={13} />
                                  </button>
                                  <button type="button" onClick={() => removeVanityExtraWallet(address)} className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-500/20 hover:text-rose-400 active:scale-95" aria-label={t('createWallet.vanityExtraRemoveOne')}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>;
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  <section className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50/85 p-3 font-mono text-[11px] shadow-inner shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-950/90 dark:shadow-black/20">
                    <div className="mb-2 flex items-center justify-between text-surface-500 dark:text-surface-400"><span>{t('createWallet.vanityTerminal')}</span><span>{vanityCandidates.length}/6</span></div>
                    <div className="h-28 space-y-1 overflow-hidden">
                      {vanityCandidates.length === 0 ? <div className="text-surface-500">{t('createWallet.vanityScanning')}</div> : vanityCandidates.map((candidate, index) => (
                        <div key={`${candidate.address}-${index}`} className={`flex items-center gap-2 ${candidate.matched ? 'text-emerald-700 dark:text-emerald-300' : 'text-surface-600 dark:text-surface-400'}`}>
                          {candidate.matched ? <Sparkles size={12} className="shrink-0" /> : <Gauge size={12} className="shrink-0" />}
                          <span className="min-w-0 flex-1 truncate">{renderVanityAddress(candidate.address)}</span>
                          <button type="button" onClick={() => handleCopy(candidate.address, `vanity-candidate-${index}`)} className="shrink-0 rounded p-1 text-surface-500 transition-colors hover:bg-surface-800 hover:text-white" aria-label={t('common.copy')}>{copiedField === `vanity-candidate-${index}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}</button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <p className="px-1 text-[11px] leading-relaxed text-surface-600 dark:text-surface-500">{t('createWallet.vanityAutoLockPaused')}</p>
                  <div className="flex items-center justify-center gap-3">
                    {vanityPaused ? <button onClick={() => startVanity(true)} disabled={!vanityCanResume} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400" title={t('createWallet.vanityResume')} aria-label={t('createWallet.vanityResume')}><Play size={14} />{t('createWallet.vanityResume')}</button> : <button onClick={() => { void pauseVanity(); }} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300" title={t('createWallet.vanityPause')} aria-label={t('createWallet.vanityPause')}><Pause size={14} />{t('createWallet.vanityPause')}</button>}
                    <button onClick={stopVanity} className="inline-flex items-center gap-2 px-2 py-2 text-xs font-semibold text-red-600 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200" title={t('createWallet.stopVanity')} aria-label={t('createWallet.stopVanity')}><Square size={13} />{t('createWallet.stopVanity')}</button>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50 shadow-xl shadow-surface-900/5 dark:border-surface-700 dark:bg-surface-800 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-aurora:shadow-black/30 theme-glass:border-white/15 theme-glass:bg-white/10 theme-glass:shadow-black/20">
                  <div className="flex items-center justify-between border-b border-surface-200 bg-surface-50/90 p-4 dark:border-surface-700 dark:bg-surface-800/80 theme-aurora:border-white/10 theme-aurora:bg-white/10 theme-glass:border-white/15 theme-glass:bg-white/12">
                    <div>
                      <h3 className="text-sm font-bold text-surface-950 dark:text-white">{walletName || allVanityWallets[0].name}</h3>
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {vanitySavedCount > 0
                          ? t('createWallet.vanitySavedSummary', { count: vanitySavedCount, folder: allVanityWallets[0]?.groupId || VANITY_DEFAULT_FOLDER })
                          : t('createWallet.vanityResultSummary', { primary: generatedWallets.length, extra: vanityExtraWallets.length })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={resetVanityResults} className="rounded-lg bg-surface-200 dark:bg-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-800 dark:text-white transition-colors hover:bg-surface-300 dark:hover:bg-surface-600 flex items-center gap-1.5">
                        <RefreshCw size={14} /> {t('authError.retry')}
                      </button>
                    </div>
                  </div>
                  <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto bg-surface-50/70 p-4 dark:bg-surface-900/30 theme-aurora:bg-white/5 theme-glass:bg-white/5">
                    {allVanityWallets.map((wallet, index) => {
                        const address = wallet.address || '';
                        const selected = selectedVanityAddresses.includes(address);
                        const isExtra = wallet.vanityMatchType === 'extra';
                        const saved = !!address && vanitySavedRef.current.has(address);
                        const isExpanded = expandedVanitySecrets[address] || false;

                        return (
                          <div key={address || `vanity-${index}`} className={`relative isolate flex min-h-[96px] flex-col gap-2 rounded-xl border p-3 transition-all will-change-transform ${selected ? 'border-brand-500/50 bg-brand-500/10 shadow-sm theme-aurora:bg-brand-400/12 theme-glass:bg-brand-400/12' : 'border-surface-200 bg-surface-50/90 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800/80 dark:hover:border-surface-600 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-aurora:hover:border-brand-300/35 theme-glass:border-white/15 theme-glass:bg-white/10 theme-glass:hover:border-brand-300/40'}`}>
                            <div className="flex items-start gap-3">
                              <button type="button" onClick={() => toggleVanitySelection(address)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition-colors ${selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-300 bg-surface-50 text-transparent dark:border-surface-600 dark:bg-surface-900'}`}>
                                <Check size={12} className={selected ? 'opacity-100' : 'opacity-0'} />
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${isExtra ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}`}>
                                      {isExtra ? t('createWallet.vanityExtraTypeExtra') : t('createWallet.vanityExtraTypePrimary')}
                                    </span>
                                    {saved && <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"><Check size={10} />{t('createWallet.vanityExtraSaved')}</span>}
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-surface-200 bg-surface-100/70 p-1 dark:border-surface-700/50 dark:bg-surface-950/40">
                                    <button type="button" onClick={() => toggleVanitySecret(address)} className={`rounded-md p-1 transition-colors ${isExpanded ? 'bg-brand-500/20 text-brand-700 dark:text-brand-300' : 'text-surface-500 hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white'}`} aria-label={t('createWallet.vanityToggleDetails')}>
                                      {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                    </button>
                                    <button type="button" onClick={() => handleCopy(address, `vanity-found-${index}`)} className="rounded-md p-1 text-surface-500 transition-colors hover:bg-surface-200 hover:text-surface-950 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white" aria-label={t('common.copy')}>
                                      {copiedField === `vanity-found-${index}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    </button>
                                    <button type="button" disabled={saved} onClick={() => saveSingleVanityWallet(wallet)} className="rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30" aria-label={t('createWallet.vanityExtraSaveOne')}>
                                      <Save size={12} />
                                    </button>
                                  </div>
                                </div>

                                <code className="mt-1.5 block break-all text-[13px] font-bold tracking-wide text-surface-950 dark:text-white">
                                  {isExtra ? renderVanityExtraAddress(address, wallet) : renderVanityAddress(address)}
                                </code>

                                {isExtra && (
                                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-cyan-700/80 dark:text-cyan-200/80 font-medium">
                                    <span>{getVanityExtraLabel(wallet)}</span>
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold shadow-sm ${getVanityScoreTone(wallet.vanityScore || 0)}`}><Star size={10} />{t('createWallet.vanityExtraScore', { score: wallet.vanityScore || 0 })}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-2 ml-0 space-y-2 rounded-lg border border-surface-200 bg-surface-50 p-3 shadow-inner dark:border-surface-700/50 dark:bg-surface-900/50 sm:ml-8">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1"><KeyRound size={10} /> {t('createWallet.privateKey')}</span>
                                    <button onClick={() => {
                                      const key = `${address}-pk`;
                                      if (!visibleVanitySecrets[key]) {
                                        setVisibleVanitySecrets(prev => ({ ...prev, [key]: true }));
                                        window.setTimeout(() => setVisibleVanitySecrets(prev => ({ ...prev, [key]: false })), 60000);
                                        return;
                                      }
                                      handleCopy(wallet.privateKey || '', `pk_${index}`);
                                    }} className="flex items-center gap-1 rounded bg-surface-50 px-2 py-0.5 text-[10px] font-medium text-surface-600 transition-colors hover:text-surface-950 dark:bg-surface-800 dark:text-surface-400 dark:hover:text-white">
                                      {visibleVanitySecrets[`${address}-pk`] ? (copiedField === `pk_${index}` ? <><Check size={12} className="text-emerald-400" /> {t('common.copy')}</> : <><Copy size={12} /> {t('common.copy')}</>) : t('common.show')}
                                    </button>
                                  </div>
                                  <code className="block text-[11px] font-mono text-red-600 dark:text-red-300/90 break-all bg-surface-100 dark:bg-surface-950 p-2.5 rounded border border-surface-300 dark:border-surface-800 shadow-inner">
                                    {visibleVanitySecrets[`${address}-pk`] ? wallet.privateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                                  </code>
                                </div>
                                {wallet.mnemonic && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1"><Trees size={10} /> {t('createWallet.seedPhrase')}</span>
                                      <button onClick={() => {
                                        const key = `${address}-mn`;
                                        if (!visibleVanitySecrets[key]) {
                                          setVisibleVanitySecrets(prev => ({ ...prev, [key]: true }));
                                          window.setTimeout(() => setVisibleVanitySecrets(prev => ({ ...prev, [key]: false })), 60000);
                                          return;
                                        }
                                        handleCopy(wallet.mnemonic || '', `mn_${index}`);
                                      }} className="flex items-center gap-1 rounded bg-surface-50 px-2 py-0.5 font-sans text-[10px] font-medium text-surface-600 transition-colors hover:text-surface-950 dark:bg-surface-800 dark:text-surface-400 dark:hover:text-white">
                                        {visibleVanitySecrets[`${address}-mn`] ? (copiedField === `mn_${index}` ? <><Check size={12} className="text-emerald-500 dark:text-emerald-400" /> {t('common.copy')}</> : <><Copy size={12} /> {t('common.copy')}</>) : t('common.show')}
                                      </button>
                                    </div>
                                    <div className="bg-surface-100 dark:bg-surface-950 p-2.5 rounded border border-surface-300 dark:border-surface-800 text-[11px] font-medium font-sans text-brand-700 dark:text-brand-200 leading-relaxed shadow-inner">
                                      {visibleVanitySecrets[`${address}-mn`] ? wallet.mnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                    })}
                  </div>
                  {hasSelectedUnsavedVanityWallets && (
                    <div className="border-t border-surface-200 bg-surface-50/90 p-4 dark:border-surface-700 dark:bg-surface-800/80 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-glass:border-white/15 theme-glass:bg-white/10">
                      <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-400/25 dark:text-amber-100">
                        <input
                          type="checkbox"
                          checked={vanityBackupConfirmed}
                          onChange={(event) => setVanityBackupConfirmed(event.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                        />
                        <span>
                          <span className="block font-bold">{t('createWallet.vanityBackupConfirmTitle')}</span>
                          <span className="mt-1 block opacity-80">{t('createWallet.vanityBackupConfirmDesc')}</span>
                        </span>
                      </label>
                      <button
                        type="button"
                        disabled={selectedVanityAddresses.length === 0 || !vanityBackupConfirmed}
                        onClick={() => saveVanityWallets([...vanityFoundRef.current, ...vanityExtraRef.current], true)}
                        className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-500 hover:shadow-brand-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400 disabled:shadow-none"
                      >
                        {t('createWallet.saveToVault')} ({selectedVanityAddresses.filter(addr => !vanitySavedRef.current.has(addr)).length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {(tab === 'manual' || (tab === 'generate' && generatedWallets.length > 0 && !bulkResult)) && (
          <div className="p-4 border-t border-surface-800 bg-surface-900 sticky bottom-0 rounded-b-2xl">
            <button onClick={tab === 'manual' ? handleSaveManual : handleSaveGenerated}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-lg transition-all active:scale-[0.98]">
              {t('createWallet.saveToVault')}
            </button>
          </div>
        )}
      </div>
      {showQRScanner && (
        <QRScannerModal
          onResult={({ text, type }) => {
            if (type === 'address') { setManualAddress(text); checkDuplicate(text); }
            else if (type === 'privateKey') setManualPK(text);
            else if (type === 'seedPhrase') setManualSeed(text);
            else setManualAddress(text);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}
