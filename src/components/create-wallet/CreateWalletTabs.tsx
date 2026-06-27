import { Keyboard, RefreshCw, Sparkles, Trees, Wallet } from 'lucide-react';
import type { TranslationFn } from '../../contexts/LanguageContext';
import type { CreateWalletTab } from './types';

type CreateWalletTabsProps = {
  tab: CreateWalletTab;
  setTab: (tab: CreateWalletTab) => void;
  t: TranslationFn;
};

export function CreateWalletTabs({ tab, setTab, t }: CreateWalletTabsProps) {
  return (
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
  );
}

export function GenerateModeTabs({ tab, setTab, t }: CreateWalletTabsProps) {
  if (!['generate', 'hdTree', 'advancedEntropy'].includes(tab)) return null;

  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-surface-700 bg-surface-900/60 p-1">
      <button type="button" onClick={() => setTab('generate')} className={`rounded-lg px-2 py-2 text-scale-xs font-bold transition-colors sm:text-xs ${tab === 'generate' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-300 hover:bg-surface-800'}`}>
        <RefreshCw size={14} className="mx-auto mb-0.5" /> {t('createWallet.tabGenerate')}
      </button>
      <button type="button" onClick={() => setTab('hdTree')} className={`rounded-lg px-2 py-2 text-scale-xs font-bold transition-colors sm:text-xs ${tab === 'hdTree' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-300 hover:bg-surface-800'}`}>
        <Trees size={14} className="mx-auto mb-0.5" /> {t('createWallet.tabHdTree')}
      </button>
      <button type="button" onClick={() => setTab('advancedEntropy')} className={`rounded-lg px-2 py-2 text-scale-xs font-bold transition-colors sm:text-xs ${tab === 'advancedEntropy' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-300 hover:bg-surface-800'}`}>
        <Sparkles size={14} className="mx-auto mb-0.5" /> {t('createWallet.tabAdvancedEntropy')}
      </button>
    </div>
  );
}