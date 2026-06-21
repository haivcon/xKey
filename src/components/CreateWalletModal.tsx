import { useState, useRef, useEffect, type ReactNode } from 'react';
import { X, Plus, Copy, Check, Wallet, RefreshCw, Keyboard, AlertTriangle, Info, Camera, ChevronDown, Gauge, Timer, ShieldCheck, Sparkles, Folder, Tag, Trees } from 'lucide-react';
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
import type { Wallet as WalletModel } from '../types';

const NETWORKS = ['XLAYER', 'ETH', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Solana', 'Tron', 'Base'];
const VANITY_PRESETS = ['000', '111', '123', '888', '999', 'abc', 'def'];
const VANITY_HEX_PATTERN = /^[0-9a-f]*$/i;
const VANITY_MAX_SAFE_LENGTH = 6;
const VANITY_TIME_LIMITS = [60, 300, 600, 0];
const VANITY_DEFAULT_FOLDER = 'Vanity Wallets';

type SelectOption = { value: string; label: ReactNode };
type CreateWalletTab = 'manual' | 'generate' | 'hdTree' | 'vanity';
type GeneratedWallet = WalletModel & {
  mnemonic?: string;
  derivationPath?: string;
  path?: string;
  hdAccount?: number;
  hdIndex?: number;
  hdCoinType?: number;
  hdNetwork?: string;
  hdRootType?: string;
};
type FloatingEffect = { key: number; count: number; address?: string };
type StorageInfo = { estimatedSize?: number; available?: number; quota?: number; usage?: number };
type BulkResult = { count: number; sizeBytes?: number; storageInfo?: StorageInfo } | null;
type MathStep = { title: string; task: string; result: string; type?: string };
type CreateWalletModalProps = {
  onClose: () => void;
  onSave: (wallet: GeneratedWallet | GeneratedWallet[]) => Promise<GeneratedWallet | GeneratedWallet[] | void> | GeneratedWallet | GeneratedWallet[] | void;
  existingWallets?: WalletModel[];
  folders?: string[];
  activeFolder?: string;
  allTags?: string[];
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
            : 'border-surface-700 bg-surface-900 hover:border-surface-500 hover:bg-surface-800'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`min-w-0 truncate ${selected ? 'text-white' : 'text-surface-500'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-surface-400 transition-transform ${open ? 'rotate-180 text-brand-300' : 'group-hover:text-surface-200'}`} />
      </button>

      {open && !disabled && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-surface-700 bg-surface-900 p-1.5 shadow-xl shadow-black/20">
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
                    ? 'bg-brand-500/15 text-brand-200'
                    : 'text-surface-200 hover:bg-surface-800 hover:text-white'
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  active ? 'border-brand-400 bg-brand-500 text-white' : 'border-surface-600'
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

export default function CreateWalletModal({ onClose, onSave, existingWallets = [], folders = [], activeFolder = 'All', allTags = [] }: CreateWalletModalProps) {
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
  const [vanityTagInput, setVanityTagInput] = useState('');
  const [vanityTags, setVanityTags] = useState<string[]>([]);
  const [vanityStopReason, setVanityStopReason] = useState('');
  const [vanitySavedCount, setVanitySavedCount] = useState(0);
  const isVanityRunningRef = useRef(false);
  const vanityWorkerRef = useRef<Worker | null>(null);
  const vanityActivityRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vanityFoundRef = useRef<GeneratedWallet[]>([]);

  const vanityPrefixRaw = vanityPrefix.trim();
  const vanitySuffixRaw = vanitySuffix.trim();
  const vanityPrefixClean = vanityPrefixRaw.toLowerCase();
  const vanitySuffixClean = vanitySuffixRaw.toLowerCase();
  const vanityInvalidChars = !VANITY_HEX_PATTERN.test(vanityPrefixRaw) || !VANITY_HEX_PATTERN.test(vanitySuffixRaw);
  const vanityPatternLength = vanityPrefixClean.length + vanitySuffixClean.length;
  const vanityHasPattern = vanityPatternLength > 0;
  const vanityExpectedTries = Math.pow(16, vanityPatternLength || 0);
  const vanityEstimatedSeconds = vanitySpeed > 0 && vanityHasPattern ? vanityExpectedTries / vanitySpeed : 0;
  const vanityTooLong = vanityPatternLength > VANITY_MAX_SAFE_LENGTH;
  const vanityCanStart = vanityHasPattern && !vanityInvalidChars && !vanityGenerating;
  const vanitySafeTargetCount = Math.max(1, Math.min(100, Number(vanityTargetCount) || 1));
  const vanityDifficultyKey = vanityPatternLength <= 2 ? 'easy' : vanityPatternLength <= 4 ? 'medium' : vanityPatternLength <= 6 ? 'hard' : 'extreme';
  const vanityDifficultyTone = {
    easy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    medium: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    hard: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
    extreme: 'bg-red-500/10 text-red-300 border-red-500/25'
  }[vanityDifficultyKey];
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
      if (vanityWorkerRef.current) vanityWorkerRef.current.terminate();
    };
  }, []);

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

  const saveVanityWallets = async (walletsToSave: GeneratedWallet[], closeAfterSave = false) => {
    if (!walletsToSave.length) return;
    await onSave(walletsToSave.length === 1 ? walletsToSave[0] : walletsToSave);
    setVanitySavedCount(walletsToSave.length);
    showToast(t('createWallet.vanityAutoSaved', { count: walletsToSave.length, folder: walletsToSave[0].groupId, label: t('walletCard.new') }), 'success');
    if (closeAfterSave) onClose();
  };

  const finishVanityRun = async ({ reason = '', closeAfterSave = false } = {}) => {
    isVanityRunningRef.current = false;
    setVanityGenerating(false);
    if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
    vanityActivityRef.current = null;
    if (vanityWorkerRef.current) {
      vanityWorkerRef.current.postMessage({ type: 'stop' });
      vanityWorkerRef.current.terminate();
      vanityWorkerRef.current = null;
    }
    if (reason) setVanityStopReason(reason);
    const foundWallets = [...vanityFoundRef.current];
    if (foundWallets.length > 0) {
      await saveVanityWallets(foundWallets, closeAfterSave);
      vanityFoundRef.current = [];
    }
  };

  const startVanity = async () => {
     if (!vanityCanStart) return;
     if (vanityTooLong) {
       const ok = await showConfirm(t('createWallet.vanityLongConfirm'), {
         danger: true,
         title: t('createWallet.vanityLongTitle'),
         confirmText: t('createWallet.startVanity')
       });
       if (!ok) return;
     }

     isVanityRunningRef.current = true;
     setVanityGenerating(true);
     setVanityScanned(0);
     setVanitySpeed(0);
     setVanityTime(0);
     setVanityStopReason('');
     setVanitySavedCount(0);
     setGeneratedWallets([]);
     vanityFoundRef.current = [];

     window.dispatchEvent(new Event(APP_ACTIVITY_EVENT));
     if (vanityActivityRef.current) clearInterval(vanityActivityRef.current);
     vanityActivityRef.current = setInterval(() => {
       window.dispatchEvent(new Event(APP_ACTIVITY_EVENT));
     }, 15000);

     if (vanityWorkerRef.current) vanityWorkerRef.current.terminate();
     const worker = new Worker(new URL('../workers/vanityWorker.js', import.meta.url), { type: 'module' });
     vanityWorkerRef.current = worker;

     worker.onmessage = (event) => {
       const { type, scanned, elapsed, wallet } = event.data || {};
       if (!isVanityRunningRef.current) return;

       window.dispatchEvent(new Event(APP_ACTIVITY_EVENT));
       const safeElapsed = Number(elapsed) || 0;
       if (safeElapsed > 0) {
         setVanityScanned(scanned || 0);
         setVanityTime(Number(safeElapsed.toFixed(1)));
         setVanitySpeed(Math.floor((scanned || 0) / safeElapsed));
       }

       if (vanityTimeLimit > 0 && safeElapsed >= vanityTimeLimit) {
         finishVanityRun({ reason: t('createWallet.vanityTimeLimitReached') });
         return;
       }

       if (type === 'found' && wallet) {
         const nextWallet = buildVanityWallet(wallet, vanityFoundRef.current.length);
         vanityFoundRef.current = [...vanityFoundRef.current, nextWallet];
         setGeneratedWallets(vanityFoundRef.current);
         setWalletName(t('createWallet.vanityWalletName'));
       }

       if (type === 'complete') {
         finishVanityRun({ reason: t('createWallet.vanityComplete', { count: vanityFoundRef.current.length }), closeAfterSave: true });
       }
     };

     worker.onerror = () => {
       stopVanity();
       showToast(t('createWallet.vanityWorkerError'), 'error');
     };

     worker.postMessage({
       type: 'start',
       prefix: vanityPrefixClean,
       suffix: vanitySuffixClean,
       batchSize: 120,
       targetCount: vanitySafeTargetCount
     });
  };

  const stopVanity = async () => {
     await finishVanityRun({ reason: t('createWallet.vanityStopped') });
  };

  const createRandomWalletRecord = (name: string): GeneratedWallet => {
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
      network: 'XLAYER'
    };
  };

  const generateWallet = async () => {
    const count = Number.parseInt(String(generateCount), 10) || 1;
    if (count < 1) return;

    if (count < 10) {
      setGenerating(true);
      setGenerateProgress(0);
      setFloatingEffects([]);
      
      const processSingle = async (i: number, newWallets: GeneratedWallet[]) => {
        if (i < count) {
          const record = createRandomWalletRecord(count === 1 ? `Wallet ${Date.now().toString(36).slice(-4).toUpperCase()}` : `Wallet ${i + 1}`);
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
          newWallets.push(createRandomWalletRecord(`Wallet ${j + 1}`));
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
      createdAt: Date.now() + index
    }));
    
    const saved = await onSave(toSave.length === 1 ? toSave[0] : toSave);
    const savedList = (Array.isArray(saved) ? saved : saved ? [saved] : []) as GeneratedWallet[];
    showToast(t('createWallet.walletCreated', { count: savedList.length || toSave.length, folder: savedList[0]?.groupId || toSave[0]?.groupId || 'Created', label: t('walletCard.new') }), 'success');
    onClose();
  };

  const handleSaveManual = async () => {
    if (!manualAddress && !manualPK && !manualSeed) {
      showToast(t('createWallet.fillRequired'), 'warning');
      return;
    }
    const saved = await onSave({ name: walletName || 'Manual Wallet', address: manualAddress.trim(), privateKey: manualPK.trim(), seedPhrase: manualSeed.trim(), balance: normalizeAmountInput(manualBalance) || '0.00', notes: manualNotes.trim(), network: manualNetwork, createdAt: Date.now() });
    const savedWallet = (Array.isArray(saved) ? saved[0] : saved) as GeneratedWallet | undefined;
    showToast(duplicateWarning ? t('createWallet.walletAddedDuplicate') : t('createWallet.walletAdded', { folder: savedWallet?.groupId || 'Created', label: t('walletCard.new') }), 'success');
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
    showToast(t('createWallet.walletAdded', { folder: savedWallet?.groupId || 'Created', label: t('walletCard.new') }), 'success');
    onClose();
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="create-wallet-modal-panel bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh]">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-brand-400" />
            {t('createWallet.title')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 border-b border-surface-800">
          <button onClick={() => setTab('manual')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'manual' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-surface-400 hover:text-white'}`}>
            <Keyboard size={16} /> {t('createWallet.tabManual')}
          </button>
          <button onClick={() => setTab('generate')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'generate' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-surface-400 hover:text-white'}`}>
            <RefreshCw size={16} /> {t('createWallet.tabGenerate')}
          </button>
          <button onClick={() => setTab('hdTree')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'hdTree' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-surface-400 hover:text-white'}`}>
            <Trees size={16} /> {t('createWallet.tabHdTree')}
          </button>
          <button onClick={() => setTab('vanity')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'vanity' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-surface-400 hover:text-white'}`}>
            <Wallet size={16} /> {t('createWallet.tabVanity') || 'Vanity'}
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

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
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.derivationPath') || 'Derivation Path'}</label>
                <input type="text" value={manualDerivationPath} onChange={(e) => setManualDerivationPath(e.target.value)} placeholder="m/44'/60'/0'/0/0"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <p className="text-[11px] text-surface-500 mt-1 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.derivationPathHelp') || "Advanced: Custom HD path (e.g. m/44'/60'/0'/0/0)"}</p>
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
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-surface-800 text-brand-300 p-3 rounded-lg text-sm break-all">{w.address}</code>
                          <button onClick={() => handleCopy(w.address || '', `addr_${index}`)} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg">
                            {copiedField === `addr_${index}` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
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

          {/* ── Vanity Tab ── */}
          {tab === 'vanity' && (
            <div className="space-y-6 pb-20">
              <div className="bg-surface-800/40 border border-surface-700 p-4 rounded-xl mb-4 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-brand-400" />
                      {t('createWallet.vanityTitle')}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('createWallet.vanitySubtitle')}</p>
                  </div>
                  <div className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold ${vanityDifficultyTone}`}>
                    {t(`createWallet.vanityDifficulty_${vanityDifficultyKey}`)}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.vanityPrefix') || 'Prefix'}</label>
                    <input type="text" value={vanityPrefix} onChange={(e) => setVanityPrefix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. 123" disabled={vanityGenerating}
                      className={`w-full bg-surface-900 border rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none disabled:opacity-50 ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-700 focus:border-brand-500'}`} />
                    <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityPrefixHint')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.vanitySuffix') || 'Suffix'}</label>
                    <input type="text" value={vanitySuffix} onChange={(e) => setVanitySuffix(e.target.value.replace(/\s/g, '').slice(0, 12))} placeholder="e.g. abc" disabled={vanityGenerating}
                      className={`w-full bg-surface-900 border rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none disabled:opacity-50 ${vanityInvalidChars ? 'border-red-500/60 focus:border-red-400' : 'border-surface-700 focus:border-brand-500'}`} />
                    <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanitySuffixHint')}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-surface-500">{t('createWallet.vanityPresets')}</p>
                  <div className="flex flex-wrap gap-2">
                    {VANITY_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={vanityGenerating}
                        onClick={() => setVanitySuffix(preset)}
                        className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 font-mono text-xs font-semibold text-surface-200 transition-colors hover:border-brand-500 hover:text-brand-300 disabled:opacity-50"
                      >
                        {preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={vanityGenerating}
                      onClick={() => { setVanityPrefix(''); setVanitySuffix(''); }}
                      className="rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs font-semibold text-surface-400 transition-colors hover:border-surface-500 hover:text-white disabled:opacity-50"
                    >
                      {t('createWallet.clearPattern')}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-surface-700 bg-surface-900/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-surface-400"><Gauge size={14} />{t('createWallet.vanityExpected')}</div>
                    <div className="mt-1 text-sm font-bold text-white">{vanityHasPattern ? formatCompactNumber(vanityExpectedTries) : '-'}</div>
                  </div>
                  <div className="rounded-lg border border-surface-700 bg-surface-900/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-surface-400"><Timer size={14} />{t('createWallet.vanityEstimated')}</div>
                    <div className="mt-1 text-sm font-bold text-white">{vanityEstimatedSeconds ? formatVanitySeconds(vanityEstimatedSeconds) : '-'}</div>
                  </div>
                  <div className="rounded-lg border border-surface-700 bg-surface-900/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-surface-400"><ShieldCheck size={14} />{t('createWallet.vanityLocal')}</div>
                    <div className="mt-1 text-sm font-bold text-emerald-300">{t('createWallet.vanityOffline')}</div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-surface-400">
                      <Copy size={13} /> {t('createWallet.vanityQuantity')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={vanityTargetCount}
                      disabled={vanityGenerating}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setVanityTargetCount('');
                          return;
                        }
                        setVanityTargetCount(Math.max(1, Math.min(100, Number(raw) || 1)));
                      }}
                      onBlur={() => setVanityTargetCount(vanitySafeTargetCount)}
                      className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5 text-sm font-semibold text-white focus:border-brand-500 focus:outline-none disabled:opacity-50"
                    />
                    <p className="mt-1 text-[11px] text-surface-500">{t('createWallet.vanityQuantityHint')}</p>
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
                          className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${vanityTimeLimit === seconds ? 'border-brand-500 bg-brand-500/15 text-brand-300' : 'border-surface-700 bg-surface-900 text-surface-300 hover:border-surface-500'} disabled:opacity-50`}
                        >
                          {seconds === 0 ? t('createWallet.vanityNoLimit') : formatVanitySeconds(seconds)}
                        </button>
                      ))}
                    </div>
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
                      className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2.5 text-sm text-white placeholder:text-surface-600 focus:border-brand-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={vanityGenerating || !vanityTagInput.trim()}
                      onClick={addVanityTag}
                      className="rounded-lg border border-surface-700 bg-surface-900 px-3 text-sm font-semibold text-surface-200 hover:border-brand-500 hover:text-brand-300 disabled:opacity-50"
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
                          className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-300 disabled:opacity-50"
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
                          className="rounded-full border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs font-semibold text-surface-400 hover:border-brand-500 hover:text-brand-300 disabled:opacity-50"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {vanityInvalidChars ? (
                  <div className="danger-note">
                    <AlertTriangle size={16} className="danger-note-icon" />
                    <span className="danger-note-body">{t('createWallet.vanityInvalidChars')}</span>
                  </div>
                ) : (
                  <div className="warning-note">
                    <AlertTriangle size={16} className="warning-note-icon" />
                    <span className="warning-note-body">{t('createWallet.vanityWarning')}</span>
                  </div>
                )}
              </div>

              {!vanityGenerating && generatedWallets.length === 0 ? (
                <>
                {vanityStopReason && (
                  <div className="warning-note flex items-start gap-2 rounded-xl border p-3 text-sm">
                    <AlertTriangle size={16} className="warning-note-icon mt-0.5 flex-shrink-0" />
                    <span className="warning-note-body">{vanityStopReason}</span>
                  </div>
                )}
                <button onClick={startVanity} disabled={!vanityCanStart} className="btn-glow w-full bg-brand-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:bg-brand-500 transition-all flex items-center justify-center gap-2 text-sm disabled:bg-surface-700 disabled:text-surface-400 disabled:shadow-none disabled:cursor-not-allowed">
                  <RefreshCw size={18} />
                  {vanityHasPattern ? t('createWallet.startVanity') : t('createWallet.vanityNeedPattern')}
                </button>
                </>
              ) : vanityGenerating ? (
                <div className="bg-surface-800/50 rounded-xl p-5 text-center border border-brand-500/20">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-brand-400 text-sm font-semibold mb-1">{t('createWallet.vanityGeneratingCount', { current: generatedWallets.length, total: vanitySafeTargetCount })}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-left">
                    <div className="rounded-lg bg-surface-900 p-2">
                      <span className="block text-[10px] text-surface-500">{t('createWallet.vanityScanned')}</span>
                      <span className="block text-xs font-bold text-white">{formatCompactNumber(vanityScanned)}</span>
                    </div>
                    <div className="rounded-lg bg-surface-900 p-2">
                      <span className="block text-[10px] text-surface-500">{t('createWallet.vanitySpeed')}</span>
                      <span className="block text-xs font-bold text-white">{formatCompactNumber(vanitySpeed)}/s</span>
                    </div>
                    <div className="rounded-lg bg-surface-900 p-2">
                      <span className="block text-[10px] text-surface-500">{t('createWallet.vanityElapsed')}</span>
                      <span className="block text-xs font-bold text-white">{formatVanitySeconds(vanityTime)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-surface-500">{t('createWallet.vanityAutoLockPaused')}</p>
                  <button onClick={stopVanity} className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors">
                    {t('createWallet.stopVanity') || 'Stop'}
                  </button>
                </div>
              ) : (
                <div className="bg-surface-800 rounded-xl overflow-hidden border border-surface-700">
                  <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-800/50">
                    <div>
                      <h3 className="font-medium text-white text-sm">{walletName || generatedWallets[0].name}</h3>
                      <p className="mt-0.5 text-[11px] text-emerald-300">
                        {vanitySavedCount > 0
                          ? t('createWallet.vanitySavedSummary', { count: vanitySavedCount, folder: generatedWallets[0]?.groupId || VANITY_DEFAULT_FOLDER })
                          : t('createWallet.vanityFoundCount', { count: generatedWallets.length, total: vanitySafeTargetCount })}
                      </p>
                    </div>
                    <button onClick={() => { setGeneratedWallets([]); setVanityScanned(0); setVanitySavedCount(0); vanityFoundRef.current = []; }} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                      <RefreshCw size={12} /> {t('authError.retry') || 'Retry'}
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-xs text-surface-400 block mb-1">{t('createWallet.address') || 'Address'}</span>
                      <div className="flex justify-between items-center p-2.5 bg-surface-900 rounded-lg font-mono text-xs text-brand-400 break-all">
                        <span>{generatedWallets[0].address}</span>
                        <button onClick={() => handleCopy(generatedWallets[0].address || '', 'addr')} className="p-1 hover:bg-surface-800 rounded text-surface-400 transition-colors ml-2 flex-shrink-0">
                          {copiedField === 'addr' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400 block mb-1">{t('createWallet.privateKey') || 'Private Key'}</span>
                      <div className="flex justify-between items-center p-2.5 bg-surface-900 rounded-lg font-mono text-xs text-brand-400 break-all">
                        <span>{generatedWallets[0].privateKey}</span>
                        <button onClick={() => handleCopy(generatedWallets[0].privateKey || '', 'pk')} className="p-1 hover:bg-surface-800 rounded text-surface-400 transition-colors ml-2 flex-shrink-0">
                          {copiedField === 'pk' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    {generatedWallets[0].mnemonic && (
                      <div>
                        <span className="text-xs text-surface-400 block mb-1">{t('createWallet.seedPhrase') || 'Seed Phrase'}</span>
                        <div className="flex justify-between items-center p-2.5 bg-surface-900 rounded-lg font-mono text-xs text-brand-400 break-all">
                          <span>{generatedWallets[0].mnemonic}</span>
                          <button onClick={() => handleCopy(generatedWallets[0].mnemonic || '', 'seed')} className="p-1 hover:bg-surface-800 rounded text-surface-400 transition-colors ml-2 flex-shrink-0">
                            {copiedField === 'seed' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
