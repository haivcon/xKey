import React, { useState } from 'react';
import { 
  Key, 
  Settings2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { useT } from '../../contexts/LanguageContext';
import { isValidMasterNode, deriveBIP39Mnemonic } from '../../utils/bip85Utils';

interface BIP85DerivationPanelProps {
  onDerivedMnemonic: (mnemonic: string, entropy: Uint8Array) => void;
}

export function BIP85DerivationPanel({ onDerivedMnemonic }: BIP85DerivationPanelProps) {
  const t = useT();
  const [masterKey, setMasterKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  // Derivation options
  const [words, setWords] = useState<12 | 24>(12);
  const [index, setIndex] = useState<number>(0);
  
  // State
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDerive = () => {
    setError(null);
    if (!masterKey.trim()) {
      setError(t('Please enter a master seed phrase or xprv.'));
      return;
    }

    setIsValidating(true);
    
    // Slight delay to let UI render loading state
    setTimeout(() => {
      try {
        if (!isValidMasterNode(masterKey)) {
          setError(t('Invalid master seed phrase or xprv key.'));
          setIsValidating(false);
          return;
        }

        const result = deriveBIP39Mnemonic(masterKey, {
          words,
          language: 0,
          index
        });
        
        onDerivedMnemonic(result.mnemonic, result.entropy);
        
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message || t('Failed to derive mnemonic'));
      } finally {
        setIsValidating(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-blue-400">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">BIP85 Deterministic Derivation</p>
          <p className="opacity-90">
            Generate multiple independent standard recovery phrases from a single master seed. 
            Backing up the master seed backs up all derived phrases automatically.
          </p>
        </div>
      </div>

      <div className="space-y-4 bg-[#1a1b1e] rounded-xl p-4 border border-white/5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t('Master Seed Phrase or Extended Private Key (xprv)')}
          </label>
          <div className="relative">
            <textarea
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              className={`w-full bg-[#141517] border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm ${
                error ? 'border-red-500/50' : 'border-white/10'
              }`}
              rows={3}
              placeholder={t('Enter 12/24 words or xprv...')}
              style={{
                WebkitTextSecurity: showKey ? 'none' : 'disc'
              } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3 p-1.5 text-gray-400 hover:text-white bg-[#141517] rounded-md transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        <p className="mt-2 text-xs text-gray-500">
          {t('entropy.bip85MasterWarning') || 'The master seed is used only in memory for this derivation and is not saved by xKey.'}
        </p>
          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t('Word Count')}
            </label>
            <div className="flex bg-[#141517] rounded-lg p-1 border border-white/5">
              {[12, 24].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setWords(count as 12 | 24)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    words === count
                      ? 'bg-[#2a2b2e] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t('Index')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Settings2 className="w-4 h-4 text-gray-500" />
              </div>
              <input
                type="number"
                min="0"
                max="2147483647"
                step="1"
                value={index}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  const nextIndex = Number.isFinite(parsed) ? parsed : 0;
                  setIndex(Math.min(2147483647, Math.max(0, nextIndex)));
                }}
                className="w-full bg-[#141517] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
          </div>
        </div>

        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
          <div className="text-xs text-gray-500 mb-1">Derivation Path</div>
          <div className="font-mono text-sm text-gray-400 break-all">
            m/83696968'/39'/0'/{words}'/{index}'
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDerive}
        disabled={isValidating || !masterKey.trim()}
        className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
      >
        {isValidating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>{t('Deriving...')}</span>
          </>
        ) : (
          <>
            <Key className="w-5 h-5" />
            <span>{t('Derive Phrase')}</span>
          </>
        )}
      </button>
    </div>
  );
}