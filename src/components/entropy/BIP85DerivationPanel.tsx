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

  const derivationPath = `m/83696968'/39'/0'/${words}'/${index}'`;

  const handleDerive = () => {
    setError(null);
    if (!masterKey.trim()) {
      setError(t('createWallet.entropy.bip85ErrorRequired'));
      return;
    }

    setIsValidating(true);
    
    // Slight delay to let UI render loading state
    setTimeout(() => {
      try {
        if (!isValidMasterNode(masterKey)) {
          setError(t('createWallet.entropy.bip85ErrorInvalid'));
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
        setError(err.message || t('createWallet.entropy.bip85ErrorDeriveFailed'));
      } finally {
        setIsValidating(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 flex gap-3 text-brand-600 dark:text-brand-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">{t('createWallet.entropy.bip85Title')}</p>
          <p className="opacity-90">
            {t('createWallet.entropy.bip85Desc')}
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-surface-200 bg-white/80 p-4 dark:border-surface-700 dark:bg-surface-900/80">
        <div>
          <label className="mb-2 block text-sm font-semibold text-surface-700 dark:text-surface-300">
            {t('createWallet.entropy.bip85InputLabel')}
          </label>
          <div className="relative">
            <textarea
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              className={`w-full rounded-xl border bg-surface-50 px-4 py-3 font-mono text-sm text-surface-950 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-950 dark:text-white dark:placeholder:text-surface-500 resize-none ${
                error ? 'border-red-500/50' : 'border-surface-200 dark:border-surface-700'
              }`}
              rows={3}
              placeholder={t('createWallet.entropy.bip85Placeholder')}
              style={{
                WebkitTextSecurity: showKey ? 'none' : 'disc'
              } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3 rounded-md bg-surface-100 p-1.5 text-surface-500 transition-colors hover:text-surface-950 dark:bg-surface-950 dark:text-surface-400 dark:hover:text-white"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        <p className="mt-2 text-xs text-surface-500">
          {t('createWallet.entropy.bip85MasterWarning')}
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
            <label className="block text-sm font-medium text-surface-500 mb-2">
              {t('createWallet.entropy.wordCount')}
            </label>
            <div className="flex rounded-lg border border-surface-200 bg-surface-100 p-1 dark:border-surface-700 dark:bg-surface-950">
              {[12, 24].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setWords(count as 12 | 24)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    words === count
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-surface-500 hover:text-surface-900 dark:hover:text-surface-200'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-500 mb-2">
              {t('createWallet.entropy.index')}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Settings2 className="h-4 w-4 text-surface-500 dark:text-surface-400" />
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
                className="w-full rounded-lg border border-surface-200 bg-surface-50 py-2 pl-9 pr-4 font-mono text-surface-950 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 shadow-inner shadow-brand-900/5 dark:border-brand-400/25 dark:bg-brand-500/10 dark:shadow-none">
          <div className="mb-1.5 text-xs font-semibold text-surface-700 dark:text-surface-200">{t('createWallet.entropy.derivationPath')}</div>
          <output
            aria-live="polite"
            className="block min-h-[2.25rem] w-full select-all break-all rounded-md border border-brand-500/20 bg-white px-2.5 py-2 font-mono text-sm font-bold leading-relaxed text-surface-950 shadow-sm dark:border-brand-400/25 dark:bg-surface-950 dark:text-white"
          >
            {derivationPath}
          </output>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDerive}
        disabled={isValidating || !masterKey.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {isValidating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>{t('createWallet.entropy.deriving')}</span>
          </>
        ) : (
          <>
            <Key className="w-5 h-5" />
            <span>{t('createWallet.entropy.derivePhrase')}</span>
          </>
        )}
      </button>
    </div>
  );
}