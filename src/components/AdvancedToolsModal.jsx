import { useEffect, useMemo, useState } from 'react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import Papa from 'papaparse';
import { getAddress } from 'ethers';
import { X, Wrench, AlertTriangle, FileSearch, ShieldCheck, Tags, Download, GitCompare, Search, Network, History, LockKeyhole, Merge, Sparkles } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { saveWallets } from '../utils/storage';
import { exportPortableBackup, parseVaultBackupFile } from '../utils/backupUtils';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import PasswordInput from './PasswordInput';

export const SENSITIVE_EXPORT_LOCK_KEY = 'xkey_sensitive_export_lock';
const HISTORY_KEY = 'xkey_tool_history';

const toolIconMap = {
  audit: FileSearch,
  normalize: Sparkles,
  risk: AlertTriangle,
  tag: Tags,
  export: Download,
  compare: GitCompare,
  pattern: Search,
  detect: Network,
  merge: Merge,
  verify: ShieldCheck,
  history: History,
  lock: LockKeyhole,
};

const walletId = (wallet, index) => wallet._id || `${wallet.address || 'no-address'}:${wallet.name || ''}:${index}`;

const isEvm = (value = '') => /^0x[a-fA-F0-9]{40}$/.test(value.trim());
const isTron = (value = '') => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value.trim());
const isSolana = (value = '') => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim()) && !isTron(value);

const detectNetwork = (address = '') => {
  const clean = address.trim();
  if (isTron(clean)) return 'Tron';
  if (isSolana(clean)) return 'Solana';
  if (isEvm(clean)) return 'ETH';
  return '';
};

const normalizeWallet = (wallet) => {
  const next = { ...wallet };
  for (const key of ['name', 'address', 'privateKey', 'seedPhrase', 'notes', 'network', 'groupId']) {
    if (typeof next[key] === 'string') next[key] = next[key].trim();
  }
  if (isEvm(next.address)) {
    try { next.address = getAddress(next.address); } catch {
      // Leave non-checksummable values unchanged.
    }
  }
  if (Array.isArray(next.tags)) {
    next.tags = [...new Set(next.tags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean))];
  }
  return next;
};

const decodeFileData = (file) => {
  try {
    const binString = atob(file.data);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) bytes[i] = binString.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return file.data || '';
  }
};

const parsePlainWalletFile = (file) => {
  const raw = decodeFileData(file).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  }
  const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true });
  return (parsed.data || []).map(row => ({
    name: row.name || row.Name || '',
    address: row.address || row.Address || row.wallet || '',
    privateKey: row.privateKey || row.private_key || row.pk || '',
    seedPhrase: row.seedPhrase || row.seed_phrase || row.seed || row.mnemonic || '',
    network: row.network || row.Network || '',
    notes: row.notes || row.Notes || '',
  }));
};

export default function AdvancedToolsModal({
  wallets,
  filteredWallets,
  setWallets,
  aesKey,
  isDecoyMode,
  onClose,
  onSearch,
}) {
  const t = useT();
  const { showToast } = useToast();
  const [activeTool, setActiveTool] = useState('audit');
  const [tagInput, setTagInput] = useState('');
  const [patternInput, setPatternInput] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [compareResult, setCompareResult] = useState('');
  const [verifyResult, setVerifyResult] = useState('');
  const [history, setHistory] = useState([]);
  const [exportScope, setExportScope] = useState('filtered');
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

  const addHistory = (message) => {
    const item = { ts: new Date().toISOString(), message };
    const next = [item, ...history].slice(0, 50);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const persist = async (nextWallets, message) => {
    setWallets(nextWallets);
    await saveWallets(nextWallets, aesKey, isDecoyMode);
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
    const addressMap = new Map();
    const pkMap = new Map();
    const seedMap = new Map();
    const invalid = [];
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
    const countDupes = map => [...map.values()].filter(count => count > 1).length;
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
    const success = await exportPortableBackup(scopeWallets, { scope: exportScope }, backupPassword);
    if (success) {
      addHistory(t('advancedTools.exportedScoped', { count: scopeWallets.length }));
      showToast(t('settings.exportSuccess'), 'success');
      setBackupPassword('');
    } else {
      showToast(t('settings.exportFailed'), 'error');
    }
  };

  const compareFiles = async () => {
    const result = await FilePicker.pickFiles({ multiple: true, readData: true, types: ['.csv', '.json', 'text/csv', 'application/json', '*/*'] });
    const files = result.files || [];
    if (files.length < 2) return;
    const first = parsePlainWalletFile(files[0]);
    const second = parsePlainWalletFile(files[1]);
    const a = new Set(first.map(w => w.address?.toLowerCase()).filter(Boolean));
    const b = new Set(second.map(w => w.address?.toLowerCase()).filter(Boolean));
    const onlyA = [...a].filter(x => !b.has(x)).length;
    const onlyB = [...b].filter(x => !a.has(x)).length;
    const both = [...a].filter(x => b.has(x)).length;
    setCompareResult(t('advancedTools.compareResult', { onlyA, onlyB, both }));
    addHistory(t('advancedTools.compared'));
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
    const map = new Map();
    const result = [];
    let removed = 0;
    for (const wallet of wallets) {
      const key = wallet.address?.toLowerCase().trim();
      if (!key) {
        result.push(wallet);
        continue;
      }
      if (!map.has(key)) {
        map.set(key, { ...wallet });
        result.push(map.get(key));
        continue;
      }
      const existing = map.get(key);
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
    const result = await FilePicker.pickFiles({ multiple: false, readData: true, types: ['.xkey', 'application/octet-stream', '*/*'] });
    const file = result.files?.[0];
    if (!file) return;
    try {
      const backup = await parseVaultBackupFile(file.data, aesKey, verifyPassword || null);
      setVerifyResult(t('advancedTools.verifyOk', { count: backup.wallets.length }));
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

  const tools = ['audit', 'normalize', 'risk', 'tag', 'export', 'compare', 'pattern', 'detect', 'merge', 'verify', 'history', 'lock'];

  const renderTool = () => {
    if (activeTool === 'audit') {
      return <Stats rows={[
        [t('advancedTools.missingAddress'), audit.missingAddress],
        [t('advancedTools.missingPrivateKey'), audit.missingPrivateKey],
        [t('advancedTools.missingSeed'), audit.missingSeed],
        [t('advancedTools.missingNetwork'), audit.missingNetwork],
        [t('advancedTools.missingNotes'), audit.missingNotes],
      ]} />;
    }
    if (activeTool === 'normalize') {
      return <ActionPanel text={t('advancedTools.normalizeDesc')} action={normalizeFiltered} actionText={t('advancedTools.runNormalize')} />;
    }
    if (activeTool === 'risk') {
      return <Stats rows={[
        [t('advancedTools.duplicateAddress'), risks.duplicateAddress],
        [t('advancedTools.duplicatePrivateKey'), risks.duplicatePrivateKey],
        [t('advancedTools.duplicateSeed'), risks.duplicateSeed],
        [t('advancedTools.invalidAddress'), risks.invalidAddress],
      ]} />;
    }
    if (activeTool === 'tag') {
      return <InputAction value={tagInput} onChange={setTagInput} placeholder={t('advancedTools.tagPlaceholder')} action={bulkTagFiltered} actionText={t('advancedTools.applyTag')} />;
    }
    if (activeTool === 'export') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {['filtered', 'all'].map(scope => (
              <button key={scope} onClick={() => setExportScope(scope)} className={`rounded-lg border px-3 py-2 text-sm ${exportScope === scope ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-surface-700 bg-surface-800 text-surface-300'}`}>
                {t(`advancedTools.scope_${scope}`)}
              </button>
            ))}
          </div>
          <PasswordInput value={backupPassword} onChange={e => setBackupPassword(e.target.value)} placeholder={t('settings.backupPassword')} className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
          <button onClick={exportScopedBackup} className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">{t('advancedTools.exportScoped')}</button>
        </div>
      );
    }
    if (activeTool === 'compare') return <ActionPanel text={compareResult || t('advancedTools.compareDesc')} action={compareFiles} actionText={t('advancedTools.pickTwoFiles')} />;
    if (activeTool === 'pattern') return <InputAction value={patternInput} onChange={setPatternInput} placeholder={t('advancedTools.patternPlaceholder')} action={runPatternSearch} actionText={t('advancedTools.applyPattern')} />;
    if (activeTool === 'detect') return <ActionPanel text={t('advancedTools.detectDesc')} action={autoDetectNetworks} actionText={t('advancedTools.runDetect')} />;
    if (activeTool === 'merge') return <ActionPanel text={t('advancedTools.mergeDesc')} action={mergeDuplicates} actionText={t('advancedTools.runMerge')} danger />;
    if (activeTool === 'verify') {
      return (
        <div className="space-y-3">
          <PasswordInput value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} placeholder={t('settings.backupPassword')} className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-500" />
          <button onClick={verifyBackup} className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">{t('advancedTools.pickBackup')}</button>
          {verifyResult && <p className="rounded-lg border border-surface-700 bg-surface-800 p-3 text-sm text-surface-200">{verifyResult}</p>}
        </div>
      );
    }
    if (activeTool === 'history') {
      return <div className="max-h-72 space-y-2 overflow-auto">{history.length === 0 ? <p className="text-sm text-surface-400">{t('advancedTools.noHistory')}</p> : history.map(item => <div key={`${item.ts}-${item.message}`} className="rounded-lg border border-surface-700 bg-surface-800 p-3 text-xs text-surface-300"><div className="text-surface-500">{new Date(item.ts).toLocaleString()}</div>{item.message}</div>)}</div>;
    }
    if (activeTool === 'lock') {
      return <ActionPanel text={sensitiveLock ? t('advancedTools.lockOn') : t('advancedTools.lockOff')} action={toggleExportLock} actionText={sensitiveLock ? t('advancedTools.disableLock') : t('advancedTools.enableLock')} />;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-surface-700 bg-surface-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-brand-400" />
            <h2 className="font-bold text-white">{t('advancedTools.title')}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-surface-400 hover:bg-surface-800 hover:text-white"><X size={18} /></button>
        </div>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="border-b border-surface-800 p-3 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {tools.map(key => {
                const Icon = toolIconMap[key];
                return (
                  <button key={key} onClick={() => setActiveTool(key)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeTool === key ? 'bg-brand-500 text-white' : 'bg-surface-900 text-surface-300 hover:bg-surface-800 hover:text-white'}`}>
                    <Icon size={16} />
                    <span className="truncate">{t(`advancedTools.${key}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 overflow-auto p-4">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">{t(`advancedTools.${activeTool}`)}</h3>
              <p className="text-sm text-surface-500">{t('advancedTools.filteredCount', { count: filteredWallets.length })}</p>
            </div>
            {renderTool()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stats({ rows }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-surface-700 bg-surface-900 p-4">
          <div className="text-xs text-surface-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}

function ActionPanel({ text, action, actionText, danger }) {
  return (
    <div className="space-y-4 rounded-xl border border-surface-700 bg-surface-900 p-4">
      <p className="text-sm leading-relaxed text-surface-300">{text}</p>
      <button onClick={action} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-brand-600 hover:bg-brand-500'}`}>
        {actionText}
      </button>
    </div>
  );
}

function InputAction({ value, onChange, placeholder, action, actionText }) {
  return (
    <div className="flex gap-2">
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-500" />
      <button onClick={action} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">{actionText}</button>
    </div>
  );
}
