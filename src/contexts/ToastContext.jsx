import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { logActionHistory } from '../utils/actionHistory';

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

const ADDRESS_PATTERN = /(0x[a-fA-F0-9]{40})/;
const COPY_WORDS = ['copied', 'copy', 'sao chép', 'đã sao chép', 'copiado', 'kopiert', 'コピー', '복사', 'скоп'];

const formatToastMessage = (message) => {
  const raw = String(message ?? '').replace(/\s+/g, ' ').trim();
  const address = raw.match(ADDRESS_PATTERN)?.[1] || '';
  const looksLikeCopy = COPY_WORDS.some(word => raw.toLowerCase().includes(word));
  if (!address || !looksLikeCopy) return { title: raw, address: '' };

  const title = raw
    .replace(address, '')
    .replace(/[:：]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: title || raw, address };
};

const getToastDuration = (type, duration, message) => {
  if (Number.isFinite(duration)) return duration;
  const raw = String(message || '').toLowerCase();
  if (ADDRESS_PATTERN.test(raw) || raw.includes('copied') || raw.includes('sao chép')) return 2200;
  if (type === 'error') return 6000;
  if (type === 'warning') return 4500;
  if (type === 'success') return 2600;
  return 3200;
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

  const handleAction = () => {
    toast.action?.onClick?.();
    handleDismiss();
  };

  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = TOAST_ICONS[toast.type] || Info;
  const formatted = formatToastMessage(toast.message);

  return (
    <div
      className={`relative max-h-[28dvh] overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-250
        ${style.bg} ${style.border}
        ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}
      style={{ width: 'min(420px, calc(100vw - 28px))', fontSize: 'calc(1rem * var(--app-display-scale, 1))' }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5 text-center sm:gap-3 sm:px-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
          <Icon size={17} className={style.icon} />
        </div>
        {formatted.address ? (
          <div className={`min-w-0 flex-1 overflow-hidden text-center ${style.text}`}>
            <p className="truncate text-[0.82em] font-semibold leading-tight">{formatted.title}</p>
            <p className="mt-0.5 whitespace-nowrap font-mono font-bold leading-tight text-[clamp(0.56rem,2.55vw,0.78rem)]">
              {formatted.address}
            </p>
          </div>
        ) : (
          <p className={`min-w-0 flex-1 overflow-hidden break-words text-center text-[0.82em] font-semibold leading-snug ${style.text}`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {toast.message}
          </p>
        )}
        {toast.action ? (
          <button
            onClick={handleAction}
            className="flex-shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[0.72em] font-bold text-white transition-colors hover:bg-white/15"
          >
            {toast.action.label}
          </button>
        ) : (
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <X size={14} className="text-white/40" />
          </button>
        )}
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

  const showToast = useCallback((message, type = 'info', duration, action) => {
    const id = ++toastId;
    const resolvedDuration = getToastDuration(type, duration, message);
    logActionHistory(message, type).catch(() => {});
    setToasts(prev => {
      // Keep max 3 toasts visible
      const limited = prev.length >= 3 ? prev.slice(1) : prev;
      return [...limited, { id, message, type, duration: resolvedDuration, action }];
    });
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container — top-center, safe area aware */}
      <div
        className="fixed left-0 right-0 z-[200] flex flex-col items-center gap-2 px-3 pointer-events-none"
        style={{ top: 'max(env(safe-area-inset-top, 0px), 0px)', paddingTop: 12 }}
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto flex w-full justify-center">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
