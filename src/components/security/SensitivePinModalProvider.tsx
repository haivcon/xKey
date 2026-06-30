import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { appendAuditLog } from '../../utils/auditLog';
import { hapticTap } from '../../utils/haptics';
import { useT } from '../../contexts/LanguageContext';
import {
  getSensitivePinAttempts,
  getSensitivePinLockUntil,
  getSensitivePinRemainingAttempts,
  isSensitivePinEnabled,
  verifySensitivePin,
} from '../../features/security/sensitivePin';
import { setSensitivePinPromptRequester } from '../../features/security/sensitivePinPrompt';

type SensitivePinRequest = {
  reason?: string;
  title?: string;
};

type SensitivePinState = Required<SensitivePinRequest> & {
  resolve: (answer: boolean) => void;
};

type SensitivePinContextValue = (request?: SensitivePinRequest | string) => Promise<boolean>;

const SensitivePinModalContext = createContext<SensitivePinContextValue | null>(null);

export function useSensitivePinPrompt(): SensitivePinContextValue {
  const ctx = useContext(SensitivePinModalContext);
  if (!ctx) throw new Error('useSensitivePinPrompt must be used within SensitivePinModalProvider');
  return ctx;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function PinDots({ value }: { value: string }) {
  return (
    <div className="grid grid-cols-6 gap-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => {
        const filled = index < value.length;
        const active = index === value.length;
        return (
          <div
            key={index}
            className={`flex h-12 items-center justify-center rounded-2xl border transition-all ${
              filled
                ? 'border-brand-400 bg-brand-500/15 shadow-[0_0_24px_rgba(14,165,233,0.18)]'
                : active
                  ? 'border-brand-500/70 bg-surface-800'
                  : 'border-surface-700 bg-surface-900'
            }`}
          >
            <span className={`h-3 w-3 rounded-full transition-all ${filled ? 'scale-100 bg-brand-300' : 'scale-75 bg-surface-700'}`} />
          </div>
        );
      })}
    </div>
  );
}

function SensitivePinModal({ state, onClose }: { state: SensitivePinState | null; onClose: (answer: boolean) => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(5);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const locked = lockedUntil > now;
  const lockRemaining = Math.max(0, lockedUntil - now);

  const resetMeta = useCallback(async () => {
    const [attempts, lockUntil] = await Promise.all([
      getSensitivePinAttempts(),
      getSensitivePinLockUntil(),
    ]);
    setRemaining(getSensitivePinRemainingAttempts(attempts));
    setLockedUntil(lockUntil);
  }, []);

  useEffect(() => {
    if (!state) return;
    setPin('');
    setError('');
    setBusy(false);
    resetMeta();
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(focusTimer);
  }, [resetMeta, state]);

  useEffect(() => {
    if (!state || !locked) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [locked, state]);

  const submit = async () => {
    if (!state || busy || locked) return;
    const normalized = pin.replace(/\D/g, '').slice(0, 6);
    if (normalized.length !== 6) {
      setError(t('pinLock.enter6Digits', { default: 'Nhập đủ 6 chữ số.' }));
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setError('');
    try {
      const ok = await verifySensitivePin(normalized);
      if (ok) {
        hapticTap();
        onClose(true);
        return;
      }

      await resetMeta();
      setPin('');
      setError(t('settings.sensitivePinWrong', { default: 'PIN thao tác nhạy cảm không đúng.' }));
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;

  return (
    <div className="app-scaled-icons fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md animate-slide-down sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sensitive-pin-title"
        className="w-full max-w-[min(92dvw,30rem)] overflow-hidden rounded-3xl border border-brand-500/20 bg-surface-950 shadow-[0_24px_90px_rgba(14,165,233,0.18)]"
      >
        <div className="relative overflow-hidden border-b border-surface-800 p-5">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-400/25 bg-brand-500/10">
                <ShieldCheck size={23} className="text-brand-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-brand-300">
                  {t('settings.sensitivePinModalEyebrow', { default: 'Xác minh thao tác nhạy cảm' })}
                </p>
                <h3 id="sensitive-pin-title" className="mt-1 text-lg font-bold leading-snug text-white">
                  {state.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-surface-300">{state.reason}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-surface-400 transition-colors hover:bg-surface-800 hover:text-white"
              aria-label={t('common.cancel')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-surface-800 bg-surface-900/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-surface-100">
                <LockKeyhole size={17} className="text-brand-300" />
                {t('settings.sensitivePinEnterTitle', { default: 'Nhập PIN phụ 6 chữ số' })}
              </div>
              <span className={`rounded-full px-2 py-1 text-[0.65rem] font-bold ${locked ? 'bg-red-500/15 text-red-300' : 'bg-surface-800 text-surface-400'}`}>
                {locked
                  ? t('settings.sensitivePinLockedShort', { default: 'Đang khóa' })
                  : t('settings.sensitivePinAttemptsLeft', { count: remaining, default: `Còn ${remaining} lần` })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="block w-full"
              disabled={busy || locked}
            >
              <PinDots value={pin} />
            </button>

            <input
              ref={inputRef}
              value={pin}
              onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={event => {
                if (event.key === 'Enter') submit();
                if (event.key === 'Escape') onClose(false);
              }}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={busy || locked}
              className="sr-only"
              aria-label={t('settings.sensitivePinEnterTitle', { default: 'Nhập PIN phụ 6 chữ số' })}
            />

            {locked ? (
              <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {t('settings.sensitivePinLockedMessage', {
                  seconds: Math.ceil(lockRemaining / 1000),
                  default: `PIN phụ đang bị khóa tạm thời. Thử lại sau ${formatCountdown(lockRemaining)}.`,
                })}
              </p>
            ) : error ? (
              <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-surface-500">
                {t('settings.sensitivePinModalHint', { default: 'PIN này tách biệt với PIN mở khóa ứng dụng và chỉ dùng cho các thao tác có rủi ro cao.' })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onClose(false)}
              disabled={busy}
              className="btn-glow rounded-xl border border-surface-700 bg-surface-800 px-4 py-3 text-sm font-semibold text-surface-200 transition-colors hover:bg-surface-700 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || locked || pin.length !== 6}
              className="btn-glow rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? t('common.processing', { default: 'Đang xử lý...' }) : t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SensitivePinModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SensitivePinState | null>(null);
  const t = useT();

  const requestPin = useCallback<SensitivePinContextValue>(async request => {
    if (!await isSensitivePinEnabled()) return true;

    const normalized = typeof request === 'string' ? { reason: request } : request;
    return new Promise(resolve => {
      setState({
        reason: normalized?.reason || t('settings.sensitivePinDefaultReason', { default: 'Xác nhận thao tác nhạy cảm' }),
        title: normalized?.title || t('settings.sensitivePinModalTitle', { default: 'Cần PIN phụ' }),
        resolve,
      });
    });
  }, [t]);

  useEffect(() => {
    setSensitivePinPromptRequester(requestPin);
    return () => {
      setSensitivePinPromptRequester(null);
    };
  }, [requestPin]);

  const handleClose = useCallback((answer: boolean) => {
    if (!answer) appendAuditLog('security.sensitive_pin_cancelled').catch(() => {});
    state?.resolve(answer);
    setState(null);
  }, [state]);

  const value = useMemo(() => requestPin, [requestPin]);

  return (
    <SensitivePinModalContext.Provider value={value}>
      {children}
      <SensitivePinModal state={state} onClose={handleClose} />
    </SensitivePinModalContext.Provider>
  );
}