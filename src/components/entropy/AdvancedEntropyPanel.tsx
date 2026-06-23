import React, { useState } from 'react';
import { Fingerprint, Dices, Share2, RefreshCw, Check } from 'lucide-react';
import EntropyCanvas from './EntropyCanvas';
import DiceEntropyInput from './DiceEntropyInput';
import { BIP85DerivationPanel } from './BIP85DerivationPanel';
import { useT } from '../../contexts/LanguageContext';
import { ethers } from 'ethers';

interface AdvancedEntropyPanelProps {
  onGenerated: (entropy: Uint8Array, seedPhrase: string, address: string) => void;
}

type EntropySource = 'fingerprint' | 'dice' | 'bip85';

export default function AdvancedEntropyPanel({ onGenerated }: AdvancedEntropyPanelProps) {
  const t = useT();
  const [source, setSource] = useState<EntropySource>('fingerprint');
  const [entropyData, setEntropyData] = useState<Uint8Array | null>(null);
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEntropyComplete = async (seedHex: string) => {
    setIsProcessing(true);
    try {
      let finalEntropy = ethers.getBytes(seedHex);
      if (finalEntropy.length !== 32) {
        // Fallback: hash the entropy to get 32 bytes
        const hash = ethers.keccak256(seedHex);
        finalEntropy = ethers.getBytes(hash);
      }
      
      const mnemonic = ethers.Mnemonic.fromEntropy(finalEntropy);
      const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/0");
      
      setEntropyData(finalEntropy);
      setSeedPhrase(wallet.mnemonic?.phrase || '');
      setAddress(wallet.address);
    } catch (err) {
      console.error('Failed to generate wallet from entropy', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setEntropyData(null);
    setSeedPhrase('');
    setAddress('');
  };

  const saveAndUse = () => {
    if (entropyData && seedPhrase && address) {
      onGenerated(entropyData, seedPhrase, address);
    }
  };

  if (entropyData && seedPhrase && address) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
          <Check size={20} />
          <h3 className="font-bold">{t('createWallet.entropy.generatedSuccess')}</h3>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-emerald-500/80 mb-1">{t('createWallet.address')}</label>
          <code className="block bg-surface-900 border border-emerald-500/20 p-2.5 rounded-lg text-sm text-emerald-300 break-all font-mono">
            {address}
          </code>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-emerald-500/80 mb-1">{t('createWallet.seedPhrase')}</label>
          <div className="bg-surface-900 border border-emerald-500/20 p-3 rounded-lg">
            <div className="grid grid-cols-3 gap-2">
              {seedPhrase.split(' ').map((word, i) => (
                <span key={i} className="text-[10px] text-surface-200 bg-surface-800 px-1 py-1 rounded text-center truncate">
                  <span className="text-emerald-500/50 mr-1">{i + 1}.</span>{word}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={reset}
            className="flex-1 py-2.5 rounded-lg border border-surface-600 bg-surface-800 text-sm font-semibold text-white hover:bg-surface-700 transition-colors"
          >
            {t('common.reset')}
          </button>
          <button
            onClick={saveAndUse}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            {t('createWallet.useWallet')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 bg-surface-800/50 p-1 rounded-xl">
        <button
          onClick={() => setSource('fingerprint')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            source === 'fingerprint' ? 'bg-brand-500/20 text-brand-300 shadow-sm' : 'text-surface-400 hover:text-white'
          }`}
        >
          <Fingerprint size={16} />
          {t('createWallet.entropy.sourceFingerprint')}
        </button>
        <button
          onClick={() => setSource('dice')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            source === 'dice' ? 'bg-brand-500/20 text-brand-300 shadow-sm' : 'text-surface-400 hover:text-white'
          }`}
        >
          <Dices size={16} />
          {t('createWallet.entropy.sourceDice')}
        </button>
        <button
          onClick={() => setSource('bip85')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            source === 'bip85' ? 'bg-brand-500/20 text-brand-300 shadow-sm' : 'text-surface-400 hover:text-white'
          }`}
        >
          <Share2 size={16} />
          {t('createWallet.entropy.sourceBip85')}
        </button>
      </div>

      <div className="relative bg-surface-900 border border-surface-700 rounded-xl p-4">
        {source === 'fingerprint' && (
          <EntropyCanvas onComplete={handleEntropyComplete} />
        )}
        {source === 'dice' && (
          <DiceEntropyInput onComplete={handleEntropyComplete} />
        )}
        {source === 'bip85' && (
          <BIP85DerivationPanel
            onDerivedMnemonic={(mnemonic, entropy) => {
              setIsProcessing(true);
              try {
                const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
                
                setEntropyData(entropy);
                setSeedPhrase(mnemonic);
                setAddress(wallet.address);
              } catch (err) {
                console.error('Failed to parse BIP85 generated phrase', err);
              } finally {
                setIsProcessing(false);
              }
            }}
          />
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
            <RefreshCw className="animate-spin text-brand-400 mb-2" size={32} />
            <p className="text-brand-300 font-medium">{t('createWallet.entropy.processing')}</p>
          </div>
        )}
      </div>
    </div>
  );
}