import { useState, useEffect, useRef } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import { Delete, Lock, ShieldCheck, TimerReset } from 'lucide-react';
import { hapticTap } from '../../utils/haptics';
import { useT } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { appendAuditLog } from '../../utils/auditLog';
import { XKEY_SLOGAN } from '../../utils/branding';

const PIN_HASH_KEY = 'xkey_pin_hash';
const PIN_ATTEMPTS_KEY = 'xkey_pin_attempts';
const PIN_LOCKOUT_KEY = 'xkey_pin_lockout_until';
const KILL_SWITCH_KEY = 'xkey_kill_switch';
const DECOY_PIN_HASH_KEY = 'xkey_decoy_pin_hash';
const PIN_LENGTH = 6;

// Lockout tiers: [maxAttempts, lockoutSeconds]
const LOCKOUT_TIERS = [
  { after: 5, lockSeconds: 30 },
  { after: 8, lockSeconds: 300 },
];
const KILL_SWITCH_THRESHOLD = 10;

type PinMode = 'loading' | 'create' | 'confirm' | 'verify';

type PinLockScreenProps = {
  onSuccess: (isDecoy: boolean, options?: { createdPin?: boolean }) => void;
  onSelfDestruct?: () => void;
};

export default function PinLockScreen({ onSuccess, onSelfDestruct }: PinLockScreenProps) {
  const t = useT();
  const { brandReminders } = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<PinMode>('loading');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { value: hash } = await Preferences.get({ key: PIN_HASH_KEY });
      const { value: attemptsStr } = await Preferences.get({ key: PIN_ATTEMPTS_KEY });
      const { value: lockoutStr } = await Preferences.get({ key: PIN_LOCKOUT_KEY });

      const attempts = Number.parseInt(attemptsStr || '', 10) || 0;
      setFailedAttempts(attempts);

      // Check if currently locked out
      if (lockoutStr) {
        const lockUntil = Number.parseInt(lockoutStr, 10);
        const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutRemaining(remaining);
          startCountdown(remaining);
        }
      }

      setMode(hash ? 'verify' : 'create');
    })();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = (seconds: number) => {
    setLockoutRemaining(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const hashPin = (p: string) => CryptoJS.SHA256(p + 'xkey_pin_salt_v1').toString();

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const applyLockout = async (attempts: number) => {
    for (let i = LOCKOUT_TIERS.length - 1; i >= 0; i--) {
      if (attempts >= LOCKOUT_TIERS[i].after) {
        const lockSeconds = LOCKOUT_TIERS[i].lockSeconds;
        const lockUntil = Date.now() + lockSeconds * 1000;
        await Preferences.set({ key: PIN_LOCKOUT_KEY, value: String(lockUntil) });
        startCountdown(lockSeconds);
        return;
      }
    }
  };

  const handlePress = async (digit: string) => {
    if (pin.length >= PIN_LENGTH || lockoutRemaining > 0) return;
    hapticTap();
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === PIN_LENGTH) {
      setTimeout(async () => {
        if (mode === 'create') {
          setConfirmPin(newPin);
          setPin('');
          setMode('confirm');
        } else if (mode === 'confirm') {
          if (newPin === confirmPin) {
            await Preferences.set({ key: PIN_HASH_KEY, value: hashPin(newPin) });
            await Preferences.set({ key: PIN_ATTEMPTS_KEY, value: '0' });
            await appendAuditLog('pin.created');
            onSuccess(false, { createdPin: true });
            setPin('');
          } else {
            triggerShake();
            setError(t('pinLock.pinsNotMatch'));
            setPin('');
            setConfirmPin('');
            setMode('create');
          }
        } else if (mode === 'verify') {
          const { value: stored } = await Preferences.get({ key: PIN_HASH_KEY });
          const { value: decoyStored } = await Preferences.get({ key: DECOY_PIN_HASH_KEY });
          if (hashPin(newPin) === stored) {
            // Reset attempts on success
            await Preferences.set({ key: PIN_ATTEMPTS_KEY, value: '0' });
            await Preferences.remove({ key: PIN_LOCKOUT_KEY });
            await appendAuditLog('pin.unlock_success', { decoy: false });
            onSuccess(false);
            setPin('');
          } else if (decoyStored && hashPin(newPin) === decoyStored) {
            await Preferences.set({ key: PIN_ATTEMPTS_KEY, value: '0' });
            await Preferences.remove({ key: PIN_LOCKOUT_KEY });
            await appendAuditLog('pin.unlock_success', { decoy: true });
            onSuccess(true);
            setPin('');
          } else {
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);
            await Preferences.set({ key: PIN_ATTEMPTS_KEY, value: String(newAttempts) });

            // Check kill switch
            if (newAttempts >= KILL_SWITCH_THRESHOLD) {
              const { value: killEnabled } = await Preferences.get({ key: KILL_SWITCH_KEY });
              if (killEnabled === 'true' && onSelfDestruct) {
                await appendAuditLog('pin.kill_switch_triggered', { attempts: newAttempts });
                onSelfDestruct();
                return;
              }
            }

            // Apply lockout if threshold reached
            await applyLockout(newAttempts);
            await appendAuditLog('pin.unlock_failed', { attempts: newAttempts });

            triggerShake();
            const attemptsLeft = KILL_SWITCH_THRESHOLD - newAttempts;
            setError(t('pinLock.incorrectPin', { attempts: attemptsLeft }));
            setPin('');
          }
        }
      }, 150);
    }
  };

  const handleDelete = () => {
    if (lockoutRemaining > 0) return;
    hapticTap();
    setPin(pin.slice(0, -1));
    setError('');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}`;
  };

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  const isLocked = lockoutRemaining > 0;

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-6 select-none">
      {/* Logo */}
      <img src="/logo.png" alt="xKey" className="w-14 h-14 rounded-xl mb-4 logo-animated" />

      {/* Icon */}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isLocked ? 'bg-red-500/10' : 'bg-brand-500/10'}`}>
        {isLocked
          ? <TimerReset size={26} className="text-red-400" />
          : mode === 'verify'
            ? <Lock size={26} className="text-brand-400" />
            : <ShieldCheck size={26} className="text-brand-400" />
        }
      </div>

      <div className="text-center space-y-2 relative z-10">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {mode === 'verify' ? t('pinLock.enterPin') : mode === 'create' ? t('pinLock.createPin') : t('pinLock.confirmPin')}
        </h2>
        <p className="text-surface-400 text-sm">
          {lockoutRemaining > 0
            ? t('pinLock.tooManyAttempts')
            : t('pinLock.enter6Digits')}
        </p>
        {brandReminders && (
          <p className="mx-auto w-full whitespace-nowrap pt-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-300/80">
            {XKEY_SLOGAN}
          </p>
        )}
      </div>

      {/* PIN dots */}
      <div className={`flex gap-3 mb-6 mt-8 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
              isLocked
                ? 'bg-red-500/30 border border-red-500/50'
                : i < pin.length
                  ? 'bg-brand-500 scale-125 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                  : 'bg-surface-700 border border-surface-600'
            }`}
          />
        ))}
      </div>

      {/* Error / Attempt counter */}
      <div className="h-6 mb-4">
        {lockoutRemaining > 0 ? (
          <p className="text-red-400 text-sm text-center">
            {t('pinLock.tryAgainIn', { seconds: formatTime(lockoutRemaining) })}
          </p>
        ) : error ? (
          <p className="text-red-400 text-sm text-center">{error}</p>
        ) : null}
      </div>

      {/* Keypad */}
      <div className={`grid grid-cols-3 gap-3 w-full max-w-[260px] ${isLocked ? 'opacity-30 pointer-events-none' : ''}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => {
          if (key === null) return <div key={i} />;
          if (key === 'del') {
            return (
              <button key={i} onClick={handleDelete}
                className="h-16 rounded-2xl bg-surface-800/50 hover:bg-surface-700 flex items-center justify-center transition-colors active:scale-95">
                <Delete size={22} className="text-surface-400" />
              </button>
            );
          }
          return (
            <button key={i} onClick={() => handlePress(String(key))}
              className="h-16 rounded-2xl bg-surface-800 hover:bg-surface-700 text-white text-2xl font-semibold transition-all active:scale-95 active:bg-brand-500/20">
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { PIN_HASH_KEY, KILL_SWITCH_KEY, DECOY_PIN_HASH_KEY };
