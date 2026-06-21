import { useState } from 'react';
import { X, Network } from 'lucide-react';
import { NETWORK_KEYS, NETWORK_COLORS } from './WalletCard';
import { useT } from '../contexts/LanguageContext';

type BulkNetworkModalProps = {
  onClose: () => void;
  onSave: (network: string) => void;
  walletCount?: number;
  wallets?: unknown[];
};

export default function BulkNetworkModal({ onClose, onSave, walletCount, wallets }: BulkNetworkModalProps) {
  const [selectedNetwork, setSelectedNetwork] = useState('XLAYER');
  const t = useT();

  const handleSave = () => {
    onSave(selectedNetwork);
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Network size={18} className="text-brand-400" />
            {t('actionBar.bulkNetwork') || 'Bulk Change Network'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-surface-400">
            {t('actionBar.bulkNetworkDesc', { count: walletCount ?? wallets?.length ?? 0 }) || `Select a new network for the ${walletCount ?? wallets?.length ?? 0} currently filtered wallet(s).`}
          </p>

          <div>
            <label className="block text-xs font-medium text-surface-400 mb-2">{t('createWallet.network')}</label>
            <div className="grid grid-cols-3 gap-2">
              {NETWORK_KEYS.map(net => {
                const nc = NETWORK_COLORS[net];
                const active = selectedNetwork === net;
                return (
                  <button key={net} type="button"
                    onClick={() => setSelectedNetwork(net)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border
                      ${active ? `${nc.bg} ${nc.text} border-current scale-105 shadow-lg` : 'bg-surface-800 text-surface-400 border-surface-700 hover:border-surface-500'}`}
                  >
                    {nc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-surface-800 bg-surface-900/50">
          <button onClick={handleSave}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-lg transition-all active:scale-[0.98]">
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
