import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import Papa from 'papaparse';
import { getAddress } from 'ethers';
import { X, Wrench, ShieldCheck, Tags, Download, GitCompare, Search, Network, History, LockKeyhole, Merge, Sparkles, ClipboardCheck, RefreshCw, type LucideIcon } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { saveWallets } from '../utils/storage';
import { exportPortableBackup, parseVaultBackupFile } from '../utils/backupUtils';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import PasswordInput from './PasswordInput';
import Notice from './Notice';
import type { Wallet } from '../types';

export const SENSITIVE_EXPORT_LOCK_KEY = 'xkey_sensitive_export_lock';
const HISTORY_KEY = 'xkey_tool_history';

const sectionIconMap = {
  check: ClipboardCheck,
  repair: Sparkles,
  transfer: Download,
  safety: ShieldCheck,
};

type PickedFileData = {
  name?: string;
  data?: string;
};

type PlainWalletRow = {
  name?: string;
  Name?: string;
  address?: string;
  Address?: string;
  wallet?: string;
  privateKey?: string;
  private_key?: string;
  pk?: string;
  seedPhrase?: string;
  seed_phrase?: string;
  seed?: string;
  mnemonic?: string;
  network?: string;
  Network?: string;
  notes?: string;
  Notes?: string;
};

type ToolKey = 'check' | 'repair' | 'transfer' | 'safety';
type ExportScope = 'filtered' | 'all';
type HistoryItem = { ts: string; message: string };
type ToolSection = { key: ToolKey; tools: string[]; tone: string };

type AdvancedToolsModalProps = {
  wallets: Wallet[];
  filteredWallets: Wallet[];
  setWallets: (wallets: Wallet[]) => void;
  aesKey: string;
  isDecoyMode: boolean;
  onClose: () => void;
  onSearch: (pattern: string) => void;
};

const walletId = (wallet: Wallet, index: number) => wallet._id || `${wallet.address || 'no-address'}:${wallet.name || ''}:${index}`;

const pickFilesCompat = (options: Parameters<typeof FilePicker.pickFiles>[0] & { multiple?: boolean }) => (
  FilePicker.pickFiles(options as Parameters<typeof FilePicker.pickFiles>[0])
);

const isEvm = (value = ''): boolean => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isTron = (value = ''): boolean => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value.trim());
const isSolana = (value = ''): boolean => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim()) && !isTron(value);

const detectNetwork = (address = ''): string => {
  const clean = address.trim();
  if (isTron(clean)) return 'Tron';
  if (isSolana(clean)) return 'Solana';
  if (isEvm(clean)) return 'ETH';
  return '';
};

const normalizeWallet = (wallet: Wallet): Wallet => {
  const next: Wallet = { ...wallet };
  for (const key of ['name', 'address', 'privateKey', 'seedPhrase', 'notes', 'network', 'groupId'] as const) {
    if (typeof next[key] === 'string') next[key] = next[key].trim();
  }
  if (next.address && isEvm(next.address)) {
    try { next.address = getAddress(next.address); } catch {
      // Leave non-checksummable values unchanged.
    }
  }
  if (Array.isArray(next.tags)) {
    next.tags = [...new Set(next.tags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean))];
  }
  return next;
};

const decodeFileData = (file: PickedFileData): string => {
  try {
    const binString = atob(file.data || '');
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) bytes[i] = binString.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return file.data || '';
  }
};

const parsePlainWalletFile = (file: PickedFileData): Wallet[] => {
  const raw = decodeFileData(file).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  }
  const parsed = Papa.parse<PlainWalletRow>(raw, { header: true, skipEmptyLines: true });
  return (parsed.data || []).map(row => ({
    name: row.name || row.Name || '',
    address: row.address || row.Address || row.wallet || '',
    privateKey: row.privateKey || row.private_key || row.pk || '',
    seedPhrase: row.seedPhrase || row.seed_phrase || row.seed || row.mnemonic || '',
    network: row.network || row.Network || '',
    notes: row.notes || row.Notes || '',
  }));
};

const parseWalletFile = async (file: PickedFileData, aesKey: string, password: string): Promise<Wallet[]> => {
  if (file.name?.toLowerCase().endsWith('.xkey')) {
    const backup = await parseVaultBackupFile(file.data || '', aesKey, password || null);
    return backup.wallets || [];
  }
  return parsePlainWalletFile(file);
};

export default function AdvancedToolsModal({
  wallets,
  filteredWallets,
  setWallets,
  aesKey,
  isDecoyMode,
  onClose,
  onSearch,
}: AdvancedToolsModalProps) {
  const t = useT();
  const { showToast } = useToast();
  const [activeTool, setActiveTool] = useState<ToolKey>('check');
  const [tagInput, setTagInput] = useState('');
  const [patternInput, setPatternInput] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [comparePassword, setComparePassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [compareResult, setCompareResult] = useState('');
  const [verifyResult, setVerifyResult] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [exportScope, setExportScope] = useState<ExportScope>('filtered');
  const [sensitiveLock, setSensitiveLock] = useState(false);

  const selectedSet = useMemo(() => new Set(filteredWallets), [filteredWallets]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
    } catch {
      setHistory([]);
    }
    Preferences.get({ key: SENSITIVE_EXPORT_LOCK_KEY }).then(({ value }) => setSensitiveLock(value === 'true')).catch(() => {});
  }, []);

  const addHistory = (message: string) => {
    const item = { ts: new Date().toISOString(), message };
    setHistory(prev => {
      const next = [item, ...prev].slice(0, 50);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {
        // History is non-critical; ignore storage failures.
      }
      return next;
    });
  };

  const persist = async (nextWallets: Wallet[], message: string) => {
    setWallets(nextWallets);
    const saved = await saveWallets(nextWallets, aesKey, isDecoyMode);
    if (!saved) {
      showToast(t('advancedTools.saveFailed'), 'error');
      return;
    }
    addHistory(message);
    showToast(message, 'success');
  };

  const audit = useMemo(() => {
    const target = filteredWallets;
    return {
      missingAddress: target.filter(w => !w.address).length,
      missingPrivateKey: target.filter(w => !w.privateKey).length,
      missingSeed: target.filter(w => !w.seedPhrase).length,
      missingNetwork: target.filter(w => !w.network).length,
      missingNotes: target.filter(w => !w.notes).length,
    };
  }, [filteredWallets]);

  const risks = useMemo(() => {
    const addressMap = new Map<string, number>();
    const pkMap = new Map<string, number>();
    const seedMap = new Map<string, number>();
    const invalid: Wallet[] = [];
    filteredWallets.forEach((wallet, index) => {
      if (wallet.address) {
        const key = wallet.address.toLowerCase().trim();
        addressMap.set(key, (addressMap.get(key) || 0) + 1);
        if (!isEvm(wallet.address) && !isTron(wallet.address) && !isSolana(wallet.address)) invalid.push(wallet);
      }
      if (wallet.privateKey) {
        const key = wallet.privateKey.trim().toLowerCase();
        pkMap.set(key, (pkMap.get(key) || 0) + 1);
      }
      if (wallet.seedPhrase) {
        const key = wallet.seedPhrase.trim().toLowerCase();
        seedMap.set(key, (seedMap.get(key) || 0) + 1);
      }
      walletId(wallet, index);
    });
    const countDupes = (map: Map<string, number>) => [...map.values()].filter(count => count > 1).length;
    return {
      duplicateAddress: countDupes(addressMap),
      duplicatePrivateKey: countDupes(pkMap),
      duplicateSeed: countDupes(seedMap),
      invalidAddress: invalid.length,
    };
  }, [filteredWallets]);

  const normalizeFiltered = async () => {
    let changed = 0;
    const next = wallets.map(wallet => {
      if (!selectedSet.has(wallet)) return wallet;
      const normalized = normalizeWallet(wallet);
      if (JSON.stringify(normalized) !== JSON.stringify(wallet)) changed++;
      return normalized;
    });
    await persist(next, t('advancedTools.normalized', { count: changed }));
  };

  const bulkTagFiltered = async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    const next = wallets.map(wallet => {
      if (!selectedSet.has(wallet)) return wallet;
      const tags = wallet.tags || [];
      return tags.includes(tag) ? wallet : { ...wallet, tags: [...tags, tag] };
    });
    await persist(next, t('advancedTools.tagged', { count: filteredWallets.length, tag }));
    setTagInput('');
  };

  const exportScopedBackup = async () => {
    if (backupPassword.length < 6) {
      showToast(t('settings.passwordMinError'), 'warning');
      return;
    }
    const scopeWallets = exportScope === 'all' ? wallets : filteredWallets;
    try {
      const success = await exportPortableBackup(scopeWallets, { scope: exportScope }, backupPassword);
      if (success) {
        addHistory(t('advancedTools.exportedScoped', { count: scopeWallets.length }));
        showToast(t('settings.exportSuccess'), 'success');
        setBackupPassword('');
      } else {
        showToast(t('settings.exportFailed'), 'error');
      }
    } catch {
      showToast(t('settings.exportError'), 'error');
    }
  };

  const compareFiles = async () => {
    try {
      const result = await pickFilesCompat({ multiple: true, readData: true, types: ['.csv', '.json', '.xkey', 'text/csv', 'application/json', 'application/octet-stream', '*/*'] });
      const files = result.files || [];
      if (files.length < 2) return;
      const first = await parseWalletFile(files[0], aesKey, comparePassword);
      const second = await parseWalletFile(files[1], aesKey, comparePassword);
      const a = new Set(first.map(w => w.address?.toLowerCase()).filter(Boolean));
      const b = new Set(second.map(w => w.address?.toLowerCase()).filter(Boolean));
      const onlyA = [...a].filter(x => !b.has(x)).length;
      const onlyB = [...b].filter(x => !a.has(x)).length;
      const both = [...a].filter(x => b.has(x)).length;
      setCompareResult(t('advancedTools.compareResult', { onlyA, onlyB, both }));
      addHistory(t('advancedTools.compared'));
    } catch {
      setCompareResult(t('advancedTools.compareFailed'));
    }
  };

  const runPatternSearch = () => {
    const pattern = patternInput.trim();
    if (!pattern) return;
    onSearch(pattern);
    addHistory(t('advancedTools.patternApplied', { pattern }));
    onClose();
  };

  const autoDetectNetworks = async () => {
    let changed = 0;
    const next = wallets.map(wallet => {
      if (!selectedSet.has(wallet)) return wallet;
      const network = detectNetwork(wallet.address || '');
      if (!network || wallet.network === network) return wallet;
      changed++;
      return { ...wallet, network };
    });
    await persist(next, t('advancedTools.detected', { count: changed }));
  };

  const mergeDuplicates = async () => {
    const map = new Map<string, Wallet>();
    const result: Wallet[] = [];
    let removed = 0;
    for (const wallet of wallets) {
      const key = wallet.address?.toLowerCase().trim();
      if (!key) {
        result.push(wallet);
        continue;
      }
      if (!map.has(key)) {
        const nextWallet = { ...wallet };
        map.set(key, nextWallet);
        result.push(nextWallet);
        continue;
      }
      const existing = map.get(key);
      if (!existing) continue;
      existing.name ||= wallet.name;
      existing.privateKey ||= wallet.privateKey;
      existing.seedPhrase ||= wallet.seedPhrase;
      existing.network ||= wallet.network;
      existing.groupId ||= wallet.groupId;
      existing.notes = [existing.notes, wallet.notes].filter(Boolean).join(existing.notes && wallet.notes ? '\n' : '');
      existing.tags = [...new Set([...(existing.tags || []), ...(wallet.tags || [])])];
      removed++;
    }
    await persist(result, t('advancedTools.merged', { count: removed }));
  };

  const verifyBackup = async () => {
    try {
      const result = await pickFilesCompat({ multiple: false, readData: true, types: ['.xkey', 'application/octet-stream', '*/*'] });
      const file = result.files?.[0];
      if (!file) return;
      const backup = await parseVaultBackupFile(file.data || '', aesKey, verifyPassword || null);
      const walletCount = Array.isArray(backup.wallets) ? backup.wallets.length : 0;
      setVerifyResult(t('advancedTools.verifyOk', { count: walletCount }));
      addHistory(t('advancedTools.verified'));
    } catch {
      setVerifyResult(t('advancedTools.verifyFail'));
    }
  };

  const toggleExportLock = async () => {
    const next = !sensitiveLock;
    setSensitiveLock(next);
    await Preferences.set({ key: SENSITIVE_EXPORT_LOCK_KEY, value: String(next) });
    addHistory(next ? t('advancedTools.lockEnabled') : t('advancedTools.lockDisabled'));
  };

  const toolSections: ToolSection[] = [
    { key: 'check', tools: ['audit', 'risk', 'verify'], tone: 'brand' },
    { key: 'repair', tools: ['normalize', 'detect', 'merge', 'tag'], tone: 'emerald' },
    { key: 'transfer', tools: ['export', 'compare', 'pattern'], tone: 'amber' },
    { key: 'safety', tools: ['history', 'lock'], tone: 'surface' },
  ];

  const renderTool = () => {
    if (activeTool === 'check') {
      return (
        <div className="space-y-4">
          <div>
            <SectionHeading title={t('advancedTools.audit')} text={t('advancedTools.auditSummary')} />
            <Stats rows={[
              [t('advancedTools.missingAddress'), audit.missingAddress],
              [t('advancedTools.missingPrivateKey'), audit.missingPrivateKey],
              [t('advancedTools.missingSeed'), audit.missingSeed],
              [t('advancedTools.missingNetwork'), audit.missingNetwork],
              [t('advancedTools.missingNotes'), audit.missingNotes],
            ]} compact />
          </div>
          <div>
            <SectionHeading title={t('advancedTools.risk')} text={t('advancedTools.riskSummary')} />
            <Stats rows={[
              [t('advancedTools.duplicateAddress'), risks.duplicateAddress],
              [t('advancedTools.duplicatePrivateKey'), risks.duplicatePrivateKey],
              [t('advancedTools.duplicateSeed'), risks.duplicateSeed],
              [t('advancedTools.invalidAddress'), risks.invalidAddress],
            ]} compact />
          </div>
          <ActionPanel icon={ShieldCheck} title={t('advancedTools.verify')} text={t('advancedTools.verifyDesc')} action={verifyBackup} actionText={t('advancedTools.pickBackup')}>
            <Notice variant="warning">{t('settings.hardwareBoundVerifyNote')}</Notice>
            <PasswordInput value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} placeholder={t('settings.backupPassword')} className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-500" />
            {verifyResult && <p className="rounded-lg border border-surface-700 bg-surface-800 p-3 text-sm text-surface-200">{verifyResult}</p>}
          </ActionPanel>
        </div>
      );
    }
    if (activeTool === 'repair') {
      return (
        <div className="grid gap-3 lg:grid-cols-2">
          <ActionPanel icon={Sparkles} title={t('advancedTools.normalize')} text={t('advancedTools.normalizeDesc')} action={normalizeFiltered} actionText={t('advancedTools.runNormalize')} />
          <ActionPanel icon={Network} title={t('advancedTools.detect')} text={t('advancedTools.detectDesc')} action={autoDetectNetworks} actionText={t('advancedTools.runDetect')} />
          <ActionPanel icon={Merge} title={t('advancedTools.merge')} text={t('advancedTools.mergeDesc')} action={mergeDuplicates} actionText={t('advancedTools.runMerge')} danger />
          <ActionPanel icon={Tags} title={t('advancedTools.tag')} text={t('advancedTools.tagDesc')}>
            <InputAction value={tagInput} onChange={setTagInput} placeholder={t('advancedTools.tagPlaceholder')} action={bulkTagFiltered} actionText={t('advancedTools.applyTag')} />
          </ActionPanel>
        </div>
      );
    }
    if (activeTool === 'transfer') {
      return (
        <div className="space-y-3">
          <ActionPanel icon={Download} title={t('advancedTools.export')} text={t('advancedTools.exportDesc')} action={exportScopedBackup} actionText={t('advancedTools.exportScoped')} success>
            <Notice variant="warning">{t('settings.hardwareBoundPortableBackupNote')}</Notice>
            <div className="grid grid-cols-2 gap-2">
              {(['filtered', 'all'] as ExportScope[]).map(scope => (
                <button key={scope} onClick={() => setExportScope(scope)} className={`rounded-lg border px-3 py-2 text-sm ${exportScope === scope ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-surface-700 bg-surface-800 text-surface-300'}`}>
                  {t(`advancedTools.scope_${scope}`)}
                </button>
              ))}
            </div>
            <PasswordInput value={backupPassword} onChange={e => setBackupPassword(e.target.value)} placeholder={t('settings.backupPassword')} className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
          </ActionPanel>
          <div className="grid gap-3 lg:grid-cols-2">
            <ActionPanel icon={GitCompare} title={t('advancedTools.compare')} text={compareResult || t('advancedTools.compareDesc')} action={compareFiles} actionText={t('advancedTools.pickTwoFiles')}>
              <PasswordInput value={comparePassword} onChange={e => setComparePassword(e.target.value)} placeholder={t('advancedTools.comparePasswordPlaceholder')} className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-500" />
            </ActionPanel>
            <ActionPanel icon={Search} title={t('advancedTools.pattern')} text={t('advancedTools.patternDesc')}>
              <InputAction value={patternInput} onChange={setPatternInput} placeholder={t('advancedTools.patternPlaceholder')} action={runPatternSearch} actionText={t('advancedTools.applyPattern')} />
            </ActionPanel>
          </div>
        </div>
      );
    }
    if (activeTool === 'safety') {
      return (
        <div className="space-y-3">
          <ActionPanel icon={LockKeyhole} title={t('advancedTools.lock')} text={sensitiveLock ? t('advancedTools.lockOn') : t('advancedTools.lockOff')} action={toggleExportLock} actionText={sensitiveLock ? t('advancedTools.disableLock') : t('advancedTools.enableLock')} />
          <div className="rounded-xl border border-surface-700 bg-surface-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <History size={17} className="text-surface-400" />
              <h4 className="text-sm font-semibold text-white">{t('advancedTools.history')}</h4>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto">
              {history.length === 0 ? <p className="text-sm text-surface-400">{t('advancedTools.noHistory')}</p> : history.map(item => <div key={`${item.ts}-${item.message}`} className="rounded-lg border border-surface-700 bg-surface-800 p-3 text-xs text-surface-300"><div className="text-surface-500">{new Date(item.ts).toLocaleString()}</div>{item.message}</div>)}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-950 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-brand-400" />
            <h2 className="text-sm font-bold text-white sm:text-base">{t('advancedTools.title')}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-surface-400 hover:bg-surface-800 hover:text-white"><X size={18} /></button>
        </div>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b border-surface-800 p-2 lg:border-b-0 lg:border-r lg:p-3">
            <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-1 lg:gap-2">
              {toolSections.map(section => {
                const Icon = sectionIconMap[section.key];
                return (
                  <button key={section.key} onClick={() => setActiveTool(section.key)} className={`flex min-h-0 flex-col items-center gap-1.5 rounded-lg px-1.5 py-2 text-center transition-colors lg:min-h-20 lg:flex-row lg:items-start lg:gap-3 lg:rounded-xl lg:px-3 lg:py-3 lg:text-left ${activeTool === section.key ? 'bg-brand-500 text-white' : 'bg-surface-900 text-surface-300 hover:bg-surface-800 hover:text-white'}`}>
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-black/10 lg:mt-0.5 lg:h-8 lg:w-8">
                      <Icon size={15} className="lg:h-[17px] lg:w-[17px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold leading-tight sm:text-xs lg:text-sm">{t(`advancedTools.section_${section.key}`)}</span>
                      <span className="mt-1 hidden text-xs leading-snug opacity-75 lg:block">{t(`advancedTools.section_${section.key}Desc`)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 overflow-auto p-3 sm:p-4">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-base font-bold text-white sm:text-lg">{t(`advancedTools.section_${activeTool}`)}</h3>
              <p className="text-xs text-surface-500 sm:text-sm">{t('advancedTools.filteredCount', { count: filteredWallets.length })}</p>
            </div>
            {renderTool()}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-2">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="text-[11px] leading-relaxed text-surface-500 sm:text-xs">{text}</p>
    </div>
  );
}

function Stats({ rows, compact }: { rows: [string, number][]; compact?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className={`rounded-lg border border-surface-700 bg-surface-900 ${compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4'}`}>
          <div className="text-[11px] text-surface-500 sm:text-xs">{label}</div>
          <div className={`mt-1 font-bold text-white ${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function ActionPanel({ icon: Icon = RefreshCw, title, text, action, actionText, danger, success, children }: {
  icon?: LucideIcon;
  title?: string;
  text: string;
  action?: () => void | Promise<void>;
  actionText?: string;
  danger?: boolean;
  success?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-surface-700 bg-surface-900 p-3 sm:space-y-4 sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-800 text-surface-300 sm:h-9 sm:w-9">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          {title && <h4 className="text-sm font-semibold text-white">{title}</h4>}
          <p className="mt-1 text-xs leading-relaxed text-surface-300 sm:text-sm">{text}</p>
        </div>
      </div>
      {children}
      {action && actionText && (
        <button onClick={action} className={`rounded-lg px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm ${danger ? 'bg-red-600 hover:bg-red-500' : success ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-brand-600 hover:bg-brand-500'}`}>
          {actionText}
        </button>
      )}
    </div>
  );
}

function InputAction({ value, onChange, placeholder, action, actionText }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  action: () => void | Promise<void>;
  actionText: string;
}) {
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-xs text-white outline-none focus:border-brand-500 sm:text-sm" />
      <button onClick={action} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500 sm:px-4 sm:text-sm">{actionText}</button>
    </div>
  );
}
