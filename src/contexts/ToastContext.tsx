import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, type LucideIcon } from 'lucide-react';
import { logActionHistory, type ActionHistoryCategory } from '../utils/actionHistory';
import { useT, type TranslationVars } from './LanguageContext';
import { XKEY_SLOGAN } from '../utils/branding';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastCategory = ActionHistoryCategory;
type KeyedText = {
  key: string;
  vars?: TranslationVars;
  fallback?: string;
};
type ToastCategoryInput = ToastCategory | string;
type ToastAction = {
  label: string | KeyedText;
  onClick?: () => void | Promise<void>;
};
export type ToastMessage = unknown | KeyedText & {
  category?: ToastCategoryInput;
};
type Toast = {
  id: number;
  message: ToastMessage;
  resolvedMessage: string;
  type: ToastType;
  duration: number;
  action?: {
    label: string;
    onClick?: () => void | Promise<void>;
  };
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
  toneClass: string;
  iconClass: string;
}> = {
  success: {
    toneClass: 'toast-surface-success',
    iconClass: 'text-[var(--toast-success-icon)]',
  },
  error: {
    toneClass: 'toast-surface-error',
    iconClass: 'text-[var(--toast-error-icon)]',
  },
  warning: {
    toneClass: 'toast-surface-warning',
    iconClass: 'text-[var(--toast-warning-icon)]',
  },
  info: {
    toneClass: 'toast-surface-info',
    iconClass: 'text-[var(--toast-info-icon)]',
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

const isKeyedText = (value: unknown): value is KeyedText => (
  !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { key?: unknown }).key === 'string'
);

const isKeyedToast = (message: ToastMessage): message is KeyedText & { category?: ToastCategoryInput } => isKeyedText(message);

const normalizeToastCategory = (category: ToastCategoryInput | undefined): ActionHistoryCategory | undefined => (
  category === 'all'
  || category === 'unlock'
  || category === 'backup'
  || category === 'copy'
  || category === 'warning'
  || category === 'data'
  || category === 'other'
    ? category
    : undefined
);

function ToastItem({ toast, onDismiss, closeLabel }: { toast: Toast; onDismiss: (id: number) => void; closeLabel: string }) {
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
      role="status"
      aria-live={toast.type === 'error' || toast.type === 'warning' ? 'assertive' : 'polite'}
      className={`toast-surface relative max-h-[28dvh] overflow-hidden rounded-[var(--toast-radius)] border shadow-[var(--toast-shadow)] backdrop-blur-xl transition-all duration-250
        ${style.toneClass}
        ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}`}
    >
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-1.5 px-2 py-2.5 text-center sm:grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] sm:gap-2 sm:px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--toast-icon-bg)] sm:h-7 sm:w-7">
          <Icon size={15} className={style.iconClass} />
        </div>
        {formatted.address ? (
          <div className="min-w-0 overflow-hidden text-center text-[var(--toast-text)]">
            {formatted.slogan && (
              <p className="mb-1 truncate whitespace-nowrap text-[var(--toast-font-overline)] font-black uppercase tracking-[0.14em] leading-tight text-[var(--toast-slogan)]">
                {formatted.slogan}
              </p>
            )}
            <p className="truncate text-[var(--toast-font-title)] font-semibold leading-tight">{formatted.title}</p>
            <p className="mx-auto mt-0.5 max-w-full whitespace-nowrap text-center font-mono text-[var(--toast-font-address)] font-bold leading-tight tracking-[-0.08em] text-[var(--toast-address)]">
              {formatted.address}
            </p>
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden text-center text-[var(--toast-text)]">
            {formatted.slogan && (
              <p className="mb-1 truncate whitespace-nowrap text-[var(--toast-font-overline)] font-black uppercase tracking-[0.14em] leading-tight text-[var(--toast-slogan)]">
                {formatted.slogan}
              </p>
            )}
            <p
              className="mx-auto overflow-hidden break-words text-center text-[var(--toast-font-title)] font-semibold leading-snug"
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
            className="justify-self-end rounded-lg border border-[var(--toast-action-border)] bg-[var(--toast-action-bg)] px-1.5 py-1.5 text-[var(--toast-font-action)] font-bold text-[var(--toast-action-text)] transition-colors hover:bg-[var(--toast-action-bg-hover)] sm:px-2"
          >
            {toast.action.label}
          </button>
        ) : (
          <button
            onClick={handleDismiss}
            aria-label={closeLabel}
            className="flex h-6 w-6 items-center justify-center justify-self-end rounded-full transition-colors hover:bg-[var(--toast-action-bg-hover)] sm:h-7 sm:w-7"
          >
            <X size={13} className="text-[var(--toast-close)]" />
          </button>
        )}
      </div>
      <div className="h-[2px] w-full bg-[var(--toast-track)]">
        <div
          className="h-full bg-[var(--toast-bar)] transition-none"
          style={{ width: `${progress}%`, opacity: 0.72 }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const t = useT();

  const resolveText = useCallback((value: unknown): string => {
    if (!isKeyedText(value)) return String(value ?? '');
    return t(value.key, value.vars) || value.fallback || value.key;
  }, [t]);

  const showToast = useCallback<ToastContextValue['showToast']>((message, type = 'info', duration, action) => {
    const id = ++toastId;
    const normalizedType = normalizeToastType(type);
    const resolvedMessage = resolveText(message);
    const resolvedDuration = getToastDuration(normalizedType, duration, resolvedMessage);
    const resolvedAction = action ? { ...action, label: resolveText(action.label) } : undefined;

    logActionHistory(resolvedMessage, isKeyedToast(message)
      ? { type: normalizedType, messageKey: message.key, vars: message.vars, category: normalizeToastCategory(message.category) }
      : normalizedType).catch(() => {});

    setToasts(prev => {
      const limited = prev.length >= 3 ? prev.slice(1) : prev;
      return [...limited, { id, message, resolvedMessage, type: normalizedType, duration: resolvedDuration, action: resolvedAction }];
    });
  }, [resolveText]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  const closeLabel = t('common.close');

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed left-0 right-0 z-[200] flex flex-col items-center gap-2 px-3"
        style={{ top: 'max(env(safe-area-inset-top, 0px), 0px)', paddingTop: 12 }}
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto flex w-full justify-center">
            <ToastItem toast={t} onDismiss={dismiss} closeLabel={closeLabel} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}