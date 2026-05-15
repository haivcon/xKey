import { useState } from 'react';
import { X, Plus, Copy, Check, QrCode, Wallet, RefreshCw, Keyboard, AlertTriangle, Info, Camera } from 'lucide-react';
import { ethers } from 'ethers';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import QRScannerModal from './QRScannerModal';

const NETWORKS = ['ETH', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Solana', 'Tron', 'Base'];

export default function CreateWalletModal({ onClose, onSave, onShowQR, existingWallets = [] }) {
  const [tab, setTab] = useState('manual');
  const [wallet, setWallet] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [walletName, setWalletName] = useState('');
  const { showToast } = useToast();
  const t = useT();

  const [manualAddress, setManualAddress] = useState('');
  const [manualPK, setManualPK] = useState('');
  const [manualSeed, setManualSeed] = useState('');
  const [manualBalance, setManualBalance] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualNetwork, setManualNetwork] = useState('ETH');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const generateWallet = () => {
    const w = ethers.Wallet.createRandom();
    setWallet({ address: w.address, privateKey: w.privateKey, mnemonic: w.mnemonic?.phrase || '' });
    setWalletName(`Wallet ${Date.now().toString(36).slice(-4).toUpperCase()}`);
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const checkDuplicate = (address) => {
    if (!address) { setDuplicateWarning(false); return; }
    setDuplicateWarning(existingWallets.some(w => w.address?.toLowerCase() === address.toLowerCase()));
  };

  const handleSaveGenerated = () => {
    if (!wallet) return;
    onSave({ name: walletName || 'New Wallet', address: wallet.address, privateKey: wallet.privateKey, seedPhrase: wallet.mnemonic, balance: '0.00', network: 'ETH', createdAt: Date.now() });
    showToast(t('createWallet.walletCreated'), 'success');
    onClose();
  };

  const handleSaveManual = () => {
    if (!manualAddress && !manualPK && !manualSeed) {
      showToast(t('createWallet.fillRequired'), 'warning');
      return;
    }
    onSave({ name: walletName || 'Manual Wallet', address: manualAddress.trim(), privateKey: manualPK.trim(), seedPhrase: manualSeed.trim(), balance: manualBalance.trim() || '0.00', notes: manualNotes.trim(), network: manualNetwork, createdAt: Date.now() });
    showToast(duplicateWarning ? t('createWallet.walletAddedDuplicate') : t('createWallet.walletAdded'), 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-brand-400" />
            {t('createWallet.title')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-800">
          <button onClick={() => setTab('manual')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'manual' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-surface-400 hover:text-white'}`}>
            <Keyboard size={16} /> {t('createWallet.tabManual')}
          </button>
          <button onClick={() => setTab('generate')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'generate' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-surface-400 hover:text-white'}`}>
            <RefreshCw size={16} /> {t('createWallet.tabGenerate')}
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* ── Manual Entry Tab ── */}
          {tab === 'manual' && (
            <>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.walletName')}</label>
                <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)} placeholder={t('createWallet.walletNamePlaceholder')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.address')} <span className="text-surface-600">{t('createWallet.addressRequired')}</span></label>
                <div className="flex gap-2">
                  <input type="text" value={manualAddress} onChange={(e) => { setManualAddress(e.target.value); checkDuplicate(e.target.value); }} placeholder="0x..."
                    className={`flex-1 bg-surface-800 border rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none placeholder:text-surface-600 ${duplicateWarning ? 'border-yellow-500/50 focus:border-yellow-500' : 'border-surface-700 focus:border-brand-500'}`} />
                  <button onClick={() => setShowQRScanner(true)} className="btn-glow flex-shrink-0 bg-surface-800 border border-surface-700 hover:bg-surface-700 text-brand-400 px-3 rounded-lg transition-colors" title={t('createWallet.scanQR')}>
                    <Camera size={18} />
                  </button>
                </div>
                {duplicateWarning && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-yellow-400 text-xs"><AlertTriangle size={12} /><span>{t('createWallet.duplicateWarning')}</span></div>
                )}
                <p className="text-[11px] text-surface-500 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.addressExplain')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.network')}</label>
                <select value={manualNetwork} onChange={(e) => setManualNetwork(e.target.value)}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500">
                  {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.privateKey')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <input type="password" value={manualPK} onChange={(e) => setManualPK(e.target.value)} placeholder={t('createWallet.privateKey') + '...'}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <p className="text-[11px] text-red-400/70 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.pkExplain')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.seedPhrase')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <textarea value={manualSeed} onChange={(e) => setManualSeed(e.target.value)} placeholder="word1 word2 word3 ..." rows={2}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
                <p className="text-[11px] text-yellow-400/70 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.seedExplain')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.balance')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <input type="text" value={manualBalance} onChange={(e) => setManualBalance(e.target.value)} placeholder="0.00"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.notes')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder={t('createWallet.notesPlaceholder')} rows={2}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
              </div>
            </>
          )}

          {/* ── Generate Tab ── */}
          {tab === 'generate' && (
            <>
              {!wallet ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={32} className="text-brand-400" />
                  </div>
                  <p className="text-surface-400 text-sm mb-3">{t('createWallet.generateInfo')}</p>
                  {/* Educational tooltip */}
                  <div className="bg-brand-500/5 border border-brand-500/15 rounded-lg p-3 mb-6 text-left">
                    <p className="text-[11px] text-surface-300 leading-relaxed flex items-start gap-1.5">
                      <Info size={12} className="text-brand-400 mt-0.5 flex-shrink-0" />
                      {t('createWallet.generateExplain')}
                    </p>
                  </div>
                  <button onClick={generateWallet} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-lg transition-all active:scale-[0.98] flex items-center gap-2 mx-auto">
                    <Plus size={18} /> {t('createWallet.generateButton')}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.walletName')}</label>
                    <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.address')}</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-surface-800 text-brand-300 p-3 rounded-lg text-sm break-all">{wallet.address}</code>
                      <button onClick={() => onShowQR(wallet.address, t('walletCard.address'), walletName)} className="p-2 bg-surface-800 hover:bg-brand-500/20 text-brand-400 rounded-lg"><QrCode size={16} /></button>
                      <button onClick={() => handleCopy(wallet.address, 'addr')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg">
                        {copiedField === 'addr' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.privateKey')}</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-surface-800 text-red-300 p-3 rounded-lg text-xs break-all font-mono">{wallet.privateKey}</code>
                      <button onClick={() => handleCopy(wallet.privateKey, 'pk')} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg">
                        {copiedField === 'pk' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {wallet.mnemonic && (
                    <div>
                      <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.mnemonic12')}</label>
                      <div className="bg-surface-800 p-3 rounded-lg">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {wallet.mnemonic.split(' ').map((word, i) => (
                            <span key={i} className="text-xs text-surface-200 bg-surface-700 px-2 py-1 rounded text-center">
                              <span className="text-surface-500 mr-1">{i + 1}.</span>{word}
                            </span>
                          ))}
                        </div>
                        <button onClick={() => handleCopy(wallet.mnemonic, 'mn')} className="text-xs text-surface-400 hover:text-brand-400 flex items-center gap-1">
                          {copiedField === 'mn' ? <><Check size={12} className="text-green-400" /> {t('common.copied')}</> : <><Copy size={12} /> {t('createWallet.copyMnemonic')}</>}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                    ⚠️ <strong>{t('createWallet.backupWarning')}</strong>
                  </div>

                  {/* Educational tooltip */}
                  <div className="bg-brand-500/5 border border-brand-500/15 rounded-lg p-3">
                    <p className="text-[11px] text-surface-300 leading-relaxed flex items-start gap-1.5">
                      <Info size={12} className="text-brand-400 mt-0.5 flex-shrink-0" />
                      {t('createWallet.generateExplain')}
                    </p>
                  </div>

                  <button onClick={generateWallet} className="text-xs text-surface-500 hover:text-brand-400 flex items-center gap-1 mx-auto">
                    <RefreshCw size={12} /> {t('createWallet.generateAnother')}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {(tab === 'manual' || (tab === 'generate' && wallet)) && (
          <div className="p-4 border-t border-surface-800">
            <button onClick={tab === 'manual' ? handleSaveManual : handleSaveGenerated}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-lg transition-all active:scale-[0.98]">
              {t('createWallet.saveToVault')}
            </button>
          </div>
        )}
      </div>
      {showQRScanner && (
        <QRScannerModal
          onResult={({ text, type }) => {
            if (type === 'address') { setManualAddress(text); checkDuplicate(text); }
            else if (type === 'privateKey') setManualPK(text);
            else if (type === 'seedPhrase') setManualSeed(text);
            else setManualAddress(text);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}
