import { useEffect, useRef, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as CapacitorApp } from '@capacitor/app';
import { appendAuditLog } from '../../utils/auditLog';

const AUTOLOCK_KEY = 'xkey_autolock_ms';
const AUTOLOCK_ENABLED_KEY = 'xkey_autolock_enabled';
const DEFAULT_MS = 5 * 60 * 1000; // 5 minutes
const AUTOLOCK_SETTINGS_CHANGED_EVENT = 'xkey-autolock-settings-changed';
const APP_ACTIVITY_EVENT = 'xkey-app-activity';

const AUTOLOCK_BACKGROUND_KEY = 'xkey_autolock_background_ms';
const AUTOLOCK_BLUR_KEY = 'xkey_autolock_blur_ms';
const AUTOLOCK_AFTER_REVEAL_KEY = 'xkey_autolock_after_reveal_ms';
const AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY = 'xkey_autolock_after_secret_copy';
const AUTOLOCK_SCREEN_OFF_LOCK_KEY = 'xkey_autolock_screen_off';
const AUTOLOCK_PRESET_KEY = 'xkey_autolock_preset';

const SECRET_REVEALED_EVENT = 'xkey-secret-revealed';
const SECRET_COPIED_EVENT = 'xkey-secret-copied';

type AutoLockPreset = 'balanced' | 'strict' | 'paranoid' | 'custom';
type BuiltInAutoLockPreset = Exclude<AutoLockPreset, 'custom'>;
type LockReason = 'idle' | 'background' | 'blur' | 'afterReveal' | 'afterSecretCopy' | 'screenOff';

type ContextAutoLockSettings = {
  enabled: boolean;
  idleMs: number;
  backgroundMs: number;
  blurMs: number;
  afterRevealMs: number;
  lockAfterSecretCopy: boolean;
  screenOffLock: boolean;
  preset: AutoLockPreset;
};

const PRESET_SETTINGS: Record<BuiltInAutoLockPreset, Omit<ContextAutoLockSettings, 'enabled' | 'idleMs' | 'preset'>> = {
  balanced: {
    backgroundMs: 30 * 1000,
    blurMs: 15 * 1000,
    afterRevealMs: 30 * 1000,
    lockAfterSecretCopy: false,
    screenOffLock: true,
  },
  strict: {
    backgroundMs: 5 * 1000,
    blurMs: 5 * 1000,
    afterRevealMs: 15 * 1000,
    lockAfterSecretCopy: true,
    screenOffLock: true,
  },
  paranoid: {
    backgroundMs: 0,
    blurMs: 0,
    afterRevealMs: 5 * 1000,
    lockAfterSecretCopy: true,
    screenOffLock: true,
  },
};

const DEFAULT_PRESET: BuiltInAutoLockPreset = 'balanced';
const CONTEXT_AUTOLOCK_PRESETS: AutoLockPreset[] = [...(Object.keys(PRESET_SETTINGS) as BuiltInAutoLockPreset[]), 'custom'];

const parseStoredMs = (value: string | null | undefined, fallback: number, min = 0, max = 24 * 60 * 60 * 1000) => {
  const ms = Number.parseInt(value || '', 10);
  return Number.isFinite(ms) && ms >= min && ms <= max ? ms : fallback;
};

const parsePreset = (value: string | null | undefined): AutoLockPreset => (
  value === 'strict' || value === 'paranoid' || value === 'balanced' || value === 'custom' ? value : DEFAULT_PRESET
);

/**
 * Auto-lock the vault after inactivity and high-risk app lifecycle events.
 * Reads timeout from Preferences (configurable in Settings).
 */
export default function useAutoLock(onLock: () => void, enabled = true): void {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLockRef = useRef(onLock);
  const settingsRef = useRef<ContextAutoLockSettings>({
    enabled: false,
    idleMs: DEFAULT_MS,
    preset: DEFAULT_PRESET,
    ...PRESET_SETTINGS[DEFAULT_PRESET],
    lockAfterSecretCopy: false,
    screenOffLock: false,
  });
  const backgroundAtRef = useRef(0);
  const blurAtRef = useRef(0);
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);
  onLockRef.current = onLock;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const clearContextTimer = useCallback(() => {
    if (contextTimerRef.current) {
      clearTimeout(contextTimerRef.current);
      contextTimerRef.current = null;
    }
  }, []);

  const lockNow = useCallback((reason: LockReason) => {
    if (!enabled || lockedRef.current) return;
    lockedRef.current = true;
    clearIdleTimer();
    clearRevealTimer();
    clearContextTimer();
    window.dispatchEvent(new CustomEvent('xkey-autolock-fired', { detail: { reason } }));
    void appendAuditLog('app.auto_lock', {
      reason,
      preset: settingsRef.current.preset,
      idleMs: settingsRef.current.idleMs,
      backgroundMs: settingsRef.current.backgroundMs,
      blurMs: settingsRef.current.blurMs,
      afterRevealMs: settingsRef.current.afterRevealMs,
      lockAfterSecretCopy: settingsRef.current.lockAfterSecretCopy,
      screenOffLock: settingsRef.current.screenOffLock,
    });
    onLockRef.current();
  }, [clearContextTimer, clearIdleTimer, clearRevealTimer, enabled]);

  const loadSettings = useCallback(async () => {
    try {
      const [
        { value: enabledValue },
        { value: idleValue },
        { value: presetValue },
        { value: backgroundValue },
        { value: blurValue },
        { value: afterRevealValue },
        { value: copyValue },
        { value: screenOffValue },
      ] = await Promise.all([
        Preferences.get({ key: AUTOLOCK_ENABLED_KEY }),
        Preferences.get({ key: AUTOLOCK_KEY }),
        Preferences.get({ key: AUTOLOCK_PRESET_KEY }),
        Preferences.get({ key: AUTOLOCK_BACKGROUND_KEY }),
        Preferences.get({ key: AUTOLOCK_BLUR_KEY }),
        Preferences.get({ key: AUTOLOCK_AFTER_REVEAL_KEY }),
        Preferences.get({ key: AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY }),
        Preferences.get({ key: AUTOLOCK_SCREEN_OFF_LOCK_KEY }),
      ]);

      const autolockEnabled = enabledValue === 'true';
      const preset = parsePreset(presetValue);
      const idleMs = parseStoredMs(idleValue, DEFAULT_MS, 60 * 1000);
      const usesContextTimings = preset === 'strict' || preset === 'paranoid' || preset === 'custom';
      const presetDefaults = preset === 'custom' ? PRESET_SETTINGS[DEFAULT_PRESET] : PRESET_SETTINGS[preset];
      const unifiedMs = idleMs;

      settingsRef.current = {
        enabled: autolockEnabled,
        idleMs,
        preset,
        backgroundMs: autolockEnabled && usesContextTimings ? parseStoredMs(backgroundValue, presetDefaults.backgroundMs) : unifiedMs,
        blurMs: autolockEnabled && usesContextTimings ? parseStoredMs(blurValue, presetDefaults.blurMs) : unifiedMs,
        afterRevealMs: autolockEnabled && usesContextTimings ? parseStoredMs(afterRevealValue, presetDefaults.afterRevealMs) : unifiedMs,
        lockAfterSecretCopy: autolockEnabled && usesContextTimings && (copyValue === null ? presetDefaults.lockAfterSecretCopy : copyValue === 'true'),
        screenOffLock: autolockEnabled && usesContextTimings && (screenOffValue === null ? presetDefaults.screenOffLock : screenOffValue === 'true'),
      };
    } catch {
      settingsRef.current = {
        enabled: false,
        idleMs: DEFAULT_MS,
        preset: DEFAULT_PRESET,
        ...PRESET_SETTINGS[DEFAULT_PRESET],
        lockAfterSecretCopy: false,
        screenOffLock: false,
      };
    }
  }, []);

  const resetTimer = useCallback(() => {
    lockedRef.current = false;
    clearContextTimer();
    clearIdleTimer();
    if (enabled && settingsRef.current.enabled) {
      idleTimerRef.current = setTimeout(() => lockNow('idle'), settingsRef.current.idleMs);
    }
  }, [clearContextTimer, clearIdleTimer, enabled, lockNow]);

  const scheduleContextLock = useCallback((reason: LockReason, ms: number) => {
    if (!enabled || !settingsRef.current.enabled) return;
    if (ms <= 0) {
      lockNow(reason);
      return;
    }
    clearContextTimer();
    clearIdleTimer();
    contextTimerRef.current = setTimeout(() => lockNow(reason), ms);
  }, [clearContextTimer, clearIdleTimer, enabled, lockNow]);

  useEffect(() => {
    if (!enabled) {
      lockedRef.current = false;
      clearIdleTimer();
      clearRevealTimer();
      clearContextTimer();
      return undefined;
    }

    const events = ['touchstart', 'mousemove', 'keydown', 'scroll', 'click'];
    const reloadSettings = async () => {
      await loadSettings();
      resetTimer();
    };

    const handleActivity = () => {
      resetTimer();
    };

    const handleVisibilityChange = () => {
      if (!settingsRef.current.enabled) return;
      if (document.visibilityState === 'hidden') {
        blurAtRef.current = Date.now();
        scheduleContextLock('blur', settingsRef.current.blurMs);
        return;
      }

      const hiddenAt = blurAtRef.current;
      blurAtRef.current = 0;
      if (hiddenAt && Date.now() - hiddenAt >= settingsRef.current.blurMs) {
        lockNow('blur');
      } else {
        resetTimer();
      }
    };

    const handleBlur = () => {
      if (!settingsRef.current.enabled) return;
      blurAtRef.current = Date.now();
      scheduleContextLock('blur', settingsRef.current.blurMs);
    };

    const handleFocus = () => {
      if (!settingsRef.current.enabled) return;
      const blurredAt = blurAtRef.current;
      blurAtRef.current = 0;
      if (blurredAt && Date.now() - blurredAt >= settingsRef.current.blurMs) {
        lockNow('blur');
      } else {
        resetTimer();
      }
    };

    const handleSecretRevealed = () => {
      if (!settingsRef.current.enabled) return;
      clearRevealTimer();
      const revealMs = settingsRef.current.afterRevealMs;
      if (revealMs <= 0) {
        lockNow('afterReveal');
        return;
      }
      revealTimerRef.current = setTimeout(() => lockNow('afterReveal'), revealMs);
    };

    const handleSecretCopied = () => {
      if (!settingsRef.current.enabled) return;
      if (settingsRef.current.lockAfterSecretCopy) lockNow('afterSecretCopy');
      else resetTimer();
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    window.addEventListener(APP_ACTIVITY_EVENT, handleActivity);
    window.addEventListener(AUTOLOCK_SETTINGS_CHANGED_EVENT, reloadSettings);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener(SECRET_REVEALED_EVENT, handleSecretRevealed);
    window.addEventListener(SECRET_COPIED_EVENT, handleSecretCopied);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const appStateListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        if (!settingsRef.current.enabled) return;
        backgroundAtRef.current = Date.now();
        const reason: LockReason = settingsRef.current.screenOffLock ? 'screenOff' : 'background';
        scheduleContextLock(reason, settingsRef.current.backgroundMs);
        return;
      }

      await loadSettings();
      const backgroundAt = backgroundAtRef.current;
      backgroundAtRef.current = 0;
      if (backgroundAt && Date.now() - backgroundAt >= settingsRef.current.backgroundMs) {
        lockNow(settingsRef.current.screenOffLock ? 'screenOff' : 'background');
      } else {
        resetTimer();
      }
    });

    reloadSettings();

    return () => {
      clearIdleTimer();
      clearRevealTimer();
      clearContextTimer();
      events.forEach(e => window.removeEventListener(e, handleActivity));
      window.removeEventListener(APP_ACTIVITY_EVENT, handleActivity);
      window.removeEventListener(AUTOLOCK_SETTINGS_CHANGED_EVENT, reloadSettings);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(SECRET_REVEALED_EVENT, handleSecretRevealed);
      window.removeEventListener(SECRET_COPIED_EVENT, handleSecretCopied);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      appStateListener.then(listener => listener.remove());
    };
  }, [clearContextTimer, clearIdleTimer, clearRevealTimer, enabled, loadSettings, lockNow, resetTimer, scheduleContextLock]);
}

export {
  AUTOLOCK_KEY,
  AUTOLOCK_ENABLED_KEY,
  DEFAULT_MS,
  AUTOLOCK_SETTINGS_CHANGED_EVENT,
  APP_ACTIVITY_EVENT,
  AUTOLOCK_BACKGROUND_KEY,
  AUTOLOCK_BLUR_KEY,
  AUTOLOCK_AFTER_REVEAL_KEY,
  AUTOLOCK_LOCK_AFTER_SECRET_COPY_KEY,
  AUTOLOCK_SCREEN_OFF_LOCK_KEY,
  AUTOLOCK_PRESET_KEY,
  SECRET_REVEALED_EVENT,
  SECRET_COPIED_EVENT,
  PRESET_SETTINGS,
  CONTEXT_AUTOLOCK_PRESETS,
  type AutoLockPreset,
  type BuiltInAutoLockPreset,
  type ContextAutoLockSettings,
};