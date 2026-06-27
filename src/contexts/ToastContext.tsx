import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, type LucideIcon } from 'lucide-react';
import { logActionHistory } from '../utils/actionHistory';
import { useT, type TranslationVars } from './LanguageContext';
import { XKEY_SLOGAN } from '../utils/branding';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastAction = {
  label: string;
  onClick?: () => void | Promise<void>;
};
type ToastMessage = unknown | {
  key: string;
  vars?: TranslationVars;
  fallback?: string;
  category?: 'all' | 'unlock' | 'backup' | 'copy' | 'warning' | 'data' | 'other';
};
type Toast = {
  id: number;
  message: ToastMessage;
  resolvedMessage: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
};
type ToastContextValue = {
  showToast: (message: ToastMessage, type?: ToastType | string, duration?: number, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

const TOAST_ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLES: Record<ToastType, {
  bg: string;
  border: string;
  icon: string;
  text: string;
  bar: string;
}> = {
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

const normalizeToastType = (type: ToastType | string | undefined): ToastType => (
  type && Object.prototype.hasOwnProperty.call(TOAST_STYLES, type) ? type as ToastType : 'info'
);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitSloganMessage = (message: unknown): { slogan: string; body: string } => {
  const raw = String(message ?? '').replace(/\r\n/g, '\n').trim();
  const sloganPattern = new RegExp(`^${escapeRegExp(XKEY_SLOGAN)}(?:\\s*\\n\\s*|\\s{2,}|\\s*[-–—:]\\s*)?`, 'i');
  if (!sloganPattern.test(raw)) return { slogan: '', body: raw.replace(/\s+/g, ' ').trim() };

  const body = raw.replace(sloganPattern, '').replace(/\s+/g, ' ').trim();
  return { slogan: XKEY_SLOGAN, body };
};

const formatToastMessage = (message: unknown): { title: string; address: string; slogan: string } => {
  const sloganMessage = splitSloganMessage(message);
  const raw = sloganMessage.body || String(message ?? '').replace(/\s+/g, ' ').trim();
  const address = raw.match(ADDRESS_PATTERN)?.[1] || '';
  const looksLikeCopy = COPY_WORDS.some(word => raw.toLowerCase().includes(word));
  if (!address || !looksLikeCopy) return { title: raw, address: '', slogan: sloganMessage.slogan };

  const title = raw
    .replace(address, '')
    .replace(/[:：]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: title || raw, address, slogan: sloganMessage.slogan };
};

const getToastDuration = (type: ToastType, duration: number | undefined, message: unknown): number => {
  if (typeof duration === 'number' && Number.isFinite(duration)) return duration;
  const raw = String(message || '').toLowerCase();
  if (ADDRESS_PATTERN.test(raw) || raw.includes('copied') || raw.includes('sao chép')) return 2200;
  if (type === 'error') return 6000;
  if (type === 'warning') return 4500;
  if (type === 'success') return 2600;
  return 3200;
};

const isKeyedToast = (message: ToastMessage): message is { key: string; vars?: TranslationVars; fallback?: string; category?: 'all' | 'unlock' | 'backup' | 'copy' | 'warning' | 'data' | 'other' } => (
  !!message && typeof message === 'object' && !Array.isArray(message) && typeof (message as { key?: unknown }).key === 'string'
);

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
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

  const style = TOAST_STYLES[toast.type];
  const Icon = TOAST_ICONS[toast.type] || Info;
  const formatted = formatToastMessage(toast.resolvedMessage);
  const messageText = toast.resolvedMessage;

  return (
    <div
      className={`relative max-h-[28dvh] overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-250
        ${style.bg} ${style.border}
        ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}
      style={{ width: 'min(420px, calc(100vw - 28px))', fontSize: 'calc(1rem * var(--app-display-scale, 1))' }}
    >
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5 text-center sm:gap-3 sm:px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <Icon size={17} className={style.icon} />
        </div>
        {formatted.address ? (
          <div className={`min-w-0 overflow-hidden text-center ${style.text}`}>
            {formatted.slogan && (
              <p className="mb-1 truncate text-[0.66em] font-black uppercase tracking-[0.14em] leading-tight text-white/90">
                {formatted.slogan}
              </p>
            )}
            <p className="truncate text-[0.82em] font-semibold leading-tight">{formatted.title}</p>
            <p className="mt-0.5 whitespace-nowrap font-mono font-bold leading-tight text-[clamp(0.56rem,2.55vw,0.78rem)]">
              {formatted.address}
            </p>
          </div>
        ) : (
          <div className={`min-w-0 overflow-hidden text-center ${style.text}`}>
            {formatted.slogan && (
              <p className="mb-1 text-[0.66em] font-black uppercase tracking-[0.14em] leading-tight text-white/90">
                {formatted.slogan}
              </p>
            )}
            <p className="mx-auto overflow-hidden break-words text-center text-[0.82em] font-semibold leading-snug"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: formatted.slogan ? 2 : 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {formatted.title || messageText}
            </p>
          </div>
        )}
        {toast.action ? (
          <button
            onClick={handleAction}
            className="justify-self-end rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[0.72em] font-bold text-white transition-colors hover:bg-white/15"
          >
            {toast.action.label}
          </button>
        ) : (
          <button
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center justify-self-end rounded-full transition-colors hover:bg-white/10"
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const t = useT();

  const showToast = useCallback<ToastContextValue['showToast']>((message, type = 'info', duration, action) => {
    const id = ++toastId;
    const normalizedType = normalizeToastType(type);
    const resolvedMessage = isKeyedToast(message) ? t(message.key, message.vars) || message.fallback || message.key : String(message ?? '');
    const resolvedDuration = getToastDuration(normalizedType, duration, resolvedMessage);
    logActionHistory(resolvedMessage, isKeyedToast(message)
      ? { type: normalizedType, messageKey: message.key, vars: message.vars, category: message.category }
      : normalizedType).catch(() => {});
    setToasts(prev => {
      // Keep max 3 toasts visible
      const limited = prev.length >= 3 ? prev.slice(1) : prev;
      return [...limited, { id, message, resolvedMessage, type: normalizedType, duration: resolvedDuration, action }];
    });
  }, [t]);

  const dismiss = useCallback((id: number) => {
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
