import { useState, useMemo } from 'react';
import { X, AlertTriangle, Trash2, Copy, Check } from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { useT } from '../contexts/LanguageContext';
import type { Wallet } from '../types';

type DuplicateWallet = Wallet & {
  _index: number;
};

type DuplicateDetectorProps = {
  wallets: Wallet[];
  onDeleteWallet: (wallet: Wallet) => void;
  onClose: () => void;
};

export default function DuplicateDetector({ wallets, onDeleteWallet, onClose }: DuplicateDetectorProps) {
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const showConfirm = useConfirm();
  const t = useT();

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, DuplicateWallet[]>();
    wallets.forEach((w, idx) => {
      if (!w.address) return;
      const key = w.address.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push({ ...w, _index: idx });
    });
    return [...map.entries()].filter(([, group]) => group.length > 1).sort((a, b) => b[1].length - a[1].length);
  }, [wallets]);

  const handleDelete = async (wallet: Wallet) => {
    const label = wallet.name || wallet.address?.substring(0, 10);
    const ok = await showConfirm(t('home.deleteWalletConfirm', { name: label }));
    if (ok) onDeleteWallet(wallet);
  };

  const handleCopy = (addr: string) => { navigator.clipboard.writeText(addr); setCopiedAddr(addr); setTimeout(() => setCopiedAddr(null), 2000); };

  return (
    <div className="app-scaled-icons fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-400" />{t('duplicates.title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-green-400" /></div>
              <p className="text-white font-medium mb-1">{t('duplicates.noDuplicates')}</p>
              <p className="text-surface-400 text-sm">{t('duplicates.allUnique')}</p>
            </div>
          ) : (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
                <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-300/80 leading-relaxed">{t('duplicates.foundGroups', { count: duplicateGroups.length })}</p>
              </div>
              {duplicateGroups.map(([addr, group]) => (
                <div key={addr} className="glass-card border border-surface-700 overflow-hidden">
                  <div className="px-4 py-3 bg-surface-800/50 border-b border-surface-700 flex items-center gap-2">
                    <code className="text-xs text-brand-300 font-mono truncate flex-1">{addr.substring(0, 8)}...{addr.substring(addr.length - 6)}</code>
                    <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full font-medium">×{group.length}</span>
                    <button onClick={() => handleCopy(addr)} className="p-1 text-surface-400 hover:text-white transition-colors">
                      {copiedAddr === addr ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="divide-y divide-surface-700/50">
                    {group.map((w, i) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{w.name || t('walletCard.unnamed')}</p>
                          <div className="flex items-center gap-2 text-xs text-surface-500">
                            <span>{w.groupId || 'Imported'}</span>
                            {w.createdAt && <><span>·</span><span>{new Date(w.createdAt).toLocaleDateString()}</span></>}
                            {w.privateKey && <><span>·</span><span className="text-emerald-400">{t('duplicates.hasPK')}</span></>}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(w)} className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0" title={t('common.delete')}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-4 border-t border-surface-800">
          <button onClick={onClose} className="w-full bg-surface-800 hover:bg-surface-700 text-white font-medium py-3 rounded-lg transition-colors">{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
}
