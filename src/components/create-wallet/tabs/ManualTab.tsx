import type { Dispatch, SetStateAction } from 'react';
import type { TranslationFn } from '../../../contexts/LanguageContext';
import { AlertTriangle, Camera, ChevronDown, Info } from 'lucide-react';
import PasswordInput from '../../shared/PasswordInput';
import SecureTextarea from '../../shared/SecureTextarea';
import { formatAmountInput, normalizeAmountInput } from '../../../utils/amountFormat';
import { NETWORKS } from '../constants';
import { getSecretPlacementWarning } from '../../../utils/secretDetection';

export type ManualTabProps = {
  t: TranslationFn;
  walletName: string;
  setWalletName: Dispatch<SetStateAction<string>>;
  manualAddress: string;
  setManualAddress: Dispatch<SetStateAction<string>>;
  checkDuplicate: (address: string) => void;
  duplicateWarning: boolean;
  setShowQRScanner: Dispatch<SetStateAction<boolean>>;
  showNetworkDropdown: boolean;
  setShowNetworkDropdown: Dispatch<SetStateAction<boolean>>;
  manualNetwork: string;
  setManualNetwork: Dispatch<SetStateAction<string>>;
  manualPK: string;
  setManualPK: Dispatch<SetStateAction<string>>;
  manualSeed: string;
  setManualSeed: Dispatch<SetStateAction<string>>;
  manualDerivationPath: string;
  setManualDerivationPath: Dispatch<SetStateAction<string>>;
  manualBalance: string;
  setManualBalance: Dispatch<SetStateAction<string>>;
  manualNotes: string;
  setManualNotes: Dispatch<SetStateAction<string>>;
};

export function ManualTab(props: ManualTabProps) {
  const {
    t,
    walletName,
    setWalletName,
    manualAddress,
    setManualAddress,
    checkDuplicate,
    duplicateWarning,
    setShowQRScanner,
    showNetworkDropdown,
    setShowNetworkDropdown,
    manualNetwork,
    setManualNetwork,
    manualPK,
    setManualPK,
    manualSeed,
    setManualSeed,
    manualDerivationPath,
    setManualDerivationPath,
    manualBalance,
    setManualBalance,
    manualNotes,
    setManualNotes,
  } = props;

  const nameSecretWarning = getSecretPlacementWarning(walletName, 'name');
  const notesSecretWarning = getSecretPlacementWarning(manualNotes, 'notes');

  const moveMisplacedSecret = (from: 'name' | 'notes') => {
    const value = from === 'name' ? walletName : manualNotes;
    if (getSecretPlacementWarning(value, from)?.includes('seed phrase')) {
      setManualSeed(value);
    } else {
      setManualPK(value);
    }
    if (from === 'name') setWalletName('');
    if (from === 'notes') setManualNotes('');
  };

  return (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.walletName')}</label>
                  <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)} placeholder={t('createWallet.walletNamePlaceholder')}
                    className={`w-full bg-surface-800 border rounded-lg px-4 py-3 text-sm text-white focus:outline-none placeholder:text-surface-600 ${nameSecretWarning ? 'border-red-500/60 focus:border-red-500' : 'border-surface-700 focus:border-brand-500'}`} />
                  {nameSecretWarning && (
                    <button type="button" onClick={() => moveMisplacedSecret('name')} className="mt-1.5 flex items-start gap-1 text-left text-xs text-red-300">
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{nameSecretWarning} Tap to move.</span>
                    </button>
                  )}
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
                <p className="text-scale-xs text-surface-500 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.addressExplain')}</p>
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.network')}</label>
                <div
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 flex justify-between items-center cursor-pointer hover:bg-surface-700/50 transition-colors"
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                >
                  <span>{manualNetwork}</span>
                  <ChevronDown size={16} className={`text-surface-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showNetworkDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNetworkDropdown(false)}></div>
                    <div className="absolute z-20 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                      {NETWORKS.map(n => (
                        <div
                          key={n}
                          className={`px-4 py-3 text-sm cursor-pointer transition-colors ${manualNetwork === n ? 'bg-brand-500/10 text-brand-400' : 'text-white hover:bg-surface-700'}`}
                          onClick={() => { setManualNetwork(n); setShowNetworkDropdown(false); }}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.privateKey')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <PasswordInput value={manualPK} onChange={(e) => setManualPK(e.target.value)} placeholder={t('createWallet.privateKey') + '...'}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <p className="text-scale-xs text-red-400/70 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.pkExplain')}</p>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.seedPhrase')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <SecureTextarea value={manualSeed} onChange={(e) => setManualSeed(e.target.value)} placeholder="word1 word2 word3 ..." rows={2}
                  secureLabel={t('createWallet.seedPhrase')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
                <p className="text-scale-xs text-surface-500 mt-1 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.seedExplain')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.derivationPath')}</label>
                <input type="text" value={manualDerivationPath} onChange={(e) => setManualDerivationPath(e.target.value)} placeholder="m/44'/60'/0'/0/0"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <p className="text-scale-xs text-surface-500 mt-1 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.derivationPathHelp')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.balance')} <span className="text-surface-600">({t('createWallet.optional')})</span></label>
                <input type="text" inputMode="decimal" value={formatAmountInput(manualBalance)} onChange={(e) => setManualBalance(normalizeAmountInput(e.target.value))} placeholder="0.00"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.notes')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder={t('createWallet.notesPlaceholder')} rows={2}
                  className={`w-full bg-surface-800 border rounded-lg px-4 py-3 text-sm text-white focus:outline-none placeholder:text-surface-600 resize-none ${notesSecretWarning ? 'border-red-500/60 focus:border-red-500' : 'border-surface-700 focus:border-brand-500'}`} />
                {notesSecretWarning && (
                  <button type="button" onClick={() => moveMisplacedSecret('notes')} className="mt-1.5 flex items-start gap-1 text-left text-xs text-red-300">
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{notesSecretWarning} Tap to move.</span>
                  </button>
                )}
              </div>
            </div>
  );
}
