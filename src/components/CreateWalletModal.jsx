import { useState, useRef, useEffect } from 'react';
import { X, Plus, Copy, Check, Wallet, RefreshCw, Keyboard, AlertTriangle, Info, Camera, ChevronDown } from 'lucide-react';
import { ethers } from 'ethers';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../contexts/LanguageContext';
import QRScannerModal from './QRScannerModal';
import PasswordInput from './PasswordInput';

const NETWORKS = ['XLAYER', 'ETH', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Solana', 'Tron', 'Base'];

const MATH_THEMES = [
  { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', label: 'text-blue-300', contentBorder: 'border-blue-500/20' },
  { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', label: 'text-purple-300', contentBorder: 'border-purple-500/20' },
  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', label: 'text-emerald-300', contentBorder: 'border-emerald-500/20' },
  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', label: 'text-amber-300', contentBorder: 'border-amber-500/20' },
  { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400', label: 'text-orange-300', contentBorder: 'border-orange-500/20' },
  { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400', label: 'text-pink-300', contentBorder: 'border-pink-500/20' },
  { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', label: 'text-rose-300', contentBorder: 'border-rose-500/20' }
];

export default function CreateWalletModal({ onClose, onSave, existingWallets = [] }) {
  const [tab, setTab] = useState('manual');
  const [generateCount, setGenerateCount] = useState(1);
  const [generatedWallets, setGeneratedWallets] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [floatingEffects, setFloatingEffects] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [walletName, setWalletName] = useState('');
  const { showToast } = useToast();
  const t = useT();

  const [manualAddress, setManualAddress] = useState('');
  const [manualPK, setManualPK] = useState('');
  const [manualSeed, setManualSeed] = useState('');
  const [manualBalance, setManualBalance] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualNetwork, setManualNetwork] = useState('XLAYER');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);

  // Vanity
  const [vanityPrefix, setVanityPrefix] = useState('');
  const [vanitySuffix, setVanitySuffix] = useState('');
  const [vanityGenerating, setVanityGenerating] = useState(false);
  const [vanityScanned, setVanityScanned] = useState(0);
  const [vanitySpeed, setVanitySpeed] = useState(0);
  const [vanityTime, setVanityTime] = useState(0);
  const isVanityRunningRef = useRef(false);

  // Derivation Path
  const [manualDerivationPath, setManualDerivationPath] = useState("m/44'/60'/0'/0/0");

  useEffect(() => {
    if (manualPK && !manualAddress) {
      try {
        const w = new ethers.Wallet(manualPK.trim());
        setManualAddress(w.address);
      } catch {
        // Ignore partial private-key input while the user is typing.
      }
    }
  }, [manualPK, manualAddress]);

  useEffect(() => {
    if (manualSeed && !manualAddress) {
      try {
        let hdNode;
        if (ethers.HDNodeWallet) {
           hdNode = ethers.HDNodeWallet.fromPhrase(manualSeed.trim(), null, manualDerivationPath || "m/44'/60'/0'/0/0");
        } else {
           hdNode = ethers.Wallet.fromPhrase(manualSeed.trim());
        }
        setManualAddress(hdNode.address);
        if (hdNode.privateKey) setManualPK(hdNode.privateKey);
      } catch {
        // Ignore partial seed phrase/path input while the user is typing.
      }
    }
  }, [manualSeed, manualDerivationPath, manualAddress]);

  const startVanity = () => {
     isVanityRunningRef.current = true;
     setVanityGenerating(true);
     setVanityScanned(0);
     setVanitySpeed(0);
     setVanityTime(0);
     setGeneratedWallets([]);

     const prefix = vanityPrefix.toLowerCase();
     const suffix = vanitySuffix.toLowerCase();
     const startTime = Date.now();
     let scannedCount = 0;

     const loop = () => {
         if (!isVanityRunningRef.current) return;
         
         const batchSize = 100;
         for (let i = 0; i < batchSize; i++) {
             const w = ethers.Wallet.createRandom();
             const addr = w.address.toLowerCase();
             scannedCount++;
             if ((!prefix || addr.startsWith("0x" + prefix)) && (!suffix || addr.endsWith(suffix))) {
                 isVanityRunningRef.current = false;
                 setVanityGenerating(false);
                 setGeneratedWallets([{
                    name: `Vanity Wallet`,
                    address: w.address,
                    privateKey: w.privateKey,
                    mnemonic: w.mnemonic?.phrase || ''
                 }]);
                 setWalletName('Vanity Wallet');
                 return;
             }
         }
         
         const elapsed = (Date.now() - startTime) / 1000;
         if (elapsed > 0) {
             setVanityScanned(scannedCount);
             setVanityTime(elapsed.toFixed(1));
             setVanitySpeed(Math.floor(scannedCount / elapsed));
         }
         
         setTimeout(loop, 0);
     };
     
     loop();
  };

  const stopVanity = () => {
     isVanityRunningRef.current = false;
     setVanityGenerating(false);
  };

  const generateWallet = async () => {
    const count = parseInt(generateCount) || 1;
    if (count < 1) return;

    if (count < 10) {
      setGenerating(true);
      setGenerateProgress(0);
      setFloatingEffects([]);
      
      const processSingle = async (i, newWallets) => {
        if (i < count) {
          const w = ethers.Wallet.createRandom();
          newWallets.push({
            name: count === 1 ? `Wallet ${Date.now().toString(36).slice(-4).toUpperCase()}` : `Wallet ${i + 1}`,
            address: w.address,
            privateKey: w.privateKey,
            mnemonic: w.mnemonic?.phrase || '',
            seedPhrase: w.mnemonic?.phrase || '',
            balance: '0.00',
            network: 'XLAYER'
          });
          setGenerateProgress(i + 1);
          setFloatingEffects(prev => [...prev.slice(-4), { count: i + 1, address: w.address, key: Math.random() }]);
          setTimeout(() => processSingle(i + 1, newWallets), 150);
        } else {
          setTimeout(() => {
            setGeneratedWallets(newWallets);
            if (count === 1) {
              setWalletName(newWallets[0].name);
            }
            setGenerating(false);
          }, 800);
        }
      };
      processSingle(0, []);
    } else {
      setGenerating(true);
      setGenerateProgress(0);
      setFloatingEffects([]);
      const newWallets = [];
      const chunkSize = 20;
      
      const processChunk = async (i) => {
        const limit = Math.min(i + chunkSize, count);
        for (let j = i; j < limit; j++) {
          const w = ethers.Wallet.createRandom();
          newWallets.push({
            name: `Wallet ${j + 1}`,
            address: w.address,
            privateKey: w.privateKey,
            seedPhrase: w.mnemonic?.phrase || '',
            balance: '0.00',
            network: 'XLAYER'
          });
        }
        setGenerateProgress(limit);
        const lastW = newWallets[newWallets.length - 1];
        setFloatingEffects(prev => [...prev.slice(-4), { count: limit, address: lastW.address, key: Math.random() }]);

        if (limit < count) {
          setTimeout(() => processChunk(limit), 100);
        } else {
          setTimeout(async () => {
            const sizeBytes = new Blob([JSON.stringify(newWallets)]).size;
            let storageInfo = null;
            if (navigator.storage && navigator.storage.estimate) {
              try { storageInfo = await navigator.storage.estimate(); } catch {
                storageInfo = null;
              }
            }
            onSave(newWallets);
            setBulkResult({ count, sizeBytes, storageInfo });
            setGenerating(false);
          }, 800);
        }
      };
      processChunk(0);
    }
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
    if (generatedWallets.length === 0) return;
    
    // Auto-save logic was already mapped. We just map the generatedWallets to standard format.
    const toSave = generatedWallets.map((w, index) => ({
      name: (generatedWallets.length === 1 ? walletName : w.name) || 'New Wallet',
      address: w.address,
      privateKey: w.privateKey,
      seedPhrase: w.mnemonic,
      balance: '0.00',
      network: 'XLAYER',
      createdAt: Date.now() + index
    }));
    
    onSave(toSave.length === 1 ? toSave[0] : toSave);
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
      <div className="bg-surface-900 border border-surface-700 w-full max-w-lg lg:max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
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
          <button onClick={() => setTab('vanity')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'vanity' ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5' : 'text-surface-400 hover:text-white'}`}>
            <Wallet size={16} /> {t('createWallet.tabVanity') || 'Vanity'}
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* ── Manual Entry Tab ── */}
          {tab === 'manual' && (
            <div className="grid gap-4 lg:grid-cols-2">
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
                <p className="text-[11px] text-red-400/70 mt-1.5 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.pkExplain')}</p>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.seedPhrase')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <textarea value={manualSeed} onChange={(e) => setManualSeed(e.target.value)} placeholder="word1 word2 word3 ..." rows={2}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
                <p className="text-[11px] text-surface-500 mt-1 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.seedExplain')}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.derivationPath') || 'Derivation Path'}</label>
                <input type="text" value={manualDerivationPath} onChange={(e) => setManualDerivationPath(e.target.value)} placeholder="m/44'/60'/0'/0/0"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
                <p className="text-[11px] text-surface-500 mt-1 flex items-start gap-1"><Info size={10} className="mt-0.5 flex-shrink-0" />{t('createWallet.derivationPathHelp') || "Advanced: Custom HD path (e.g. m/44'/60'/0'/0/0)"}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.balance')} <span className="text-surface-600">({t('createWallet.optional')})</span></label>
                <input type="text" value={manualBalance} onChange={(e) => setManualBalance(e.target.value)} placeholder="0.00"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600" />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.notes')} <span className="text-surface-600">{t('createWallet.optional')}</span></label>
                <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder={t('createWallet.notesPlaceholder')} rows={2}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-surface-600 resize-none" />
              </div>
            </div>
          )}

          {/* ── Generate Tab ── */}
          {tab === 'generate' && (
            <div className="flex flex-col space-y-4">
              {generating ? (
                <div className="text-center py-10 relative">
                  <style>{`
                    @keyframes floatUpFade {
                      0% { opacity: 0; transform: translateY(20px) scale(0.9); }
                      20% { opacity: 1; transform: translateY(0px) scale(1.1); }
                      100% { opacity: 0; transform: translateY(-50px) scale(1); }
                    }
                    .animate-float-up-fade {
                      animation: floatUpFade 1.2s ease-out forwards;
                    }
                  `}</style>
                  
                  <div className="relative h-24 flex items-end justify-center overflow-hidden mb-4">
                    {floatingEffects.map(effect => (
                      <div key={effect.key} className="absolute bottom-0 text-center animate-float-up-fade pointer-events-none">
                        <span className="text-brand-400 font-black text-3xl drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">+{effect.count}</span>
                        <p className="text-[10px] text-brand-300/80 font-mono mt-1 bg-surface-900/80 px-2 py-0.5 rounded-full border border-surface-700/50 shadow-lg">{effect.address.substring(0,8)}...{effect.address.substring(34)}</p>
                      </div>
                    ))}
                    {floatingEffects.length === 0 && (
                      <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center">
                        <RefreshCw size={32} className="text-brand-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2">{t('createWallet.bulkGenerating', { count: generateCount }) || 'Generating Wallets...'}</h3>
                  <div className="w-full bg-surface-800 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-brand-600 to-brand-400 h-2.5 rounded-full transition-all duration-300 relative overflow-hidden" style={{ width: `${(generateProgress / (parseInt(generateCount)||1)) * 100}%` }}>
                       <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-sm text-surface-400 font-medium">{generateProgress} / {generateCount}</p>
                </div>
              ) : bulkResult ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t('createWallet.bulkSuccess', { count: bulkResult.count }) || `Successfully generated and saved ${bulkResult.count} wallets.`}</h3>
                  <div className="bg-surface-800 rounded-lg p-4 text-left space-y-3 mb-6">
                    <div className="flex justify-between items-center border-b border-surface-700 pb-2">
                      <span className="text-surface-400 text-sm">{t('createWallet.bulkSize') || 'Estimated Data Size'}</span>
                      <span className="text-white font-mono text-sm">{(bulkResult.sizeBytes / 1024).toFixed(2)} KB</span>
                    </div>
                    {bulkResult.storageInfo && (
                      <div className="flex justify-between items-center">
                        <span className="text-surface-400 text-sm">{t('createWallet.bulkStorage') || 'Available Storage'}</span>
                        <span className="text-white font-mono text-sm">{((bulkResult.storageInfo.quota - bulkResult.storageInfo.usage) / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    )}
                  </div>
                  <button onClick={onClose} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-lg w-full transition-colors">
                    {t('common.close')}
                  </button>
                </div>
              ) : generatedWallets.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={32} className="text-brand-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{t('createWallet.bulkTitle') || 'Bulk Generate Wallets'}</h3>
                  <p className="text-surface-400 text-sm mb-6">{t('createWallet.generateInfo')}</p>
                  
                  <div className="mb-6 text-left">
                    <label className="block text-xs font-medium text-surface-400 mb-2">{t('createWallet.bulkQuantity') || 'Number of wallets to generate'}</label>
                    <div className="flex items-center bg-surface-800 border border-surface-700 rounded-lg overflow-hidden mb-3 focus-within:border-brand-500 transition-colors">
                      <button onClick={() => setGenerateCount(Math.max(1, (parseInt(generateCount) || 1) - 1))} className="px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors border-r border-surface-700 active:bg-surface-600">-</button>
                      <input 
                        type="number" 
                        min="1" 
                        max="10000"
                        value={generateCount} 
                        onChange={(e) => setGenerateCount(e.target.value)}
                        className="flex-1 bg-transparent px-4 py-3 text-white text-center font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                      <button onClick={() => setGenerateCount(Math.min(10000, (parseInt(generateCount) || 1) + 1))} className="px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors border-l border-surface-700 active:bg-surface-600">+</button>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[1, 5, 10, 50, 100, 200].map(num => (
                        <button key={num} onClick={() => setGenerateCount(num)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${parseInt(generateCount) === num ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'}`}>
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface-800/30 border border-surface-700/50 rounded-lg p-3 mb-6 text-left">
                    <p className="text-[11px] text-surface-300 leading-relaxed flex items-start gap-1.5 mb-3">
                      <Info size={12} className="text-brand-400 mt-0.5 flex-shrink-0" />
                      {t('createWallet.generateExplain')}
                    </p>
                    
                    {t('createWallet.mathSteps') && t('createWallet.mathSteps.steps') && Array.isArray(t('createWallet.mathSteps.steps')) && (
                      <div className="space-y-2 mt-2">
                        {t('createWallet.mathSteps.steps').map((step, idx) => {
                          const theme = MATH_THEMES[idx % MATH_THEMES.length];
                          const isExpanded = expandedStep === idx;
                          return (
                            <div key={idx} className={`border ${theme.border} ${theme.bg} rounded-lg overflow-hidden transition-all duration-300`}>
                              <button onClick={() => setExpandedStep(isExpanded ? null : idx)} className="w-full px-3 py-2 flex items-center justify-between text-left focus:outline-none">
                                <span className={`text-[11px] font-semibold ${theme.text}`}>{step.title}</span>
                                <ChevronDown size={14} className={`${theme.text} transition-transform ${isExpanded ? 'rotate-180' : ''} flex-shrink-0 ml-2`} />
                              </button>
                              {isExpanded && (
                                <div className={`px-3 pb-3 text-[10px] text-surface-300 space-y-2 border-t ${theme.contentBorder} pt-2`}>
                                  <div>
                                    <span className={`font-semibold ${theme.label}`}>{t('createWallet.mathSteps.task')}: </span>
                                    <span className="opacity-90">{step.task}</span>
                                  </div>
                                  <div>
                                    <span className={`font-semibold ${theme.label}`}>{step.type === 'meaning' ? t('createWallet.mathSteps.meaning') : t('createWallet.mathSteps.result')}: </span>
                                    <span className="opacity-90">{step.result}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={generateWallet} className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-8 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 w-full">
                    <Plus size={18} /> {t('createWallet.bulkGenerateBtn') || 'Generate & Save'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 pb-20">
                  {generatedWallets.map((w, index) => (
                    <div key={index} className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 space-y-4">
                      {generatedWallets.length === 1 ? (
                        <div>
                          <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.walletName')}</label>
                          <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)}
                            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500" />
                        </div>
                      ) : (
                        <h4 className="text-sm font-medium text-white">{w.name}</h4>
                      )}
                      
                      <div>
                        <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.address')}</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-surface-800 text-brand-300 p-3 rounded-lg text-sm break-all">{w.address}</code>
                          <button onClick={() => handleCopy(w.address, `addr_${index}`)} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg">
                            {copiedField === `addr_${index}` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.privateKey')}</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-surface-800 text-red-300 p-3 rounded-lg text-xs break-all font-mono">{w.privateKey}</code>
                          <button onClick={() => handleCopy(w.privateKey, `pk_${index}`)} className="p-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg">
                            {copiedField === `pk_${index}` ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      {w.mnemonic && (
                        <div>
                          <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.mnemonic12')}</label>
                          <div className="bg-surface-800 p-3 rounded-lg">
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              {w.mnemonic.split(' ').map((word, i) => (
                                <span key={i} className="text-[10px] text-surface-200 bg-surface-700 px-1 py-1 rounded text-center truncate">
                                  <span className="text-surface-500 mr-1">{i + 1}.</span>{word}
                                </span>
                              ))}
                            </div>
                            <button onClick={() => handleCopy(w.mnemonic, `mn_${index}`)} className="text-xs text-surface-400 hover:text-brand-400 flex items-center gap-1">
                              {copiedField === `mn_${index}` ? <><Check size={12} className="text-green-400" /> {t('common.copied')}</> : <><Copy size={12} /> {t('createWallet.copyMnemonic')}</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                    ⚠️ <strong>{t('createWallet.backupWarning')}</strong>
                  </div>

                  <button onClick={() => { setGeneratedWallets([]); setGenerateCount(1); }} className="text-xs text-surface-500 hover:text-brand-400 flex items-center gap-1 mx-auto pb-4">
                    <RefreshCw size={12} /> {t('createWallet.generateAnother')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Vanity Tab ── */}
          {tab === 'vanity' && (
            <div className="space-y-6 pb-20">
              <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl mb-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.vanityPrefix') || 'Prefix'}</label>
                    <input type="text" value={vanityPrefix} onChange={(e) => setVanityPrefix(e.target.value.replace(/[^a-fA-F0-9]/g, ''))} placeholder="e.g. 123" disabled={vanityGenerating}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 disabled:opacity-50" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-surface-400 mb-1">{t('createWallet.vanitySuffix') || 'Suffix'}</label>
                    <input type="text" value={vanitySuffix} onChange={(e) => setVanitySuffix(e.target.value.replace(/[^a-fA-F0-9]/g, ''))} placeholder="e.g. abc" disabled={vanityGenerating}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 disabled:opacity-50" />
                  </div>
                </div>
                <p className="text-[11px] text-amber-400/80 mt-3 flex items-start gap-1">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  {t('createWallet.vanityWarning') || "Warning: Long prefixes take exponentially longer. Keep it to 2-4 characters to avoid freezing."}
                </p>
              </div>

              {!vanityGenerating && generatedWallets.length === 0 ? (
                <button onClick={startVanity} disabled={!vanityPrefix && !vanitySuffix} className="btn-glow w-full bg-brand-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:bg-brand-500 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <RefreshCw size={18} />
                  {t('createWallet.startVanity') || 'Start Generator'}
                </button>
              ) : vanityGenerating ? (
                <div className="bg-surface-800/50 rounded-xl p-5 text-center">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-brand-400 text-sm font-semibold mb-1">{t('createWallet.bulkGenerating', { count: '' }).replace('...', '') + '...' || 'Generating...'}</p>
                  <p className="text-surface-400 text-xs font-mono">
                    {t('createWallet.vanityStatus', { scanned: vanityScanned, speed: vanitySpeed, time: vanityTime }) || `Scanned: ${vanityScanned} | Speed: ${vanitySpeed} h/s | Time: ${vanityTime}s`}
                  </p>
                  <button onClick={stopVanity} className="mt-4 text-red-400 text-xs font-medium hover:text-red-300 transition-colors">
                    {t('createWallet.stopVanity') || 'Stop'}
                  </button>
                </div>
              ) : (
                <div className="bg-surface-800 rounded-xl overflow-hidden border border-surface-700">
                  <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-800/50">
                    <h3 className="font-medium text-white text-sm">{generatedWallets[0].name}</h3>
                    <button onClick={() => { setGeneratedWallets([]); setVanityScanned(0); }} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                      <RefreshCw size={12} /> {t('authError.retry') || 'Retry'}
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-xs text-surface-400 block mb-1">{t('createWallet.address') || 'Address'}</span>
                      <div className="flex justify-between items-center p-2.5 bg-surface-900 rounded-lg font-mono text-xs text-brand-400 break-all">
                        <span>{generatedWallets[0].address}</span>
                        <button onClick={() => handleCopy(generatedWallets[0].address, 'addr')} className="p-1 hover:bg-surface-800 rounded text-surface-400 transition-colors ml-2 flex-shrink-0">
                          {copiedField === 'addr' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-surface-400 block mb-1">{t('createWallet.privateKey') || 'Private Key'}</span>
                      <div className="flex justify-between items-center p-2.5 bg-surface-900 rounded-lg font-mono text-xs text-brand-400 break-all">
                        <span>{generatedWallets[0].privateKey}</span>
                        <button onClick={() => handleCopy(generatedWallets[0].privateKey, 'pk')} className="p-1 hover:bg-surface-800 rounded text-surface-400 transition-colors ml-2 flex-shrink-0">
                          {copiedField === 'pk' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    {generatedWallets[0].mnemonic && (
                      <div>
                        <span className="text-xs text-surface-400 block mb-1">{t('createWallet.seedPhrase') || 'Seed Phrase'}</span>
                        <div className="flex justify-between items-center p-2.5 bg-surface-900 rounded-lg font-mono text-xs text-brand-400 break-all">
                          <span>{generatedWallets[0].mnemonic}</span>
                          <button onClick={() => handleCopy(generatedWallets[0].mnemonic, 'seed')} className="p-1 hover:bg-surface-800 rounded text-surface-400 transition-colors ml-2 flex-shrink-0">
                            {copiedField === 'seed' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {(tab === 'manual' || (tab === 'generate' && generatedWallets.length > 0 && !bulkResult) || (tab === 'vanity' && generatedWallets.length > 0)) && (
          <div className="p-4 border-t border-surface-800 bg-surface-900 sticky bottom-0 rounded-b-2xl">
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
