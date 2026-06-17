import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ClipboardPaste, Clock3, Coins, Copy, RotateCcw, Save, Search, Upload, Wallet, X } from 'lucide-react';
import { formatAmountInput, formatAssetValue, normalizeAmountInput, parseAmount } from '../utils/amountFormat';
import { hapticSuccess, hapticTap } from '../utils/haptics';
import { useConfirm } from '../contexts/ConfirmContext';
import { readClipboard, secureCopy } from '../utils/clipboard';
import { useToast } from '../contexts/ToastContext';

const DRAFT_KEY = 'xkey_asset_balance_draft';
const UNIT_PRESETS = ['$', 'USDT', 'VND', 'CNY', 'KRW', 'JPY', 'EUR', 'RUB', 'INR', 'GBP', 'AUD', 'CAD', 'POINT'];
const QUICK_DELTAS = [100, 1000, -100];

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

export default function AssetBalanceModal({ wallets, assetUnit, totalBalance, onClose, onSave, onUnitChange, t }) {
  const showConfirm = useConfirm();
  const { showToast } = useToast() || {};
  const [unit, setUnit] = useState(assetUnit || '$');
  const [balances, setBalances] = useState({});
  const [originalBalances, setOriginalBalances] = useState({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [copiedAddressKey, setCopiedAddressKey] = useState('');
  const [autoSaveState, setAutoSaveState] = useState('idle');
  const [savedAtByKey, setSavedAtByKey] = useState({});
  const fileInputRef = useRef(null);
  const balanceInputRefs = useRef(new Map());
  const draftReadyRef = useRef(false);
  const unitChangeConfirmedRef = useRef(false);
  const autoSaveTimerRef = useRef(null);
  const autoSaveSeqRef = useRef(0);
  const liveTotal = Object.values(balances).reduce((sum, value) => sum + parseAmount(value), 0);
  const visibleTotal = Object.keys(balances).length > 0 ? liveTotal : totalBalance;

  useEffect(() => {
    const next = {};
    wallets.forEach((wallet, index) => {
      next[wallet._id || `${wallet.address || 'wallet'}-${index}`] = normalizeAmountInput(wallet.balance || '');
    });
    const draft = (() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    let cancelled = false;
    const load = async () => {
      const useDraft = draft?.balances
        ? await showConfirm(t('assetBalance.restoreDraftConfirm'), {
            title: t('assetBalance.restoreDraftTitle'),
            confirmText: t('assetBalance.restoreDraftAction')
          })
        : false;
      if (cancelled) return;
      if (draft?.balances && !useDraft) {
        localStorage.removeItem(DRAFT_KEY);
      }
      setOriginalBalances(next);
      setUnit(useDraft ? (draft.unit || assetUnit || '$') : (assetUnit || '$'));
      setBalances(useDraft ? { ...next, ...draft.balances } : next);
      draftReadyRef.current = true;
    };
    load();
    return () => { cancelled = true; };
  }, [wallets, assetUnit, t, showConfirm]);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const dirty = unit !== (assetUnit || '$') || Object.keys(balances).some((key) => (
      normalizeAmountInput(balances[key] || '') !== normalizeAmountInput(originalBalances[key] || '')
    ));
    if (!dirty) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const draft = {
      unit,
      balances,
      savedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [unit, balances, originalBalances, assetUnit]);

  useEffect(() => () => clearTimeout(autoSaveTimerRef.current), []);

  const getWalletKey = useCallback((wallet, index) => wallet._id || `${wallet.address || 'wallet'}-${index}`, []);

  const changedKeys = useMemo(() => {
    const keys = new Set();
    Object.keys(balances).forEach((key) => {
      if (normalizeAmountInput(balances[key] || '') !== normalizeAmountInput(originalBalances[key] || '')) {
        keys.add(key);
      }
    });
    return keys;
  }, [balances, originalBalances]);

  const filteredWallets = useMemo(() => wallets
    .map((wallet, index) => ({ wallet, index, key: getWalletKey(wallet, index) }))
    .filter(({ wallet, key }) => {
      const needle = query.trim().toLowerCase();
      const matchesQuery = !needle
        || wallet.name?.toLowerCase().includes(needle)
        || wallet.address?.toLowerCase().includes(needle)
        || wallet.network?.toLowerCase().includes(needle);
      const value = parseAmount(balances[key]);
      const matchesFilter = filter === 'all'
        || (filter === 'positive' && value > 0)
        || (filter === 'zero' && value === 0)
        || (filter === 'changed' && changedKeys.has(key));
      return matchesQuery && matchesFilter;
    }), [wallets, query, filter, balances, changedKeys, getWalletKey]);

  const changedCount = changedKeys.size;
  const activeCount = Object.values(balances).filter(value => parseAmount(value) > 0).length;

  const setBalance = (key, value) => {
    setBalances(prev => ({ ...prev, [key]: normalizeAmountInput(value) }));
  };

  const extractSearchTarget = (value) => {
    const text = (value || '').trim();
    const evmAddress = text.match(/0x[a-fA-F0-9]{40}/);
    if (evmAddress) return evmAddress[0];
    const tronAddress = text.match(/\bT[1-9A-HJ-NP-Za-km-z]{33}\b/);
    if (tronAddress) return tronAddress[0];
    return text;
  };

  const pasteSearch = async () => {
    const text = await readClipboard();
    if (!text) {
      showToast?.(t('assetBalance.pasteEmpty'), 'warning');
      return;
    }
    setQuery(extractSearchTarget(text));
  };

  const buildSavePayload = useCallback((balanceMap = balances) => wallets.map((wallet, index) => ({
    wallet,
    balance: normalizeAmountInput(balanceMap[getWalletKey(wallet, index)] || ''),
  })), [balances, wallets, getWalletKey]);

  useEffect(() => {
    if (!draftReadyRef.current || Object.keys(balances).length === 0) return undefined;
    const dirty = unit !== (assetUnit || '$') || Object.keys(balances).some((key) => (
      normalizeAmountInput(balances[key] || '') !== normalizeAmountInput(originalBalances[key] || '')
    ));
    clearTimeout(autoSaveTimerRef.current);
    if (!dirty) {
      setAutoSaveState('idle');
      return undefined;
    }

    setAutoSaveState('pending');
    const seq = autoSaveSeqRef.current + 1;
    const dirtyKeys = Object.keys(balances).filter((key) => (
      normalizeAmountInput(balances[key] || '') !== normalizeAmountInput(originalBalances[key] || '')
    ));
    autoSaveSeqRef.current = seq;
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveState('saving');
        onUnitChange(unit.trim() || '$');
        await onSave(buildSavePayload(balances), { silent: true });
        if (autoSaveSeqRef.current !== seq) return;
        setOriginalBalances({ ...balances });
        const savedAt = Date.now();
        setSavedAtByKey(prev => {
          const next = { ...prev };
          dirtyKeys.forEach(key => { next[key] = savedAt; });
          return next;
        });
        localStorage.removeItem(DRAFT_KEY);
        setAutoSaveState('saved');
        setTimeout(() => {
          if (autoSaveSeqRef.current === seq) setAutoSaveState('idle');
        }, 1600);
      } catch {
        if (autoSaveSeqRef.current === seq) setAutoSaveState('error');
      }
    }, 900);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [unit, balances, originalBalances, assetUnit, wallets, onSave, onUnitChange, buildSavePayload]);

  const adjustBalance = (key, amount) => {
    const next = Math.max(0, parseAmount(balances[key]) + amount);
    setBalance(key, String(next));
  };

  const resetBalance = (key) => {
    setBalance(key, originalBalances[key] || '');
  };

  const handleUnitChange = async (nextUnit) => {
    const clean = nextUnit.slice(0, 12);
    if (
      clean !== unit
      && clean !== (assetUnit || '$')
      && Object.keys(balances).length > 0
      && !unitChangeConfirmedRef.current
    ) {
      const ok = await showConfirm(t('assetBalance.unitConfirm'), {
        title: t('assetBalance.unitConfirmTitle'),
        confirmText: t('common.confirm')
      });
      if (!ok) return;
      unitChangeConfirmedRef.current = true;
    }
    setUnit(clean);
  };

  const importCsv = async (file) => {
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const header = parseCsvLine(lines[0]).map(cell => cell.toLowerCase());
    const addressIndex = header.findIndex(cell => ['address', 'wallet', 'wallet address', 'dia chi', 'địa chỉ'].includes(cell));
    const balanceIndex = header.findIndex(cell => ['balance', 'amount', 'value', 'so du', 'số dư'].includes(cell));
    if (addressIndex < 0 || balanceIndex < 0) {
      await showConfirm(t('assetBalance.importCsvError'), {
        title: t('common.warning'),
        confirmText: t('common.close'),
        hideCancel: true
      });
      return;
    }

    let updated = 0;
    const next = { ...balances };
    const addressToKey = new Map(wallets.map((wallet, index) => [wallet.address?.toLowerCase(), getWalletKey(wallet, index)]).filter(([address]) => address));
    lines.slice(1).forEach((line) => {
      const cells = parseCsvLine(line);
      const address = cells[addressIndex]?.toLowerCase();
      const key = addressToKey.get(address);
      if (key) {
        next[key] = normalizeAmountInput(cells[balanceIndex] || '');
        updated += 1;
      }
    });

    setBalances(next);
    await showConfirm(t('assetBalance.importedCsv', { count: updated }), {
      title: t('assetBalance.importCsvTitle'),
      confirmText: t('common.close'),
      hideCancel: true
    });
  };

  const saveChanges = () => {
    clearTimeout(autoSaveTimerRef.current);
    hapticSuccess();
    onUnitChange(unit.trim() || '$');
    onSave(buildSavePayload(balances));
    localStorage.removeItem(DRAFT_KEY);
  };

  const copyAddress = async (wallet, key) => {
    if (!wallet.address) return;
    const copied = await secureCopy(wallet.address);
    if (!copied) {
      showToast?.(t('walletCard.copyFailed'), 'error');
      return;
    }
    hapticSuccess();
    setCopiedAddressKey(key);
    showToast?.(t('assetBalance.addressCopied', {
      name: wallet.name || t('walletCard.unnamed'),
      address: wallet.address,
    }), 'success');
    setTimeout(() => setCopiedAddressKey(''), 1600);
  };

  const formatSavedTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(timestamp));
    } catch {
      return '';
    }
  };

  const getBalanceWarning = (key) => {
    const next = parseAmount(balances[key]);
    const original = parseAmount(originalBalances[key]);
    if (next < 0) return t('assetBalance.balanceNegative');
    if (next >= 1000000000) return t('assetBalance.balanceVeryLarge');
    if (original > 0 && next >= original * 10) return t('assetBalance.balanceLargeIncrease');
    if (original >= 100 && next > 0 && next <= original / 10) return t('assetBalance.balanceLargeDecrease');
    return '';
  };

  const focusNextBalance = (visibleIndex) => {
    const next = filteredWallets[visibleIndex + 1];
    if (!next) return;
    balanceInputRefs.current.get(next.key)?.focus();
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Coins size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">{t('assetBalance.title')}</h3>
              <p className="text-xs text-surface-400">{formatAssetValue(visibleTotal, unit || '$')}</p>
              <p className={`mt-0.5 text-[10px] font-semibold ${
                autoSaveState === 'error' ? 'text-red-400' : autoSaveState === 'saved' ? 'text-emerald-400' : 'text-surface-500'
              }`}>
                {autoSaveState === 'pending' && t('assetBalance.autoSavePending')}
                {autoSaveState === 'saving' && t('assetBalance.autoSaving')}
                {autoSaveState === 'saved' && t('assetBalance.autoSaved')}
                {autoSaveState === 'error' && t('assetBalance.autoSaveError')}
              </p>
            </div>
          </div>
          <button onClick={() => { hapticTap(); onClose(); }} className="rounded-xl p-2 text-surface-400 hover:bg-surface-800 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto p-4">
          <div className="mb-4 rounded-2xl border border-surface-700 bg-surface-950/50 p-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-surface-500">
              {t('assetBalance.unitLabel')}
            </label>
            <input
              value={unit}
              onChange={(e) => handleUnitChange(e.target.value)}
              placeholder="$"
              className="w-full rounded-xl border border-surface-700 bg-surface-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-brand-500"
            />
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 px-0.5 pb-1 sm:justify-start">
              {UNIT_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleUnitChange(preset)}
                  className={`flex-shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    unit === preset
                      ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                      : 'border-surface-700 bg-surface-900 text-surface-400 hover:border-surface-500'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-surface-500">{t('assetBalance.unitHint')}</p>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-surface-700 bg-surface-950/70 px-3 py-2 text-surface-400 focus-within:border-brand-500">
              <Search size={16} className="flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('assetBalance.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-surface-600"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-800 hover:text-white"
                  title={t('assetBalance.clearSearch')}
                  aria-label={t('assetBalance.clearSearch')}
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={pasteSearch}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-800 hover:text-brand-300"
                title={t('assetBalance.pasteAddress')}
                aria-label={t('assetBalance.pasteAddress')}
              >
                <ClipboardPaste size={16} />
              </button>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-800 px-3 py-2 text-sm font-semibold text-surface-200 hover:border-brand-500/70"
            >
              <Upload size={16} />
              {t('assetBalance.importCsv')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                importCsv(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <p className="text-center text-[11px] leading-snug text-surface-500 sm:col-span-2 sm:text-left">
              {t('assetBalance.importCsvHint')}
            </p>
          </div>

          <div className="mb-3 flex justify-center gap-1.5 overflow-x-auto pb-1 sm:justify-start">
            {['all', 'positive', 'zero', 'changed'].map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === key ? 'bg-brand-500 text-white' : 'bg-surface-800 text-surface-400 hover:text-white'
                }`}
              >
                {t(`assetBalance.filter_${key}`)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredWallets.map(({ wallet, key }, visibleIndex) => {
              const value = balances[key] || '';
              const changed = changedKeys.has(key);
              const warning = getBalanceWarning(key);
              const savedTime = formatSavedTime(savedAtByKey[key]);
              return (
                <div key={key} className={`grid grid-cols-1 gap-3 rounded-2xl border p-3 text-center sm:grid-cols-[2.5rem_minmax(0,1fr)_9rem] sm:items-center sm:text-left ${changed ? 'border-brand-500/50 bg-brand-500/10' : 'border-surface-700 bg-surface-800/45'}`}>
                  <div className="mx-auto flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 sm:mx-0">
                    <Wallet size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center justify-center gap-2 sm:justify-start">
                      <p className="truncate text-sm font-semibold text-white">{wallet.name || t('walletCard.unnamed')}</p>
                      {changed && <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300">{t('assetBalance.changed')}</span>}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center justify-center gap-1.5 sm:justify-start">
                      <p className="max-w-full min-w-0 whitespace-nowrap font-mono text-[clamp(0.43rem,1.65vw,0.69rem)] leading-tight text-surface-500">
                        {wallet.address || t('walletCard.noAddress')}
                      </p>
                      {wallet.address && (
                        <button
                          type="button"
                          onClick={() => copyAddress(wallet, key)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-900/80 text-surface-400 transition-colors hover:text-brand-300"
                          aria-label={t('walletCard.copyAddress')}
                          title={t('walletCard.copyAddress')}
                        >
                          {copiedAddressKey === key ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-surface-500 sm:justify-start">
                      {changed && autoSaveState === 'saving' && (
                        <span className="inline-flex items-center gap-1 text-brand-300">
                          <Clock3 size={11} />
                          {t('assetBalance.walletSaving')}
                        </span>
                      )}
                      {!changed && savedTime && (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <Check size={11} />
                          {t('assetBalance.walletAutoSavedAt', { time: savedTime })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                      {QUICK_DELTAS.map(delta => (
                        <button key={delta} type="button" onClick={() => adjustBalance(key, delta)} className="rounded-lg bg-surface-900/80 px-2 py-1 text-[11px] font-semibold text-surface-300 hover:text-white">
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                      <button type="button" onClick={() => setBalance(key, '0')} className="rounded-lg bg-surface-900/80 px-2 py-1 text-[11px] font-semibold text-surface-300 hover:text-white">
                        {t('assetBalance.setZero')}
                      </button>
                      {changed && (
                        <button type="button" onClick={() => resetBalance(key)} className="flex items-center gap-1 rounded-lg bg-surface-900/80 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200">
                          <RotateCcw size={11} />
                          {t('assetBalance.undo')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center overflow-hidden rounded-xl border border-surface-700 bg-surface-950/80 focus-within:border-brand-500 sm:w-36">
                    <span className="flex-shrink-0 pl-3 text-xs font-semibold text-surface-400">{unit || '$'}</span>
                    <input
                      ref={(node) => {
                        if (node) balanceInputRefs.current.set(key, node);
                        else balanceInputRefs.current.delete(key);
                      }}
                      type="text"
                      inputMode="decimal"
                      value={formatAmountInput(value)}
                      onChange={(e) => setBalances(prev => ({ ...prev, [key]: normalizeAmountInput(e.target.value) }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextBalance(visibleIndex);
                        }
                      }}
                      className="min-w-0 flex-1 appearance-none rounded-r-xl bg-transparent px-2 py-2 text-right text-sm font-semibold text-white outline-none"
                      title={t('assetBalance.enterNextHint')}
                    />
                  </div>
                  {warning && (
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-300 sm:col-span-3">
                      <AlertTriangle size={13} />
                      <span>{warning}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-surface-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid w-full grid-cols-2 gap-2 text-center text-xs text-surface-400 sm:flex sm:w-auto sm:flex-wrap sm:text-left">
            <span>{t('assetBalance.filteredCount', { count: filteredWallets.length })}</span>
            <span>{t('assetBalance.activeCount', { count: activeCount })}</span>
            <span>{t('assetBalance.changedCount', { count: changedCount })}</span>
            <span className="font-semibold text-white">{t('assetBalance.newTotal')}: {formatAssetValue(visibleTotal, unit || '$')}</span>
          </div>
          <button
            onClick={saveChanges}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 sm:w-auto"
          >
            <Save size={16} />
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
