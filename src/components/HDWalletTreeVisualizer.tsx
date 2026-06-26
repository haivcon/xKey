import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, GitBranch, KeyRound, Leaf, Plus, RefreshCw, Save, ShieldAlert, Trees, Wallet } from 'lucide-react';
import { ethers } from 'ethers';
import SecureTextarea from './shared/SecureTextarea';
import { useT } from '../contexts/LanguageContext';
import { hapticSuccess, hapticWarning } from '../utils/haptics';
import type { Wallet as WalletModel } from '../types';

const HD_NETWORKS = [
  { value: 'XLAYER', label: 'XLAYER', coinType: 60 },
  { value: 'ETH', label: 'Ethereum', coinType: 60 },
  { value: 'BSC', label: 'BNB Chain', coinType: 60 },
  { value: 'Polygon', label: 'Polygon', coinType: 60 },
  { value: 'Arbitrum', label: 'Arbitrum', coinType: 60 },
  { value: 'Optimism', label: 'Optimism', coinType: 60 },
  { value: 'Base', label: 'Base', coinType: 60 },
];

type HdNetwork = {
  value: string;
  label: string;
  coinType: number;
};

type HdWallet = WalletModel & {
  path: string;
  derivationPath: string;
  hdAccount: number;
  hdIndex: number;
  hdCoinType: number;
  hdNetwork: string;
  hdRootType: string;
};

type HDWalletTreeVisualizerProps = {
  onSaveWallet: (wallet: HdWallet) => Promise<unknown> | unknown;
  existingWallets?: WalletModel[];
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const shortAddress = (address?: string): string => address ? `${address.slice(0, 10)}...${address.slice(-6)}` : '';

export default function HDWalletTreeVisualizer({ onSaveWallet, existingWallets = [] }: HDWalletTreeVisualizerProps) {
  const t = useT();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [wordCountType, setWordCountType] = useState<12 | 24>(24);
  const [network, setNetwork] = useState('XLAYER');
  const [account, setAccount] = useState(0);
  const [leafCount, setLeafCount] = useState(5);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [derivedWallets, setDerivedWallets] = useState<HdWallet[]>([]);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [networkOpen, setNetworkOpen] = useState(false);

  const selectedNetwork: HdNetwork = HD_NETWORKS.find(item => item.value === network) || HD_NETWORKS[0];
  const normalizedWords = useMemo(() => seedPhrase.trim().split(/\s+/).filter(Boolean), [seedPhrase]);
  const canDerive = normalizedWords.length === 12 || normalizedWords.length === 24;
  const activeWallet = derivedWallets[selectedIndex] || null;
  const activePath = `m/44'/${selectedNetwork.coinType}'/${account}'/0/${selectedIndex}`;
  const activeDuplicate = useMemo(() => {
    if (!activeWallet?.address) return false;
    const activeAddress = activeWallet.address.toLowerCase();
    const activeNetwork = String(activeWallet.network || '').toLowerCase();
    return existingWallets.some(wallet => (
      wallet.address?.toLowerCase() === activeAddress
      && String(wallet.network || '').toLowerCase() === activeNetwork
    ));
  }, [activeWallet, existingWallets]);

  const deriveWallets = useCallback(() => {
    if (!seedPhrase.trim()) {
      setDerivedWallets([]);
      setError('');
      return;
    }
    if (!canDerive) {
      setDerivedWallets([]);
      setError(t('createWallet.hdTreeSeedError').replace(/24/g, '12/24'));
      return;
    }
    try {
      const phrase = normalizedWords.join(' ');
      const nextWallets: HdWallet[] = Array.from({ length: leafCount }, (_, index) => {
        const path = `m/44'/${selectedNetwork.coinType}'/${account}'/0/${index}`;
        const wallet = ethers.HDNodeWallet.fromPhrase(phrase, undefined, path);
        return {
          name: `${t('createWallet.hdTreeLeaf')} ${index}`,
          address: wallet.address,
          privateKey: wallet.privateKey,
          network,
          path,
          derivationPath: path,
          hdAccount: account,
          hdIndex: index,
          hdCoinType: selectedNetwork.coinType,
          hdNetwork: network,
          hdRootType: normalizedWords.length === 12 ? 'bip39-12-word' : 'bip39-24-word',
          balance: '0.00',
        };
      });
      setDerivedWallets(nextWallets);
      setSelectedIndex(prev => clamp(prev, 0, nextWallets.length - 1));
      setError('');
    } catch {
      setDerivedWallets([]);
      setError(t('createWallet.hdTreeInvalidSeed'));
    }
  }, [account, canDerive, leafCount, network, normalizedWords, seedPhrase, selectedNetwork.coinType, t]);

  useEffect(() => {
    deriveWallets();
  }, [deriveWallets]);

  const generateSeed = () => {
    const entropyBytes = wordCountType === 12 ? 16 : 32;
    const mnemonic = ethers.Mnemonic.fromEntropy(ethers.randomBytes(entropyBytes));
    setSeedPhrase(mnemonic.phrase);
    setSelectedIndex(0);
    hapticSuccess();
  };

  const growLeaf = () => {
    const nextLeafCount = Math.min(24, leafCount + 1);
    setLeafCount(nextLeafCount);
    setSelectedIndex(nextLeafCount - 1);
    if (nextLeafCount === leafCount) {
      hapticWarning();
      return;
    }
    hapticSuccess();
  };

  const copyText = async (text: string | undefined, field: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  };

  const saveActive = async () => {
    if (!activeWallet || activeDuplicate) {
      hapticWarning();
      return;
    }
    await onSaveWallet(activeWallet);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
            <Trees size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white">{t('createWallet.hdTreeTitle')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-surface-300">{t('createWallet.hdTreeDesc')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-amber-300" />
          <div className="space-y-1 text-xs leading-relaxed text-amber-100">
            <p>{t('createWallet.hdTreeWarning').replace(/24/g, '12/24')}</p>
            <p>{t('createWallet.hdTreeSeedNotSaved')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-surface-400">{t('createWallet.seedPhrase')}</label>
              <div className="flex items-center gap-1 rounded-lg border border-surface-750 bg-surface-900/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setWordCountType(12)}
                  className={`px-2 py-0.5 text-[0.6875rem] font-bold rounded transition-colors ${
                    wordCountType === 12
                      ? 'bg-brand-600 text-white'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  12w
                </button>
                <button
                  type="button"
                  onClick={() => setWordCountType(24)}
                  className={`px-2 py-0.5 text-[0.6875rem] font-bold rounded transition-colors ${
                    wordCountType === 24
                      ? 'bg-brand-600 text-white'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  24w
                </button>
              </div>
            </div>
            <SecureTextarea
              value={seedPhrase}
              onChange={(event) => setSeedPhrase(event.target.value)}
              rows={5}
              secureLabel={t('createWallet.seedPhrase')}
              placeholder={t('createWallet.hdTreeSeedPlaceholder').replace(/24/g, '12/24')}
              className="w-full resize-none rounded-xl border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-white placeholder:text-surface-600 focus:border-brand-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className={`text-[0.6875rem] ${canDerive ? 'text-emerald-300' : 'text-surface-500'}`}>
                {t('createWallet.hdTreeWordCount', { count: normalizedWords.length }).replace('/24', '/' + (normalizedWords.length <= 12 ? 12 : 24))}
              </p>
              <button type="button" onClick={generateSeed} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200">
                <RefreshCw size={13} /> {t('createWallet.hdTreeGenerateSeed').replace(/24/g, String(wordCountType))}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <label className="mb-1 block text-xs font-semibold text-surface-400">{t('createWallet.network')}</label>
              <button
                type="button"
                onClick={() => setNetworkOpen(prev => !prev)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  networkOpen
                    ? 'border-brand-500 bg-brand-500/10 text-white shadow-[0_0_0_3px_rgba(14,165,233,0.12)]'
                    : 'border-surface-700 bg-surface-800 text-white hover:border-surface-500'
                }`}
              >
                <span className="min-w-0 truncate">{selectedNetwork.label}</span>
                <ChevronDown size={16} className={`shrink-0 text-surface-400 transition-transform ${networkOpen ? 'rotate-180 text-brand-300' : ''}`} />
              </button>
              {networkOpen && (
                <>
                  <button
                    type="button"
                    aria-label={t('common.close')}
                    className="fixed inset-0 z-[125]"
                    onClick={() => setNetworkOpen(false)}
                  />
                  <div className="absolute left-0 right-0 z-[130] mt-2 max-h-72 overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-2 shadow-2xl shadow-black/40">
                    {HD_NETWORKS.map(item => {
                      const active = item.value === network;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setNetwork(item.value);
                            setSelectedIndex(0);
                            setNetworkOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                            active
                              ? 'bg-brand-500/15 text-white ring-1 ring-brand-500/40'
                              : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                          }`}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            active ? 'border-brand-300 bg-brand-500 text-white' : 'border-surface-600 bg-surface-950'
                          }`}>
                            {active && <Check size={14} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{item.label}</span>
                            <span className="mt-0.5 block truncate text-[0.6875rem] text-surface-500">
                              {t('createWallet.hdTreeEvmPath', { coinType: item.coinType })}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <p className="col-span-3 text-[0.6875rem] leading-relaxed text-surface-500">
              {t('createWallet.hdTreeEvmSharedAddress')}
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-surface-400">{t('createWallet.hdTreeAccount')}</label>
              <input type="number" min="0" max="99" value={account} onChange={(event) => { setAccount(clamp(Number(event.target.value) || 0, 0, 99)); setSelectedIndex(0); }} className="w-full rounded-xl border border-surface-700 bg-surface-800 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-surface-400">{t('createWallet.hdTreeLeaves')}</label>
              <input type="number" min="1" max="24" value={leafCount} onChange={(event) => setLeafCount(clamp(Number(event.target.value) || 1, 1, 24))} className="w-full rounded-xl border border-surface-700 bg-surface-800 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-brand-500" />
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">{error}</div>}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-surface-700 bg-surface-950/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-surface-400"><GitBranch size={14} />{t('createWallet.derivationPath')}</span>
              <button type="button" onClick={() => copyText(activePath, 'path')} className="flex items-center gap-1 text-xs font-semibold text-brand-300">
                {copiedField === 'path' ? <Check size={13} /> : <Copy size={13} />}
                {copiedField === 'path' ? t('common.copied') : t('common.copy')}
              </button>
            </div>
            <code className="block break-all rounded-xl bg-surface-900 px-3 py-2.5 font-mono text-xs text-brand-200">{activePath}</code>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-surface-700 bg-surface-900/70 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-surface-400"><Leaf size={13} />{t('createWallet.hdTreeSelectedLeaf')}</p>
                <p className="mt-1 text-sm font-bold text-white">#{selectedIndex}</p>
              </div>
              <div className="rounded-xl border border-surface-700 bg-surface-900/70 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-surface-400"><KeyRound size={13} />{t('createWallet.hdTreeSharedRoot')}</p>
                <p className="mt-1 text-sm font-bold text-amber-200">{t('createWallet.hdTreeSameSeed')}</p>
              </div>
            </div>

            {activeWallet && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-xs font-semibold text-emerald-200">{t('createWallet.address')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-lg bg-surface-950/70 px-3 py-2 font-mono text-xs text-white">{activeWallet.address}</code>
                  <button type="button" onClick={() => copyText(activeWallet.address, 'address')} className="rounded-lg border border-surface-700 bg-surface-900 p-2 text-surface-200">
                    {copiedField === 'address' ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            )}

            {activeDuplicate && (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                {t('createWallet.hdTreeDuplicateWallet')}
              </div>
            )}

            <button type="button" disabled={!activeWallet || activeDuplicate} onClick={saveActive} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-500 disabled:bg-surface-700 disabled:text-surface-400">
              <Save size={16} /> {t('createWallet.hdTreeSaveLeaf')}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-700 bg-surface-950/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="flex items-center gap-2 text-sm font-bold text-white">
            <Wallet size={16} className="text-brand-300" />
            {t('createWallet.hdTreeLeavesTitle')}
          </h4>
          <button type="button" onClick={growLeaf} className="flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-200">
            <Plus size={13} /> {t('createWallet.hdTreeGrowLeaf')}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: leafCount }, (_, index) => {
            const wallet = derivedWallets[index];
            const active = selectedIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-brand-400 bg-brand-500/10' : 'border-surface-700 bg-surface-800/60 hover:border-surface-500'}`}
              >
                <span className="flex items-center gap-2 text-xs font-bold text-white"><Leaf size={13} />{t('createWallet.hdTreeLeaf')} {index}</span>
                <span className="mt-1 block font-mono text-[0.6875rem] text-surface-400">
                  {wallet ? shortAddress(wallet.address) : `m/44'/${selectedNetwork.coinType}'/${account}'/0/${index}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
