import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as CapacitorApp } from '@capacitor/app';
import { APP_ACTIVITY_EVENT } from '../security/useAutoLock';
import {
  deleteInternalText,
  parseInternalTextRef,
  readInternalText,
  serializeInternalTextRef,
  writeInternalText,
} from '../../utils/internalTextStore';
import {
  DEFAULT_VANITY_EXTRA_FILTERS,
  normalizeVanityExtraFilters,
  type VanityExtraFilterConfig,
  type VanityExtraFilterRule,
  type VanityExtraPatternKey,
} from '../../utils/vanity/vanityMatch';
import {
  NETWORKS,
  VANITY_DEFAULT_FOLDER,
  VANITY_EXTRA_DEFAULT_FOLDER,
  VANITY_EXTRA_FILTER_KEYS,
  VANITY_EXTRA_MIN_RUNS,
  VANITY_HEX_PATTERN,
  VANITY_MAX_SAFE_LENGTH,
  VANITY_PRESET_GROUPS,
  VANITY_SESSION_KEY,
  VANITY_SETTINGS_KEY,
} from '../../components/create-wallet/constants';
import { MiddleEllipsisAddress } from '../../components/create-wallet/components';
import type {
  GeneratedWallet,
  VanityCandidate,
  VanityPerformanceMode,
  VanitySessionState,
  VanitySettings,
} from '../../components/create-wallet/types';
import type { UseVanityGenerationParams } from './vanityGenerationTypes';
import {
  createVanityDifficultyAnalyzer,
  getVanityBatchSize,
  getVanityDifficultyKey,
  getVanityDifficultyTone,
  getVanityExtraLabel as formatVanityExtraLabel,
  getVanityWorkerCount,
} from './vanityGenerationUtils';

export function useVanityGeneration({
  activeFolder,
  folders,
  aesKey,
  onSave,
  onClose,
  showToast,
  showConfirm,
  t,
  registerCloseHandler,
  generatedWallets,
  setGeneratedWallets,
  setWalletName,
}: UseVanityGenerationParams) {
  // ── State ──────────────────────────────────────────────────────────────
  const defaultSaveFolder =
    activeFolder && activeFolder !== 'All' ? activeFolder : VANITY_DEFAULT_FOLDER;

  const [vanityPrefix, setVanityPrefix] = useState('');
  const [vanitySuffix, setVanitySuffix] = useState('');
  const [vanityGenerating, setVanityGenerating] = useState(false);
  const [vanityScanned, setVanityScanned] = useState(0);
  const [vanitySpeed, setVanitySpeed] = useState(0);
  const [vanityTime, setVanityTime] = useState(0);
  const [vanityTimeLimit, setVanityTimeLimit] = useState(300);
  const [vanityTargetCount, setVanityTargetCount] = useState<number | string>(1);
  const [vanityNetwork, setVanityNetwork] = useState('XLAYER');
  const [vanityFolder, setVanityFolder] = useState(defaultSaveFolder);
  const [vanityCaptureExtras, setVanityCaptureExtras] = useState(true);
  const [vanityExtraMinRun, setVanityExtraMinRun] = useState(4);
  const [vanityExtraMinRunDrafts, setVanityExtraMinRunDrafts] = useState<
    Partial<Record<VanityExtraPatternKey, string>>
  >({});
  const [vanityExtraLimit, setVanityExtraLimit] = useState<number | string>(50);
  const [vanityExtraFilters, setVanityExtraFilters] = useState<VanityExtraFilterConfig>(() =>
    normalizeVanityExtraFilters(DEFAULT_VANITY_EXTRA_FILTERS)
  );
  const [vanityExtraFolder, setVanityExtraFolder] = useState(VANITY_EXTRA_DEFAULT_FOLDER);
  const [vanityTagInput, setVanityTagInput] = useState('');
  const [vanityTags, setVanityTags] = useState<string[]>([]);
  const [vanityStopReason, setVanityStopReason] = useState('');
  const [vanitySavedCount, setVanitySavedCount] = useState(0);
  const [vanityCandidates, setVanityCandidates] = useState<VanityCandidate[]>([]);
  const [vanityExtraWallets, setVanityExtraWallets] = useState<GeneratedWallet[]>([]);
  const [selectedVanityAddresses, setSelectedVanityAddresses] = useState<string[]>([]);
  const [vanityPaused, setVanityPaused] = useState(false);
  const [vanityGenerationMode, setVanityGenerationMode] = useState<'privateKey' | 'mnemonic'>(
    'privateKey'
  );
  const [vanityMnemonicWords, setVanityMnemonicWords] = useState<12 | 24>(12);
  const [vanityExpandedSections, setVanityExpandedSections] = useState<
    Record<
      'target' | 'storage' | 'performance' | 'extraFilters' | 'terminal' | 'primary' | 'extra',
      boolean
    >
  >({
    target: true,
    storage: false,
    performance: false,
    extraFilters: false,
    terminal: false,
    primary: true,
    extra: true,
  });
  const [vanityGeneratorExpanded, setVanityGeneratorExpanded] = useState(true);
  const [expandedVanitySecrets, setExpandedVanitySecrets] = useState<Record<string, boolean>>({});
  const [visibleVanitySecrets, setVisibleVanitySecrets] = useState<Record<string, boolean>>({});
  const [vanityPerformanceMode, setVanityPerformanceMode] =
    useState<VanityPerformanceMode>('balanced');
  const [vanityPresetsExpanded, setVanityPresetsExpanded] = useState(false);
  const [vanityCustomPattern, setVanityCustomPattern] = useState('');
  const [vanityCustomPatterns, setVanityCustomPatterns] = useState<string[]>([]);
  const [hasRecoverableVanitySession, setHasRecoverableVanitySession] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────
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

  // ── Derived values ─────────────────────────────────────────────────────
  const vanityPrefixRaw = vanityPrefix.trim();
  const vanitySuffixRaw = vanitySuffix.trim();
  const vanityPrefixClean = vanityPrefixRaw.toLowerCase();
  const vanitySuffixClean = vanitySuffixRaw.toLowerCase();
  const vanityInvalidChars =
    !VANITY_HEX_PATTERN.test(vanityPrefixRaw) || !VANITY_HEX_PATTERN.test(vanitySuffixRaw);
  const vanityPatternLength = vanityPrefixClean.length + vanitySuffixClean.length;
  const vanityHasPattern = vanityPatternLength > 0;
  const vanitySafeTargetCount = Math.max(1, Math.floor(Number(vanityTargetCount) || 1));
  const vanityExpectedTries = Math.pow(16, vanityPatternLength || 0);
  const vanityCompletionRatio = vanityHasPattern
    ? Math.min(0.999999, vanityScanned / Math.max(1, vanityExpectedTries * vanitySafeTargetCount))
    : 0;
  const vanityTooLong = vanityPatternLength > VANITY_MAX_SAFE_LENGTH;
  const vanityCanStart = vanityHasPattern && !vanityInvalidChars && !vanityGenerating;
  const vanityCanResume = vanityPaused && vanityHasPattern && !vanityInvalidChars && !vanityGenerating;
  const vanitySafeExtraLimit = Math.max(0, Math.min(500, Number(vanityExtraLimit) || 0));
  const vanitySafeExtraMinRun = Math.max(3, Math.min(6, Number(vanityExtraMinRun) || 4));
  const vanitySafeExtraFilters = useMemo(
    () => normalizeVanityExtraFilters(vanityExtraFilters, vanitySafeExtraMinRun),
    [vanityExtraFilters, vanitySafeExtraMinRun]
  );
  const liteModeActive =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('lite-mode');
  const vanityBatchSize = getVanityBatchSize(vanityPerformanceMode, liteModeActive);
  const vanityWorkerCount = getVanityWorkerCount(
    vanityPerformanceMode,
    navigator.hardwareConcurrency || 2
  );
  const vanityDifficultyKey = getVanityDifficultyKey(vanityPatternLength);
  const vanityDifficultyTone = getVanityDifficultyTone(vanityDifficultyKey);
  const vanityRunActive = vanityGenerating || vanityPaused;
  const vanityProgress =
    vanityTimeLimit > 0
      ? Math.min(100, (vanityTime / vanityTimeLimit) * 100)
      : Math.min(
          100,
          Math.max(
            (generatedWallets.length / vanitySafeTargetCount) * 100,
            vanityCompletionRatio * 100
          )
        );
  const vanityRemainingPrimary = Math.max(0, vanitySafeTargetCount - generatedWallets.length);
  const vanityEstimatedRemainingTries = vanityHasPattern
    ? Math.max(0, vanityExpectedTries * vanityRemainingPrimary - vanityScanned)
    : 0;
  const vanityEtaSeconds = vanitySpeed > 0 ? vanityEstimatedRemainingTries / vanitySpeed : 0;
  const vanityProgressPercentLabel = `${Math.min(99.9999, Math.max(0, vanityCompletionRatio * 100)).toFixed(vanityCompletionRatio < 0.01 ? 4 : 2)}%`;
  const vanityEffectiveThroughput = vanityWorkerCount * vanityBatchSize;
  const allVanityWallets = useMemo(
    () => [
      ...generatedWallets.filter(w => !!w.vanityMatchType),
      ...vanityExtraWallets,
    ],
    [generatedWallets, vanityExtraWallets]
  );
  const hasSelectedUnsavedVanityWallets = selectedVanityAddresses.some(
    addr => !vanitySavedRef.current.has(addr)
  );

  // ── Helper functions ───────────────────────────────────────────────────
  const compactAddress = (address: string, head = 12, tail = 8): ReactNode => {
    if (!address) return '';
    const clean =
      address.startsWith('0x') || address.startsWith('0X') ? address : `0x${address}`;
    return <MiddleEllipsisAddress address={clean} head={head} tail={tail} />;
  };

  const toggleVanitySection = (
    section: 'target' | 'storage' | 'performance' | 'extraFilters' | 'terminal' | 'primary' | 'extra'
  ) => {
    setVanityExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleVanitySecret = (address: string) => {
    setExpandedVanitySecrets(prev => ({ ...prev, [address]: !prev[address] }));
  };

  const vanityDifficultyAnalyzer = useMemo(
    () =>
      createVanityDifficultyAnalyzer({
        t,
        patternLength: vanityPatternLength,
        speed: vanitySpeed,
        prefix: vanityPrefixClean,
        suffix: vanitySuffixClean,
        hasPattern: vanityHasPattern,
        generationMode: vanityGenerationMode,
        mnemonicWords: vanityMnemonicWords,
      }),
    [
      t,
      vanityPatternLength,
      vanitySpeed,
      vanityPrefixClean,
      vanitySuffixClean,
      vanityHasPattern,
      vanityGenerationMode,
      vanityMnemonicWords,
    ]
  );

  const usableFolders = folders.filter(f => f && f !== 'All');
  const visibleVanityPresetGroups = vanityPresetsExpanded
    ? VANITY_PRESET_GROUPS
    : VANITY_PRESET_GROUPS.slice(0, 2);
  const vanityHiddenPresetCount = Math.max(
    0,
    VANITY_PRESET_GROUPS.length - visibleVanityPresetGroups.length
  );

  const applyVanitySuffixPattern = (pattern: string) => {
    const clean = pattern.replace(/\s/g, '').toLowerCase().slice(0, 12);
    setVanitySuffix(clean);
  };

  const getVanityExtraLabel = (wallet: GeneratedWallet): string =>
    formatVanityExtraLabel(wallet, t);

  const renderVanityAddress = (address: string, compact = false): ReactNode => {
    if (compact) return <>{compactAddress(address, 12, 8)}</>;
    const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
    const prefix = hasHexPrefix ? address.slice(0, 2) : '';
    const body = hasHexPrefix ? address.slice(2) : address;
    const prefixEnd = Math.min(vanityPrefixClean.length, body.length);
    const suffixStart = Math.max(prefixEnd, body.length - vanitySuffixClean.length);
    return (
      <>
        <span>{prefix}</span>
        {prefixEnd ? (
          <span className="rounded bg-brand-500/20 px-1 py-0.5 font-extrabold text-brand-700 ring-1 ring-brand-400/30 dark:text-brand-200">
            {body.slice(0, prefixEnd)}
          </span>
        ) : null}
        <span className="mx-0.5 opacity-80">{body.slice(prefixEnd, suffixStart)}</span>
        {vanitySuffixClean.length ? (
          <span className="rounded bg-brand-500/20 px-1 py-0.5 font-extrabold text-brand-700 ring-1 ring-brand-400/30 dark:text-brand-200">
            {body.slice(suffixStart)}
          </span>
        ) : null}
      </>
    );
  };

  const renderVanityExtraAddress = (
    address: string,
    wallet: GeneratedWallet,
    compact = false
  ): ReactNode => {
    if (compact) return <>{compactAddress(address, 12, 8)}</>;
    const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
    const prefix = hasHexPrefix ? address.slice(0, 2) : '';
    const body = hasHexPrefix ? address.slice(2) : address;
    const headLength = Math.max(
      0,
      wallet.vanityHeadRun?.length ||
        (wallet.vanityRepeatSide === 'head' ? wallet.vanityRepeatLength || 0 : 0)
    );
    const tailLength = Math.max(
      0,
      wallet.vanityTailRun?.length ||
        (wallet.vanityRepeatSide === 'tail' ? wallet.vanityRepeatLength || 0 : 0)
    );
    if (!headLength && !tailLength) return renderVanityAddress(address);
    const middleStart = Math.min(headLength, body.length);
    const middleEnd = Math.max(middleStart, body.length - tailLength);
    return (
      <>
        <span>{prefix}</span>
        {headLength ? (
          <span className="rounded bg-cyan-500/20 px-1 py-0.5 font-extrabold text-cyan-700 ring-1 ring-cyan-400/30 dark:text-cyan-200">
            {body.slice(0, middleStart)}
          </span>
        ) : null}
        <span className="mx-0.5 opacity-80">{body.slice(middleStart, middleEnd)}</span>
        {tailLength ? (
          <span className="rounded bg-cyan-500/20 px-1 py-0.5 font-extrabold text-cyan-700 ring-1 ring-cyan-400/30 dark:text-cyan-200">
            {body.slice(middleEnd)}
          </span>
        ) : null}
      </>
    );
  };

  const updateVanityExtraFilter = (
    key: VanityExtraPatternKey,
    patch: Partial<VanityExtraFilterRule>
  ) => {
    setVanityExtraFilters(prev =>
      normalizeVanityExtraFilters({ ...prev, [key]: { ...prev[key], ...patch } }, vanitySafeExtraMinRun)
    );
  };

  const getVanityExtraMinRunValue = (key: VanityExtraPatternKey, fallback: number) =>
    Math.max(3, Math.min(12, Number(vanityExtraMinRunDrafts[key] ?? fallback) || fallback));

  const commitVanityExtraMinRun = (key: VanityExtraPatternKey, fallback: number) => {
    const raw = vanityExtraMinRunDrafts[key];
    const nextValue = Math.max(
      3,
      Math.min(12, Math.floor(Number(raw === undefined || raw === '' ? fallback : raw) || fallback))
    );
    updateVanityExtraFilter(key, { minRun: nextValue });
    setVanityExtraMinRunDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const stepVanityExtraMinRun = (key: VanityExtraPatternKey, fallback: number, delta: number) => {
    const nextValue = Math.max(3, Math.min(12, getVanityExtraMinRunValue(key, fallback) + delta));
    updateVanityExtraFilter(key, { minRun: nextValue });
    setVanityExtraMinRunDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const vanityNetworkOptions = NETWORKS.map(n => ({ value: n, label: n }));
  const vanityFolderOptions = [
    { value: VANITY_DEFAULT_FOLDER, label: t('createWallet.vanityFolder') },
    ...usableFolders
      .filter(f => f !== VANITY_DEFAULT_FOLDER)
      .map(f => ({ value: f, label: f })),
  ];
  const vanityFolderLabel =
    vanityFolderOptions.find(o => o.value === vanityFolder)?.label ?? vanityFolder;
  const vanityStorageSummary = `${vanitySafeTargetCount} · ${vanityNetwork} · ${vanityFolderLabel}`;
  const vanityExtraFolderOptions = [
    { value: VANITY_EXTRA_DEFAULT_FOLDER, label: t('createWallet.vanityExtraFolderDefault') },
    ...usableFolders
      .filter(f => f !== VANITY_EXTRA_DEFAULT_FOLDER)
      .map(f => ({ value: f, label: f })),
  ];
  const vanityExtraFolderLabel =
    vanityExtraFolderOptions.find(o => o.value === vanityExtraFolder)?.label ?? vanityExtraFolder;
  const vanityEnabledExtraFilterCount = VANITY_EXTRA_FILTER_KEYS.filter(
    k => vanitySafeExtraFilters[k]?.enabled
  ).length;
  const vanityExtraSummary = vanityCaptureExtras
    ? `${vanitySafeExtraLimit} · ${vanityEnabledExtraFilterCount}/${VANITY_EXTRA_FILTER_KEYS.length} · ${vanityExtraFolderLabel}`
    : t('common.disabled');

  // ── Session persistence helpers ────────────────────────────────────────
  const scheduleVanitySessionPersist = () => {
    if (vanitySessionPersistTimerRef.current) return;
    vanitySessionPersistTimerRef.current = setTimeout(() => {
      vanitySessionPersistTimerRef.current = null;
      void vanitySessionPersistNowRef.current().catch(() => {});
    }, 1500);
  };

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
    const { createPortableBackupText } = await import('../../utils/backup/backupUtils');
    const container = await createPortableBackupText(
      vanityFoundRef.current,
      { scope: 'vanity-session', state },
      aesKey
    );
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
      .then(() =>
        generation === vanitySessionGenerationRef.current ? persistVanitySession() : undefined
      );
    vanitySessionPersistQueueRef.current = nextWrite;
    await nextWrite;
  };
  vanitySessionPersistNowRef.current = enqueueVanitySessionPersist;

  // ── Close handler ──────────────────────────────────────────────────────
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

  // ── Effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isVanityRunningRef.current = false;
      if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
      vanityWorkerRef.current.forEach(w => w.terminate());
      vanityWorkerRef.current = [];
      if (vanitySessionPersistTimerRef.current)
        clearTimeout(vanitySessionPersistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    registerCloseHandler?.(closeCreateWalletModal);
    return () => registerCloseHandler?.(null);
  });

  // Load saved settings on mount
  useEffect(() => {
    let active = true;
    Preferences.get({ key: VANITY_SETTINGS_KEY })
      .then(({ value }) => {
        if (!value || !active) return;
        const settings = JSON.parse(value) as VanitySettings;
        if (settings.targetCount)
          setVanityTargetCount(Math.max(1, Math.floor(Number(settings.targetCount) || 1)));
        if (typeof settings.timeLimit === 'number')
          setVanityTimeLimit(Math.max(0, Math.floor(settings.timeLimit)));
        if (settings.network && NETWORKS.includes(settings.network))
          setVanityNetwork(settings.network);
        if (settings.folder) setVanityFolder(settings.folder);
        if (typeof settings.captureExtras === 'boolean')
          setVanityCaptureExtras(settings.captureExtras);
        if (settings.extraMinRun && VANITY_EXTRA_MIN_RUNS.includes(settings.extraMinRun))
          setVanityExtraMinRun(settings.extraMinRun);
        if (settings.extraLimit)
          setVanityExtraLimit(Math.max(1, Math.min(500, settings.extraLimit)));
        if (settings.extraFilters)
          setVanityExtraFilters(
            normalizeVanityExtraFilters(settings.extraFilters, settings.extraMinRun || 4)
          );
        if (settings.extraFolder) setVanityExtraFolder(settings.extraFolder);
        if (
          settings.performanceMode === 'eco' ||
          settings.performanceMode === 'balanced' ||
          settings.performanceMode === 'fast'
        )
          setVanityPerformanceMode(settings.performanceMode);
        if (settings.generationMode === 'privateKey' || settings.generationMode === 'mnemonic')
          setVanityGenerationMode(settings.generationMode);
        if (settings.mnemonicWords === 12 || settings.mnemonicWords === 24)
          setVanityMnemonicWords(settings.mnemonicWords);
        if (Array.isArray(settings.customPatterns)) {
          setVanityCustomPatterns(
            [
              ...new Set(
                settings.customPatterns
                  .map(p => String(p).replace(/\s/g, '').toLowerCase().slice(0, 12))
                  .filter(p => p && VANITY_HEX_PATTERN.test(p))
              ),
            ].slice(-12)
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) vanitySettingsLoadedRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  // Persist session while scanning
  useEffect(() => {
    if ((!generatedWallets.length && !vanityExtraWallets.length) || !vanityGenerating) return;
    scheduleVanitySessionPersist();
  }, [
    generatedWallets,
    vanityExtraWallets,
    selectedVanityAddresses,
    vanityScanned,
    vanityTime,
    vanityCandidates,
    vanityGenerating,
  ]);

  // Persist settings on change
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
        customPatterns: vanityCustomPatterns,
      } satisfies VanitySettings),
    }).catch(() => {});
  }, [
    vanitySafeTargetCount,
    vanityTimeLimit,
    vanityNetwork,
    vanityFolder,
    vanityCaptureExtras,
    vanitySafeExtraMinRun,
    vanitySafeExtraLimit,
    vanitySafeExtraFilters,
    vanityExtraFolder,
    vanityPerformanceMode,
    vanityGenerationMode,
    vanityMnemonicWords,
    vanityCustomPatterns,
  ]);

  // App state → persist on background
  useEffect(() => {
    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) void vanitySessionPersistNowRef.current().catch(() => {});
    });
    return () => {
      void appStateListener.then(l => l.remove());
    };
  }, []);

  // Detect recoverable session on mount
  useEffect(() => {
    let active = true;
    Preferences.get({ key: VANITY_SESSION_KEY })
      .then(({ value }) => {
        if (active && !!value) setHasRecoverableVanitySession(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Validate folders
  useEffect(() => {
    const validFolders = new Set([VANITY_DEFAULT_FOLDER, ...usableFolders]);
    if (!validFolders.has(vanityFolder)) setVanityFolder(defaultSaveFolder);
    const validExtraFolders = new Set([VANITY_EXTRA_DEFAULT_FOLDER, ...usableFolders]);
    if (!validExtraFolders.has(vanityExtraFolder)) setVanityExtraFolder(VANITY_EXTRA_DEFAULT_FOLDER);
  }, [defaultSaveFolder, usableFolders, vanityFolder, vanityExtraFolder]);

  // ── Vanity operations ──────────────────────────────────────────────────
  const addVanityTag = () => {
    const next = vanityTagInput.trim().toLowerCase();
    if (!next || vanityTags.includes(next)) return;
    setVanityTags(prev => [...prev, next]);
    setVanityTagInput('');
  };

  const buildVanityWallet = (wallet: GeneratedWallet, index: number): GeneratedWallet => ({
    ...wallet,
    name:
      vanitySafeTargetCount === 1
        ? t('createWallet.vanityWalletName')
        : `${t('createWallet.vanityWalletName')} ${index + 1}`,
    network: vanityNetwork,
    groupId: vanityFolder || VANITY_DEFAULT_FOLDER,
    tags: vanityTags,
    balance: '0.00',
    createdAt: Date.now() + index,
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
      .filter(w => !!w.address)
      .filter((w, i, arr) => arr.findIndex(o => o.address?.toLowerCase() === w.address?.toLowerCase()) === i)
      .sort((a, b) => (b.vanityScore || 0) - (a.vanityScore || 0))
      .slice(0, vanitySafeExtraLimit);
    vanityExtraRef.current = nextExtras;
    setVanityExtraWallets(nextExtras);
    return nextExtras;
  };

  const removeVanityExtraWallet = async (address: string) => {
    const wallet = vanityExtraRef.current.find(w => w.address === address);
    const ok = await showConfirm(t('home.deleteWalletConfirm', { name: wallet?.name || address }), {
      danger: true,
      title: t('common.delete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;
    const nextExtras = syncVanityExtraWallets(
      vanityExtraRef.current.filter(w => w.address !== address)
    );
    vanitySelectedRef.current.delete(address);
    vanitySavedRef.current.delete(address);
    setSelectedVanityAddresses(
      [...vanitySelectedRef.current].filter(
        a =>
          nextExtras.some(w => w.address === a) ||
          vanityFoundRef.current.some(w => w.address === a)
      )
    );
  };

  const removeVanityPrimaryWallet = async (address: string) => {
    const wallet = vanityFoundRef.current.find(w => w.address === address);
    const ok = await showConfirm(t('home.deleteWalletConfirm', { name: wallet?.name || address }), {
      danger: true,
      title: t('common.delete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;
    const nextPrimary = vanityFoundRef.current.filter(w => w.address !== address);
    vanityFoundRef.current = nextPrimary;
    setGeneratedWallets(nextPrimary);
    vanitySelectedRef.current.delete(address);
    vanitySavedRef.current.delete(address);
    setSelectedVanityAddresses(
      [...vanitySelectedRef.current].filter(
        a =>
          nextPrimary.some(w => w.address === a) ||
          vanityExtraRef.current.some(w => w.address === a)
      )
    );
  };

  const clearVanityExtraWallets = async () => {
    const ok = await showConfirm(
      t('home.deleteFolderConfirm', {
        name: t('createWallet.vanityExtraWalletName'),
        count: vanityExtraRef.current.length,
      }),
      { danger: true, title: t('common.delete'), confirmText: t('common.delete'), cancelText: t('common.cancel') }
    );
    if (!ok) return;
    vanityExtraRef.current.forEach(w => {
      if (w.address) {
        vanitySelectedRef.current.delete(w.address);
        vanitySavedRef.current.delete(w.address);
      }
    });
    syncVanityExtraWallets([]);
    setSelectedVanityAddresses(
      [...vanitySelectedRef.current].filter(a => vanityFoundRef.current.some(w => w.address === a))
    );
  };

  const saveSingleVanityWallet = async (wallet: GeneratedWallet) => {
    if (!wallet.address || vanitySavedRef.current.has(wallet.address)) return;
    const rank =
      wallet.vanityMatchType === 'extra'
        ? vanityExtraRef.current
            .filter(w => !!w.address)
            .sort((a, b) => (b.vanityScore || 0) - (a.vanityScore || 0))
            .findIndex(w => w.address?.toLowerCase() === wallet.address?.toLowerCase()) + 1
        : 0;
    const walletToSave =
      rank > 0 ? { ...wallet, name: `${t('createWallet.vanityExtraWalletName')} ${rank}` } : wallet;
    try {
      await onSave(walletToSave);
      vanitySavedRef.current.add(wallet.address);
      setVanitySavedCount(1);
      showToast(
        {
          key: 'createWallet.vanityAutoSaved',
          vars: { count: 1, folder: walletToSave.groupId, label: t('walletCard.new') },
          category: 'data',
        },
        'success'
      );
    } catch {
      await enqueueVanitySessionPersist().catch(() => {});
      showToast(t('assetBalance.autoSaveError'), 'error');
    }
  };

  const saveAllVanityExtraWallets = async () => {
    vanityExtraRef.current.forEach(w => {
      if (w.address) vanitySelectedRef.current.add(w.address);
    });
    setSelectedVanityAddresses([...vanitySelectedRef.current]);
    await saveVanityWallets(vanityExtraRef.current, false);
  };

  const saveVanityWallets = async (
    walletsToSave: GeneratedWallet[],
    closeAfterSave = false
  ): Promise<boolean> => {
    const extraRanks = new Map(
      walletsToSave
        .filter(w => w.vanityMatchType === 'extra' && !!w.address)
        .sort((a, b) => (b.vanityScore || 0) - (a.vanityScore || 0))
        .map((w, i) => [w.address!.toLowerCase(), i + 1])
    );
    const selectedWallets = walletsToSave
      .filter(
        w => !!w.address && vanitySelectedRef.current.has(w.address) && !vanitySavedRef.current.has(w.address)
      )
      .map(w => {
        const rank = w.address ? extraRanks.get(w.address.toLowerCase()) : undefined;
        return rank ? { ...w, name: `${t('createWallet.vanityExtraWalletName')} ${rank}` } : w;
      });
    if (!selectedWallets.length) return true;
    try {
      await onSave(selectedWallets.length === 1 ? selectedWallets[0] : selectedWallets);
      selectedWallets.forEach(w => {
        if (w.address) vanitySavedRef.current.add(w.address);
      });
      setVanitySavedCount(selectedWallets.length);
      showToast(
        {
          key: 'createWallet.vanityAutoSaved',
          vars: {
            count: selectedWallets.length,
            folder: selectedWallets[0].groupId,
            label: t('walletCard.new'),
          },
          category: 'data',
        },
        'success'
      );
      if (closeAfterSave) onClose();
      return true;
    } catch {
      await enqueueVanitySessionPersist().catch(() => {});
      showToast(t('assetBalance.autoSaveError'), 'error');
      return false;
    }
  };

  const finishVanityRun = async ({
    reason = '',
    closeAfterSave = false,
    saveFound = true,
  } = {}): Promise<boolean> => {
    isVanityRunningRef.current = false;
    setVanityGenerating(false);
    setVanityPaused(false);
    if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
    vanityActivityRef.current = null;
    vanityWorkerRef.current.forEach(w => {
      w.postMessage({ type: 'stop' });
      w.terminate();
    });
    vanityWorkerRef.current = [];
    if (reason) setVanityStopReason(reason);
    const foundWallets = [...vanityFoundRef.current, ...vanityExtraRef.current];
    if (foundWallets.length > 0 && saveFound) {
      const saved = await saveVanityWallets(foundWallets, closeAfterSave);
      if (!saved) return false;
      if (foundWallets.every(w => !!w.address && vanitySavedRef.current.has(w.address))) {
        await clearVanitySession();
      }
    } else if (foundWallets.length > 0) {
      await enqueueVanitySessionPersist().catch(() => {});
    }
    return true;
  };

  const restoreVanitySession = async () => {
    try {
      const { value } = await Preferences.get({ key: VANITY_SESSION_KEY });
      if (!value) return;
      const storedRef = parseInternalTextRef(value);
      const sessionText = storedRef ? await readInternalText(storedRef) : value;
      const { parseVaultBackupFile } = await import('../../utils/backup/backupUtils');
      const restored = (await parseVaultBackupFile(sessionText, aesKey, aesKey)) as {
        wallets?: GeneratedWallet[];
        config?: { state?: VanitySessionState };
      };
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
      setVanityExtraMinRun(
        VANITY_EXTRA_MIN_RUNS.includes(state.extraMinRun) ? state.extraMinRun : 4
      );
      setVanityExtraLimit(Math.max(1, Math.min(500, Number(state.extraLimit) || 50)));
      if (state.extraFilters)
        setVanityExtraFilters(
          normalizeVanityExtraFilters(state.extraFilters, state.extraMinRun || 4)
        );
      setVanityExtraFolder(state.extraFolder || VANITY_EXTRA_DEFAULT_FOLDER);
      setVanityTags(Array.isArray(state.tags) ? state.tags : []);
      setVanityPerformanceMode(
        state.performanceMode === 'eco' || state.performanceMode === 'fast'
          ? state.performanceMode
          : 'balanced'
      );
      if (state.generationMode === 'privateKey' || state.generationMode === 'mnemonic')
        setVanityGenerationMode(state.generationMode);
      if (state.mnemonicWords === 12 || state.mnemonicWords === 24)
        setVanityMnemonicWords(state.mnemonicWords);
      setVanityCandidates(Array.isArray(state.candidates) ? state.candidates.slice(-6) : []);
      vanityFoundRef.current = restored.wallets;
      vanityExtraRef.current = Array.isArray(state.extraWallets) ? state.extraWallets : [];
      vanitySelectedRef.current = new Set(
        state.selectedAddresses ||
          (
            [...restored.wallets, ...vanityExtraRef.current]
              .map(w => w.address)
              .filter(Boolean) as string[]
          )
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

  // ── Scan engine ────────────────────────────────────────────────────────
  const startVanity = async (resume = false) => {
    if (!vanityCanStart) return;
    if (resume && !vanityCanResume) return;
    if (!resume && vanityTooLong) {
      const ok = await showConfirm(t('createWallet.vanityLongConfirm'), {
        danger: true,
        title: t('createWallet.vanityLongTitle'),
        confirmText: t('createWallet.startVanity'),
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

    vanityWorkerRef.current.forEach(w => w.terminate());
    const workers = Array.from(
      { length: vanityWorkerCount },
      () => new Worker(new URL('../../workers/vanityWorker.ts', import.meta.url), { type: 'module' })
    );
    vanityWorkerRef.current = workers;
    const workerScanned = new Array(workers.length).fill(0);
    const elapsedBase = resume ? vanityTime : 0;

    const handleWorkerMessage = (workerIndex: number) => (event: MessageEvent) => {
      const { type, scanned, elapsed, wallet, candidate, matchType } = event.data || {};
      if (!isVanityRunningRef.current) return;

      window.dispatchEvent(new Event(APP_ACTIVITY_EVENT));
      workerScanned[workerIndex] = Math.max(0, Number(scanned) || 0);
      const totalScanned = workerScanned.reduce(
        (sum, c) => sum + c,
        resume ? vanityScanned : 0
      );
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
        const byAddress = new Map(previousExtras.map(w => [w.address?.toLowerCase(), w]));
        const mergedExtras = [...previousExtras, ...(event.data.wallets as GeneratedWallet[])]
          .filter(w => !!w.address)
          .sort((a, b) => (b.vanityScore || 0) - (a.vanityScore || 0));
        const nextExtras: GeneratedWallet[] = mergedExtras
          .filter(
            (w, i, arr) =>
              arr.findIndex(o => o.address?.toLowerCase() === w.address?.toLowerCase()) === i
          )
          .slice(0, vanitySafeExtraLimit)
          .map((w, i) => {
            const existing = byAddress.get(w.address?.toLowerCase() || '');
            const base = existing || buildVanityExtraWallet(w, i);
            return {
              ...base,
              ...w,
              privateKey: w.privateKey || base.privateKey,
              seedPhrase: w.seedPhrase || w.mnemonic || base.seedPhrase || base.mnemonic || '',
              mnemonic: w.mnemonic || w.seedPhrase || base.mnemonic || base.seedPhrase || '',
              name: `${t('createWallet.vanityExtraWalletName')} ${i + 1}`,
            };
          });
        const nextAddresses = new Set(
          nextExtras.map(w => w.address?.toLowerCase()).filter(Boolean)
        );
        const previousAddresses = new Set(
          previousExtras.map(w => w.address?.toLowerCase()).filter(Boolean)
        );
        previousExtras.forEach(w => {
          const addr = w.address?.toLowerCase();
          if (addr && !nextAddresses.has(addr)) vanitySelectedRef.current.delete(w.address || '');
        });
        nextExtras.forEach(w => {
          const addr = w.address?.toLowerCase();
          if (addr && !previousAddresses.has(addr)) vanitySelectedRef.current.add(w.address || '');
        });
        vanityExtraRef.current = nextExtras;
        setVanityExtraWallets(nextExtras);
        setSelectedVanityAddresses([...vanitySelectedRef.current]);
        const newest = nextExtras.find(w => !previousAddresses.has(w.address?.toLowerCase() || ''));
        if (newest?.address)
          setVanityCandidates(prev => [
            ...prev.slice(-5),
            { address: newest.address!, matched: true },
          ]);
      }

      if (type === 'found' && wallet && matchType !== 'extra') {
        if (
          !vanityFoundRef.current.some(
            item => item.address?.toLowerCase() === wallet.address?.toLowerCase()
          )
        ) {
          const nextWallet = buildVanityWallet(wallet, vanityFoundRef.current.length);
          vanityFoundRef.current = [...vanityFoundRef.current, nextWallet];
          setGeneratedWallets(vanityFoundRef.current);
          vanitySelectedRef.current.add(wallet.address);
          setSelectedVanityAddresses(prev =>
            prev.includes(wallet.address) ? prev : [...prev, wallet.address]
          );
          setVanityCandidates(prev => [
            ...prev.slice(-5),
            { address: wallet.address, matched: true },
          ]);
          setWalletName(t('createWallet.vanityWalletName'));
        }
        if (vanityFoundRef.current.length >= vanitySafeTargetCount) {
          void finishVanityRun({
            reason: t('createWallet.vanityComplete', { count: vanityFoundRef.current.length }),
            saveFound: false,
          });
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
        initialExtraCandidates: vanityExtraRef.current.map(w => ({
          address: w.address,
          vanityMatchType: 'extra' as const,
          vanityRepeatSide: w.vanityRepeatSide,
          vanityRepeatChar: w.vanityRepeatChar,
          vanityRepeatLength: w.vanityRepeatLength,
          vanityScore: w.vanityScore,
          vanityHeadRun: w.vanityHeadRun,
          vanityTailRun: w.vanityTailRun,
          vanityPatternType: w.vanityPatternType,
          privateKey: w.privateKey,
          seedPhrase: w.seedPhrase,
          mnemonic: w.mnemonic,
        })),
      });
    });
  };

  // ── Controls ───────────────────────────────────────────────────────────
  const pauseVanity = async () => {
    isVanityRunningRef.current = false;
    vanityWorkerRef.current.forEach(w => {
      w.postMessage({ type: 'stop' });
      w.terminate();
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
      return selected ? current.filter(v => v !== address) : [...current, address];
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

  // ── Return ─────────────────────────────────────────────────────────────
  return {
    // State
    vanityPrefix, setVanityPrefix,
    vanitySuffix, setVanitySuffix,
    vanityGenerating,
    vanityScanned,
    vanitySpeed,
    vanityTime, setVanityTime,
    vanityTimeLimit, setVanityTimeLimit,
    vanityTargetCount, setVanityTargetCount,
    vanityNetwork, setVanityNetwork,
    vanityFolder, setVanityFolder,
    vanityCaptureExtras, setVanityCaptureExtras,
    vanityExtraMinRun, setVanityExtraMinRun,
    vanityExtraMinRunDrafts, setVanityExtraMinRunDrafts,
    vanityExtraLimit, setVanityExtraLimit,
    vanityExtraFilters, setVanityExtraFilters,
    vanityExtraFolder, setVanityExtraFolder,
    vanityTagInput, setVanityTagInput,
    vanityTags, setVanityTags,
    vanityStopReason,
    vanitySavedCount,
    vanityCandidates,
    vanityExtraWallets,
    selectedVanityAddresses, setSelectedVanityAddresses,
    vanityPaused, setVanityPaused,
    vanityGenerationMode, setVanityGenerationMode,
    vanityMnemonicWords, setVanityMnemonicWords,
    vanityExpandedSections,
    vanityGeneratorExpanded, setVanityGeneratorExpanded,
    expandedVanitySecrets, setExpandedVanitySecrets,
    visibleVanitySecrets, setVisibleVanitySecrets,
    vanityPerformanceMode, setVanityPerformanceMode,
    vanityPresetsExpanded, setVanityPresetsExpanded,
    vanityCustomPattern, setVanityCustomPattern,
    vanityCustomPatterns, setVanityCustomPatterns,
    hasRecoverableVanitySession,
    // Derived
    vanityPrefixClean,
    vanitySuffixClean,
    vanityInvalidChars,
    vanityPatternLength,
    vanityHasPattern,
    vanitySafeTargetCount,
    vanityExpectedTries,
    vanityCompletionRatio,
    vanityTooLong,
    vanityCanStart,
    vanityCanResume,
    vanitySafeExtraLimit,
    vanitySafeExtraMinRun,
    vanitySafeExtraFilters,
    vanityBatchSize,
    vanityWorkerCount,
    vanityDifficultyKey,
    vanityDifficultyTone,
    vanityRunActive,
    vanityProgress,
    vanityRemainingPrimary,
    vanityEtaSeconds,
    vanityProgressPercentLabel,
    vanityEffectiveThroughput,
    allVanityWallets,
    hasSelectedUnsavedVanityWallets,
    vanityDifficultyAnalyzer,
    vanityNetworkOptions,
    vanityFolderOptions,
    vanityFolderLabel,
    vanityStorageSummary,
    vanityExtraFolderOptions,
    vanityExtraFolderLabel,
    vanityEnabledExtraFilterCount,
    vanityExtraSummary,
    visibleVanityPresetGroups,
    vanityHiddenPresetCount,
    vanitySavedRef,
    vanityFoundRef,
    vanityExtraRef,
    // Functions
    compactAddress,
    toggleVanitySection,
    toggleVanitySecret,
    applyVanitySuffixPattern,
    getVanityExtraLabel,
    renderVanityAddress,
    renderVanityExtraAddress,
    updateVanityExtraFilter,
    getVanityExtraMinRunValue,
    commitVanityExtraMinRun,
    stepVanityExtraMinRun,
    addVanityTag,
    getVanityScoreTone,
    removeVanityExtraWallet,
    removeVanityPrimaryWallet,
    clearVanityExtraWallets,
    saveSingleVanityWallet,
    saveAllVanityExtraWallets,
    saveVanityWallets,
    finishVanityRun,
    restoreVanitySession,
    startVanity,
    pauseVanity,
    stopVanity,
    toggleVanitySelection,
    resetVanityResults,
    closeCreateWalletModal,
    clearVanitySession,
  };
}
