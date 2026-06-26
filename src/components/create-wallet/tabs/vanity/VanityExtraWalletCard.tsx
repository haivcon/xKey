import { Check, Copy, Save, Trash2 } from 'lucide-react';
import type { TranslationFn } from '../../../../contexts/LanguageContext';
import type { GeneratedWallet } from '../../types';

type VanityExtraWalletCardProps = {
  t: TranslationFn;
  wallet: GeneratedWallet;
  index: number;
  selected: boolean;
  saved: boolean;
  copiedField: string | null;
  renderVanityExtraAddress: (address: string, wallet: GeneratedWallet, compact?: boolean) => React.ReactNode;
  getVanityExtraLabel: (wallet: GeneratedWallet) => string;
  getVanityScoreTone: (score: number) => string;
  handleCopy: (text: string, field: string) => void | Promise<void>;
  toggleVanitySelection: (address: string) => void;
  saveSingleVanityWallet: (wallet: GeneratedWallet) => void | Promise<void>;
  removeVanityExtraWallet: (address: string) => void;
};

export function VanityExtraWalletCard({
  t,
  wallet,
  index,
  selected,
  saved,
  copiedField,
  renderVanityExtraAddress,
  getVanityExtraLabel,
  getVanityScoreTone,
  handleCopy,
  toggleVanitySelection,
  saveSingleVanityWallet,
  removeVanityExtraWallet,
}: VanityExtraWalletCardProps) {
  const address = wallet.address || '';
  const score = wallet.vanityScore || 0;

  return (
    <div className={`rounded-xl border p-2 transition-all ${selected ? 'border-cyan-400/60 bg-cyan-100/80 shadow-sm shadow-cyan-900/5 dark:bg-cyan-500/15 dark:shadow-cyan-950/20' : 'border-surface-200 bg-surface-50/90 hover:border-cyan-300 hover:bg-cyan-50/70 dark:border-surface-700/80 dark:bg-surface-900/80 dark:hover:border-cyan-500/35 dark:hover:bg-surface-900'}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <button type="button" onClick={() => toggleVanitySelection(address)} className="flex min-w-0 items-start gap-2 overflow-hidden text-left" aria-pressed={selected}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${selected ? 'bg-cyan-500 text-white shadow shadow-cyan-500/25' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'}`}>{index + 1}</span>
          <span className="block min-w-0 overflow-hidden">
            <code className="block min-w-0 max-w-full overflow-hidden whitespace-nowrap font-mono text-[clamp(0.62rem,2.6vw,0.75rem)] font-bold leading-snug tracking-tight text-surface-950 dark:text-white">
              {renderVanityExtraAddress(address, wallet, true)}
            </code>
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
    </div>
  );
}