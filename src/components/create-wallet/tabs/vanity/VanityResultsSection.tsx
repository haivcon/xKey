import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Check, Copy, KeyRound, Maximize2, Minimize2, RefreshCw, Save, Trees } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import { VANITY_DEFAULT_FOLDER } from '../../constants';
import type { GeneratedWallet } from '../../types';
import VanityScoreBadge from '../../../vanity/VanityScoreBadge';

type VanityResultsSectionProps = {
  t: TranslationFn;
  walletName: string;
  allVanityWallets: GeneratedWallet[];
  generatedWallets: GeneratedWallet[];
  vanityExtraWallets: GeneratedWallet[];
  vanitySavedCount: number;
  selectedVanityAddresses: string[];
  vanitySavedRef: React.MutableRefObject<Set<string>>;
  vanityFoundRef: React.MutableRefObject<GeneratedWallet[]>;
  vanityExtraRef: React.MutableRefObject<GeneratedWallet[]>;
  expandedVanitySecrets: Record<string, boolean>;
  visibleVanitySecrets: Record<string, boolean>;
  setVisibleVanitySecrets: Dispatch<SetStateAction<Record<string, boolean>>>;
  copiedField: string | null;
  hasSelectedUnsavedVanityWallets: boolean;
  resetVanityResults: () => void;
  toggleVanitySelection: (address: string) => void;
  toggleVanitySecret: (address: string) => void;
  handleCopy: (text: string, field: string) => void | Promise<void>;
  saveSingleVanityWallet: (wallet: GeneratedWallet) => void | Promise<void>;
  saveVanityWallets: (wallets: GeneratedWallet[], onlySelected?: boolean) => boolean | Promise<boolean>;
  renderVanityAddress: (address: string, compact?: boolean) => React.ReactNode;
  renderVanityExtraAddress: (address: string, wallet: GeneratedWallet, compact?: boolean) => React.ReactNode;
  getVanityExtraLabel: (wallet: GeneratedWallet) => string;
};

export function VanityResultsSection({
  t,
  walletName,
  allVanityWallets,
  generatedWallets,
  vanityExtraWallets,
  vanitySavedCount,
  selectedVanityAddresses,
  vanitySavedRef,
  vanityFoundRef,
  vanityExtraRef,
  expandedVanitySecrets,
  visibleVanitySecrets,
  setVisibleVanitySecrets,
  copiedField,
  hasSelectedUnsavedVanityWallets,
  resetVanityResults,
  toggleVanitySelection,
  toggleVanitySecret,
  handleCopy,
  saveSingleVanityWallet,
  saveVanityWallets,
  renderVanityAddress,
  renderVanityExtraAddress,
  getVanityExtraLabel,
}: VanityResultsSectionProps) {
  return (
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
      <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto bg-surface-50/70 p-3 dark:bg-surface-900/30 theme-aurora:bg-white/5 theme-glass:bg-white/5">
        {allVanityWallets.map((wallet, index) => {
          const address = wallet.address || '';
          const selected = selectedVanityAddresses.includes(address);
          const isExtra = wallet.vanityMatchType === 'extra';
          const saved = !!address && vanitySavedRef.current.has(address);
          const isExpanded = expandedVanitySecrets[address] || false;

          return (
            <div key={address || `vanity-${index}`} className={`relative isolate flex min-h-[68px] flex-col gap-1.5 rounded-lg border p-2 transition-all will-change-transform ${selected ? 'border-brand-500/50 bg-brand-500/10 shadow-sm theme-aurora:bg-brand-400/12 theme-glass:bg-brand-400/12' : 'border-surface-200 bg-surface-50/90 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800/80 dark:hover:border-surface-600 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-aurora:hover:border-brand-300/35 theme-glass:border-white/15 theme-glass:bg-white/10 theme-glass:hover:border-brand-300/40'}`}>
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => toggleVanitySelection(address)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition-colors ${selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-300 bg-surface-50 text-transparent dark:border-surface-600 dark:bg-surface-900'}`}>
                  <Check size={12} className={selected ? 'opacity-100' : 'opacity-0'} />
                </button>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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

                  <code className="mt-1 block min-w-0 max-w-full overflow-hidden whitespace-nowrap font-mono text-[clamp(0.62rem,2.8vw,0.75rem)] font-bold leading-tight tracking-normal text-surface-950 dark:text-white">
                    {isExtra ? renderVanityExtraAddress(address, wallet, true) : renderVanityAddress(address, true)}
                  </code>

                  {isExtra && (
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-cyan-700/80 dark:text-cyan-200/80 font-medium">
                      <span>{getVanityExtraLabel(wallet)}</span>
                      <VanityScoreBadge wallet={wallet} compact />
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
        <div className="border-t border-surface-200 bg-surface-50/90 p-3 dark:border-surface-700 dark:bg-surface-800/80 theme-aurora:border-white/10 theme-aurora:bg-white/8 theme-glass:border-white/15 theme-glass:bg-white/10">
          <button
            type="button"
            disabled={selectedVanityAddresses.length === 0}
            onClick={() => saveVanityWallets([...vanityFoundRef.current, ...vanityExtraRef.current], true)}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-500 hover:shadow-brand-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-700 disabled:text-surface-400 disabled:shadow-none"
          >
            {t('createWallet.saveToVault')} ({selectedVanityAddresses.filter(addr => !vanitySavedRef.current.has(addr)).length})
          </button>
        </div>
      )}
    </div>
  );
}