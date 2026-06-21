import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useT } from './LanguageContext';

type ConfirmOptions = {
  danger?: boolean;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
};

type ConfirmState = Required<Pick<ConfirmOptions, 'danger' | 'hideCancel'>> &
  Omit<ConfirmOptions, 'danger' | 'hideCancel'> & {
    message: string;
    resolve: (answer: boolean) => void;
  };

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

function ConfirmDialog({ state, onAnswer }: { state: ConfirmState | null; onAnswer: (answer: boolean) => void }) {
  const t = useT();
  if (!state) return null;

  const tone = state.danger
    ? {
        iconWrap: 'bg-red-500/10 border-red-500/20',
        icon: 'text-red-400',
        confirm: 'btn-glow-danger bg-red-600 hover:bg-red-500 text-white',
        ring: 'shadow-[0_20px_70px_rgba(239,68,68,0.16)]'
      }
    : {
        iconWrap: 'bg-amber-500/10 border-amber-500/20',
        icon: 'text-amber-400',
        confirm: 'bg-brand-600 hover:bg-brand-500 text-white',
        ring: 'shadow-[0_20px_70px_rgba(14,165,233,0.14)]'
      };
  const Icon = state.danger ? AlertTriangle : ShieldCheck;

  return (
    <div className="app-scaled-icons fixed inset-0 z-[210] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md animate-slide-down sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-[min(92dvw,28rem)] overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 ${tone.ring}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-800 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${tone.iconWrap}`}>
              <Icon size={21} className={tone.icon} />
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-base font-bold leading-snug text-white">{state.title || (state.danger ? t('common.warning') : t('common.confirm'))}</h3>
              <p className="mt-1 text-sm leading-relaxed text-surface-300">{state.message}</p>
            </div>
          </div>
          <button
            onClick={() => onAnswer(false)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-surface-400 transition-colors hover:bg-surface-800 hover:text-white"
            aria-label={t('common.cancel')}
          >
            <X size={18} />
          </button>
        </div>
        <div className={`grid gap-3 p-4 sm:p-5 ${state.hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!state.hideCancel && (
            <button
              onClick={() => onAnswer(false)}
              className="btn-glow rounded-xl border border-surface-700 bg-surface-800 px-4 py-3 text-sm font-semibold text-surface-200 transition-colors hover:bg-surface-700"
            >
              {state.cancelText || t('common.cancel')}
            </button>
          )}
          <button
            onClick={() => onAnswer(true)}
            className={`btn-glow rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${tone.confirm}`}
          >
            {state.confirmText || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmFn>((message, { danger = false, title, confirmText, cancelText, hideCancel = false } = {}) => {
    return new Promise(resolve => {
      setState({ message, resolve, danger, title, confirmText, cancelText, hideCancel });
    });
  }, []);

  const handleAnswer = (answer: boolean) => {
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
