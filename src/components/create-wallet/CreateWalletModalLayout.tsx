import { Plus, X } from 'lucide-react';
import type { TranslationFn } from '../../contexts/LanguageContext';
import type { CreateWalletTab } from './types';

type CreateWalletHeaderProps = {
  t: TranslationFn;
  onClose: () => void;
};

export function CreateWalletHeader({ t, onClose }: CreateWalletHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-surface-800">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Plus size={18} className="text-brand-400" />
        {t('createWallet.title')}
      </h2>
      <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400">
        <X size={20} />
      </button>
    </div>
  );
}

type CreateWalletSaveFooterProps = {
  tab: CreateWalletTab;
  randomGeneratedWalletCount: number;
  hasBulkResult: boolean;
  onSaveManual: () => void;
  onSaveGenerated: () => void;
  t: TranslationFn;
};

export function CreateWalletSaveFooter({
  tab,
  randomGeneratedWalletCount,
  hasBulkResult,
  onSaveManual,
  onSaveGenerated,
  t,
}: CreateWalletSaveFooterProps) {
  const shouldShow = tab === 'manual' || (tab === 'generate' && randomGeneratedWalletCount > 0 && !hasBulkResult);
  if (!shouldShow) return null;

  return (
    <div className="p-4 border-t border-surface-800 bg-surface-900 sticky bottom-0 rounded-b-2xl">
      <button
        onClick={tab === 'manual' ? onSaveManual : onSaveGenerated}
        className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-lg transition-all active:scale-[0.98]"
      >
        {t('createWallet.saveToVault')}
      </button>
    </div>
  );
}