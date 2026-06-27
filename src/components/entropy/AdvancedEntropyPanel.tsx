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
      <div className="space-y-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-emerald-500 dark:text-emerald-400 mb-2">
          <Check size={20} />
          <h3 className="font-bold">{t('createWallet.entropy.generatedSuccess')}</h3>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400/80 mb-1">{t('createWallet.address')}</label>
          <code className="block rounded-lg border border-emerald-500/20 bg-white/80 p-2.5 font-mono text-sm text-emerald-700 break-all dark:bg-surface-950 dark:text-emerald-300">
            {address}
          </code>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400/80 mb-1">{t('createWallet.seedPhrase')}</label>
          <div className="rounded-lg border border-emerald-500/20 bg-white/80 p-3 dark:bg-surface-950">
            <div className="grid grid-cols-3 gap-2">
              {seedPhrase.split(' ').map((word, i) => (
                <span key={i} className="rounded bg-emerald-500/10 px-1 py-1 text-center text-scale-2xs text-surface-800 truncate dark:text-surface-200">
                  <span className="text-emerald-600/70 dark:text-emerald-400/60 mr-1">{i + 1}.</span>{word}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={reset}
            className="flex-1 rounded-lg border border-surface-200 bg-white py-2.5 text-sm font-semibold text-surface-800 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:hover:bg-surface-700"
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
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800/50">
        <button
          onClick={() => setSource('fingerprint')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            source === 'fingerprint' ? 'bg-brand-500 text-white shadow-sm' : 'text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
          }`}
        >
          <Fingerprint size={16} />
          {t('createWallet.entropy.sourceFingerprint')}
        </button>
        <button
          onClick={() => setSource('dice')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            source === 'dice' ? 'bg-brand-500 text-white shadow-sm' : 'text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
          }`}
        >
          <Dices size={16} />
          {t('createWallet.entropy.sourceDice')}
        </button>
        <button
          onClick={() => setSource('bip85')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            source === 'bip85' ? 'bg-brand-500 text-white shadow-sm' : 'text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
          }`}
        >
          <Share2 size={16} />
          {t('createWallet.entropy.sourceBip85')}
        </button>
      </div>

      <div className="relative rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900">
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