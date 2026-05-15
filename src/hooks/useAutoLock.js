import { useEffect, useRef, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';

const AUTOLOCK_KEY = 'xkey_autolock_ms';
const DEFAULT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Auto-lock the vault after N minutes of inactivity.
 * Reads timeout from Preferences (configurable in Settings).
 */
export default function useAutoLock(onLock, enabled = true) {
  const timerRef = useRef(null);
  const onLockRef = useRef(onLock);
  const timeoutRef = useRef(DEFAULT_MS);
  onLockRef.current = onLock;

  // Load saved timeout on mount
  useEffect(() => {
    Preferences.get({ key: AUTOLOCK_KEY }).then(({ value }) => {
      if (value) {
        const ms = parseInt(value);
        if (ms > 0) timeoutRef.current = ms;
      }
    }).catch(() => {});
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
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start on mount

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, enabled]);
}

export { AUTOLOCK_KEY, DEFAULT_MS };
