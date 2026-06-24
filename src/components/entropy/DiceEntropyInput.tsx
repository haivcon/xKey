import { useRef, useState } from 'react';
import { RefreshCw, Dices } from 'lucide-react';
import { useT } from '../../contexts/LanguageContext';
import { EntropyAccumulator } from '../../utils/entropyUtils';

interface DiceEntropyInputProps {
  onComplete: (seedHex: string) => void;
  requiredRolls?: number;
}

export default function DiceEntropyInput({ onComplete, requiredRolls = 99 }: DiceEntropyInputProps) {
  const t = useT();
  const accumulatorRef = useRef<EntropyAccumulator>(new EntropyAccumulator());
  const [rolls, setRolls] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleRoll = (value: number) => {
    if (isCompleted) return;

    // Collect entropy
    const acc = accumulatorRef.current;
    acc.addString(value.toString());
    
    const newRolls = [...rolls, value];
    setRolls(newRolls);

    if (newRolls.length >= requiredRolls && !isCompleted) {
      setIsCompleted(true);
      setTimeout(() => {
        onComplete(acc.getSeedHex());
      }, 500);
    }
  };

  const handleReset = () => {
    accumulatorRef.current = new EntropyAccumulator();
    setRolls([]);
    setIsCompleted(false);
  };

  const progress = Math.min(100, Math.floor((rolls.length / requiredRolls) * 100));

  return (
    <div className="flex flex-col gap-6">
      {/* Dice buttons */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((num) => (
          <button
            key={num}
            onClick={() => handleRoll(num)}
            disabled={isCompleted}
            className={`flex aspect-square items-center justify-center rounded-xl border text-2xl font-bold transition-all ${
              isCompleted 
                ? 'border-surface-700 bg-surface-800 text-surface-500 cursor-not-allowed'
                : 'border-surface-700 bg-surface-900 text-surface-200 hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-400 active:scale-95'
            }`}
          >
            {/* Simple dot representation */}
            <div className="grid grid-cols-3 gap-1 p-2 w-full h-full">
              {[...Array(9)].map((_, i) => {
                const showDot = (
                  (num === 1 && i === 4) ||
                  (num === 2 && (i === 0 || i === 8)) ||
                  (num === 3 && (i === 0 || i === 4 || i === 8)) ||
                  (num === 4 && (i === 0 || i === 2 || i === 6 || i === 8)) ||
                  (num === 5 && (i === 0 || i === 2 || i === 4 || i === 6 || i === 8)) ||
                  (num === 6 && (i === 0 || i === 2 || i === 3 || i === 5 || i === 6 || i === 8))
                );
                return (
                  <div key={i} className="flex items-center justify-center">
                    {showDot && <div className="w-2 h-2 rounded-full bg-current" />}
                  </div>
                );
              })}
            </div>
          </button>
        ))}
      </div>

      {/* Progress & Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-3 bg-surface-800 rounded-full overflow-hidden border border-surface-700">
          <div 
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-bold text-surface-300 w-16 text-right">
          {rolls.length} / {requiredRolls}
        </span>
        <button
          onClick={handleReset}
          className="p-2 rounded-xl border border-surface-700 bg-surface-800 text-surface-400 hover:text-white hover:border-surface-600 transition-colors"
          title={t('common.reset')}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* History */}
      <div className="relative h-24 w-full rounded-2xl border border-surface-700 bg-surface-900 p-3 overflow-hidden">
        {rolls.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-surface-400 text-sm font-medium flex items-center gap-2">
              <Dices size={18} className="text-brand-400" />
              {t('createWallet.entropy.dicePrompt')}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 overflow-y-auto h-full pr-2 content-start">
            {rolls.map((roll, i) => (
              <span 
                key={i} 
                className="flex h-6 w-6 items-center justify-center rounded bg-surface-800 text-xs font-semibold text-surface-300 border border-surface-700"
              >
                {roll}
              </span>
            ))}
          </div>
        )}

        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900/90 backdrop-blur-[2px]">
            <p className="text-emerald-400 font-bold text-lg drop-shadow-md">
              {t('createWallet.entropy.generated')} ✓
            </p>
          </div>
        )}
      </div>
    </div>
  );
}