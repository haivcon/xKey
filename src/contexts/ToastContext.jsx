import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLES = {
  success: {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    text: 'text-emerald-100',
    bar: 'bg-emerald-400',
  },
  error: {
    bg: 'bg-red-950/90',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    text: 'text-red-100',
    bar: 'bg-red-400',
  },
  warning: {
    bg: 'bg-amber-950/90',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    text: 'text-amber-100',
    bar: 'bg-amber-400',
  },
  info: {
    bg: 'bg-sky-950/90',
    border: 'border-sky-500/30',
    icon: 'text-sky-400',
    text: 'text-sky-100',
    bar: 'bg-sky-400',
  },
};

function ToastItem({ toast, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const duration = toast.duration;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [toast.duration]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 250);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  };

  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = TOAST_ICONS[toast.type] || Info;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-250
        ${style.bg} ${style.border}
        ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}
      style={{ maxWidth: '400px', width: '100%' }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="flex-shrink-0 mt-0.5">
          <Icon size={18} className={style.icon} />
        </div>
        <p className={`flex-1 text-sm font-medium leading-snug ${style.text}`}>
          {toast.message}
        </p>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 mt-0.5 p-0.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={14} className="text-white/40" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-[2px] w-full bg-white/5">
        <div
          className={`h-full ${style.bar} transition-none`}
          style={{ width: `${progress}%`, opacity: 0.6 }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => {
      // Keep max 3 toasts visible
      const limited = prev.length >= 3 ? prev.slice(1) : prev;
      return [...limited, { id, message, type, duration }];
    });
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container — top-center, safe area aware */}
      <div className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-center gap-2 pt-[env(safe-area-inset-top,12px)] px-4 pointer-events-none"
           style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}>
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-full flex justify-center">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
