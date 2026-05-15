import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useT } from './LanguageContext';

const ConfirmContext = createContext(null);

export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmDialog({ state, onAnswer }) {
  const t = useT();
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-slide-down">
      <div className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${state.danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
            {state.danger
              ? <AlertTriangle size={20} className="text-red-400" />
              : <ShieldCheck size={20} className="text-amber-400" />
            }
          </div>
          <p className="text-white text-sm leading-relaxed pt-2">{state.message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onAnswer(false)}
            className="btn-glow flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 font-medium py-2.5 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onAnswer(true)}
            className={`btn-glow flex-1 font-medium py-2.5 rounded-lg transition-colors ${state.danger ? 'btn-glow-danger bg-red-600 hover:bg-red-500 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white'}`}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, { danger = false } = {}) => {
    return new Promise(resolve => {
      setState({ message, resolve, danger });
    });
  }, []);

  const handleAnswer = (answer) => {
    state?.resolve(answer);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog state={state} onAnswer={handleAnswer} />
    </ConfirmContext.Provider>
  );
}
