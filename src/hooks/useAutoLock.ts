import { useEffect, useRef, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { App as CapacitorApp } from '@capacitor/app';

const AUTOLOCK_KEY = 'xkey_autolock_ms';
const DEFAULT_MS = 5 * 60 * 1000; // 5 minutes
const AUTOLOCK_SETTINGS_CHANGED_EVENT = 'xkey-autolock-settings-changed';
const APP_ACTIVITY_EVENT = 'xkey-app-activity';

/**
 * Auto-lock the vault after N minutes of inactivity.
 * Reads timeout from Preferences (configurable in Settings).
 */
export default function useAutoLock(onLock: () => void, enabled = true): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLockRef = useRef(onLock);
  const timeoutRef = useRef(DEFAULT_MS);
  const backgroundAtRef = useRef(0);
  onLockRef.current = onLock;

  const loadTimeout = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: AUTOLOCK_KEY });
      const ms = Number.parseInt(value || '', 10);
      timeoutRef.current = Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_MS;
    } catch {
      timeoutRef.current = DEFAULT_MS;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (enabled) {
      timerRef.current = setTimeout(() => {
        onLockRef.current();
      }, timeoutRef.current);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['touchstart', 'mousemove', 'keydown', 'scroll', 'click'];
    const reloadSettings = async () => {
      await loadTimeout();
      resetTimer();
    };

    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    window.addEventListener(APP_ACTIVITY_EVENT, resetTimer);
    window.addEventListener(AUTOLOCK_SETTINGS_CHANGED_EVENT, reloadSettings);
    const appStateListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        backgroundAtRef.current = Date.now();
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      await loadTimeout();
      const backgroundAt = backgroundAtRef.current;
      backgroundAtRef.current = 0;
      if (backgroundAt && Date.now() - backgroundAt >= timeoutRef.current) {
        onLockRef.current();
      } else {
        resetTimer();
      }
    });
    reloadSettings();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
      window.removeEventListener(APP_ACTIVITY_EVENT, resetTimer);
      window.removeEventListener(AUTOLOCK_SETTINGS_CHANGED_EVENT, reloadSettings);
      appStateListener.then(listener => listener.remove());
    };
  }, [resetTimer, enabled, loadTimeout]);
}

export { AUTOLOCK_KEY, DEFAULT_MS, AUTOLOCK_SETTINGS_CHANGED_EVENT, APP_ACTIVITY_EVENT };
