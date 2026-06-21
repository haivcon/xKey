import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Settings, ShieldCheck } from 'lucide-react';
import { hapticTap } from '../utils/haptics';
import { useT } from '../contexts/LanguageContext';
import { isDeviceCredentialAvailable, openDeviceSecuritySettings } from '../utils/deviceCredential';
import { appendAuditLog } from '../utils/auditLog';

type DeviceUnlockScreenProps = {
  onUnlock: () => Promise<void>;
};

const getErrorField = (error: unknown, field: 'code' | 'message'): string => {
  if (!error || typeof error !== 'object') return '';
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
};

export default function DeviceUnlockScreen({ onUnlock }: DeviceUnlockScreenProps) {
  const t = useT();
  const [unlocking, setUnlocking] = useState(false);
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const unlockingRef = useRef(false);
  const autoPromptedRef = useRef(false);
  const openedSettingsRef = useRef(false);

  const unlock = useCallback(async () => {
    if (unlockingRef.current) return;
    unlockingRef.current = true;
    setUnlocking(true);
    setError('');
    setHint('');
    try {
      await onUnlock();
      await appendAuditLog('device.unlock_success');
    } catch (err) {
      const code = getErrorField(err, 'code');
      const rawMessage = getErrorField(err, 'message');
      const message = rawMessage.toLowerCase();
      if (code === 'VAULT_KEY_UNRECOVERABLE' || message.includes('unable to unlock the existing vault')) {
        setError(t('deviceUnlock.unrecoverableTitle'));
        setHint(t('deviceUnlock.unrecoverableBody'));
      } else if (message.includes('cancel')) {
        setError(t('deviceUnlock.authCanceled'));
        setHint(t('deviceUnlock.tryAgainHint'));
      } else {
        setError(t('deviceUnlock.unlockFailed'));
        setHint(t('deviceUnlock.tryAgainHint'));
      }
      await appendAuditLog('device.unlock_failed', { code, message: rawMessage });
    } finally {
      unlockingRef.current = false;
      setUnlocking(false);
    }
  }, [onUnlock, t]);

  const openSettings = async () => {
    hapticTap();
    setError('');
    setHint('');
    openedSettingsRef.current = true;
    try {
      await openDeviceSecuritySettings();
    } catch {
      setError(t('deviceUnlock.settingsError'));
    }
  };

  const checkAvailability = useCallback(async (autoUnlock = false) => {
    setChecking(true);
    const ok = await isDeviceCredentialAvailable();
    setAvailable(ok);
    setChecking(false);
    if (ok) {
      setError('');
      setHint('');
    }
    if (ok && (autoUnlock || openedSettingsRef.current) && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      openedSettingsRef.current = false;
      setTimeout(() => unlock(), 150);
    }
  }, [unlock]);

  useEffect(() => {
    checkAvailability(true);
  }, [checkAvailability]);

  useEffect(() => {
    const handleFocus = () => {
      if (unlockingRef.current || document.visibilityState === 'hidden') return;
      checkAvailability(false);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [checkAvailability]);

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-6 select-none">
      <img src="/logo.png" alt="xKey" className="w-14 h-14 rounded-xl mb-4 logo-animated" />
      <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
        <Lock size={26} className="text-brand-400" />
      </div>
      <div className="text-center space-y-2 max-w-xs">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {t('deviceUnlock.title')}
        </h2>
        <p className="text-surface-400 text-sm">
          {checking
            ? t('deviceUnlock.checking')
            : available
              ? t('deviceUnlock.subtitle')
              : t('deviceUnlock.setupRequired')}
        </p>
      </div>
      {!checking && !available && (
        <div className="device-setup-note mt-6 max-w-sm rounded-2xl border p-4 text-left">
          <p className="device-setup-note-title text-sm font-semibold">{t('deviceUnlock.setupTitle')}</p>
          <p className="device-setup-note-body mt-2 text-sm leading-relaxed">{t('deviceUnlock.setupBody')}</p>
        </div>
      )}
      {!checking && available && !error && (
        <div className="mt-6 max-w-sm rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-left">
          <p className="text-sm font-semibold text-brand-300">{t('deviceUnlock.readyTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-surface-300">{t('deviceUnlock.readyBody')}</p>
        </div>
      )}
      {error && (
        <div className="device-error-note mt-6 max-w-sm rounded-2xl border p-4 text-left">
          <p className="device-error-note-title text-sm font-semibold">{error}</p>
          {hint && <p className="device-error-note-body mt-2 text-sm leading-relaxed">{hint}</p>}
        </div>
      )}
      {available ? (
        <button
          type="button"
          onClick={() => { hapticTap(); unlock(); }}
          disabled={unlocking || checking}
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-8 py-4 text-base font-semibold !text-white shadow-lg shadow-brand-500/20 transition active:scale-95 disabled:opacity-60"
        >
          <ShieldCheck size={20} />
          {unlocking ? t('deviceUnlock.unlocking') : t('deviceUnlock.unlockButton')}
        </button>
      ) : (
        <button
          type="button"
          onClick={openSettings}
          disabled={checking}
          className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-8 py-4 text-base font-semibold !text-white shadow-lg shadow-brand-500/20 transition active:scale-95 disabled:opacity-60"
        >
          <Settings size={20} />
          {t('deviceUnlock.openSettings')}
        </button>
      )}
    </div>
  );
}
