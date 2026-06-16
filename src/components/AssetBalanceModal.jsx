import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, RotateCcw, Save, Search, Upload, Wallet, X } from 'lucide-react';
import { formatAmountInput, formatAssetValue, normalizeAmountInput, parseAmount } from '../utils/amountFormat';
import { hapticSuccess, hapticTap } from '../utils/haptics';

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
  const [unit, setUnit] = useState(assetUnit || '$');
  const [balances, setBalances] = useState({});
  const [originalBalances, setOriginalBalances] = useState({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const fileInputRef = useRef(null);
  const draftReadyRef = useRef(false);
  const unitChangeConfirmedRef = useRef(false);
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
    const useDraft = draft?.balances && window.confirm(t('assetBalance.restoreDraftConfirm'));
    if (draft?.balances && !useDraft) {
      localStorage.removeItem(DRAFT_KEY);
    }
    setOriginalBalances(next);
    setUnit(useDraft ? (draft.unit || assetUnit || '$') : (assetUnit || '$'));
    setBalances(useDraft ? { ...next, ...draft.balances } : next);
    draftReadyRef.current = true;
  }, [wallets, assetUnit, t]);

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

  const getWalletKey = (wallet, index) => wallet._id || `${wallet.address || 'wallet'}-${index}`;

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
    }), [wallets, query, filter, balances, changedKeys]);

  const changedCount = changedKeys.size;
  const activeCount = Object.values(balances).filter(value => parseAmount(value) > 0).length;

  const setBalance = (key, value) => {
    setBalances(prev => ({ ...prev, [key]: normalizeAmountInput(value) }));
  };

  const adjustBalance = (key, amount) => {
    const next = Math.max(0, parseAmount(balances[key]) + amount);
    setBalance(key, String(next));
  };

  const resetBalance = (key) => {
    setBalance(key, originalBalances[key] || '');
  };

  const handleUnitChange = (nextUnit) => {
    const clean = nextUnit.slice(0, 12);
    if (
      clean !== unit
      && clean !== (assetUnit || '$')
      && Object.keys(balances).length > 0
      && !unitChangeConfirmedRef.current
    ) {
      if (!window.confirm(t('assetBalance.unitConfirm'))) return;
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
      alert(t('assetBalance.importCsvError'));
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
    alert(t('assetBalance.importedCsv', { count: updated }));
  };

  const saveChanges = () => {
    hapticSuccess();
    onUnitChange(unit.trim() || '$');
    onSave(wallets.map((wallet, index) => ({
      wallet,
      balance: normalizeAmountInput(balances[getWalletKey(wallet, index)] || ''),
    })));
    localStorage.removeItem(DRAFT_KEY);
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
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('assetBalance.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-surface-600"
              />
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
            {filteredWallets.map(({ wallet, key }) => {
              const value = balances[key] || '';
              const changed = changedKeys.has(key);
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
                    <p className="max-w-full whitespace-nowrap font-mono text-[clamp(0.43rem,1.65vw,0.69rem)] leading-tight text-surface-500">
                      {wallet.address || t('walletCard.noAddress')}
                    </p>
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
                      type="text"
                      inputMode="decimal"
                      value={formatAmountInput(value)}
                      onChange={(e) => setBalances(prev => ({ ...prev, [key]: normalizeAmountInput(e.target.value) }))}
                      className="min-w-0 flex-1 appearance-none rounded-r-xl bg-transparent px-2 py-2 text-right text-sm font-semibold text-white outline-none"
                    />
                  </div>
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
