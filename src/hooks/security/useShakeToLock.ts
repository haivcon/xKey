import { useState, useEffect, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { hapticSuccess } from '../../utils/haptics';

export const SHAKE_TO_LOCK_KEY = 'xkey_shake_to_lock';
export const SHAKE_SENSITIVITY_KEY = 'xkey_shake_sensitivity';
export const SHAKE_SETTINGS_CHANGED_EVENT = 'xkey-shake-settings-changed';

export const requestMotionPermission = async (): Promise<boolean> => {
  if (typeof DeviceMotionEvent === 'undefined') return false;
  const motionEvent = DeviceMotionEvent as typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<PermissionState>;
  };
  if (typeof motionEvent.requestPermission !== 'function') return true;

  try {
    const result = await motionEvent.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
};

/**
 * Hook that manages:
 * 1. App Switcher Privacy (blur when app goes to background)
 * 2. Shake to Lock (accelerometer-based instant lock)
 */
type MotionSnapshot = { x: number; y: number; z: number };

export default function useShakeToLock(
  needsPinAuth: boolean,
  vaultLoading: boolean,
  setNeedsPinAuth: Dispatch<SetStateAction<boolean>>,
  enabled = true,
): boolean {
  const [isAppActive, setIsAppActive] = useState(true);
  const needsPinAuthRef = useRef(needsPinAuth);
  const vaultLoadingRef = useRef(vaultLoading);
  const enabledRef = useRef(enabled);
  const shakeEnabledRef = useRef(false);
  const thresholdRef = useRef(15);
  const lastMotionRef = useRef<MotionSnapshot | null>(null);
  const lastLockAtRef = useRef(0);

  needsPinAuthRef.current = needsPinAuth;
  vaultLoadingRef.current = vaultLoading;
  enabledRef.current = enabled;

  const loadShakeSettings = useCallback(async () => {
    const { value: en } = await Preferences.get({ key: SHAKE_TO_LOCK_KEY });
    shakeEnabledRef.current = en === 'true';
    const { value: sens } = await Preferences.get({ key: SHAKE_SENSITIVITY_KEY });
    const parsed = Number(sens);
    thresholdRef.current = Number.isFinite(parsed) ? parsed : 15;
    lastMotionRef.current = null;
  }, []);

  useEffect(() => {
    // 1. App Switcher Privacy
    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      setIsAppActive(isActive);
    });

    loadShakeSettings();
    const shakeStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) loadShakeSettings();
    });

    const handleMotion = (e: DeviceMotionEvent) => {
      const acceleration = e.accelerationIncludingGravity || e.acceleration;
      if (!enabledRef.current || !shakeEnabledRef.current || needsPinAuthRef.current || vaultLoadingRef.current || !acceleration) return;

      const x = Number(acceleration.x) || 0;
      const y = Number(acceleration.y) || 0;
      const z = Number(acceleration.z) || 0;
      const last = lastMotionRef.current;
      lastMotionRef.current = { x, y, z };
      if (!last) return;

      const delta = Math.abs(last.x - x) + Math.abs(last.y - y) + Math.abs(last.z - z);
      const now = Date.now();
      if (delta > thresholdRef.current && now - lastLockAtRef.current > 1500) {
          lastLockAtRef.current = now;
          lastMotionRef.current = null;
          setNeedsPinAuth(true);
          hapticSuccess();
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener(SHAKE_SETTINGS_CHANGED_EVENT, loadShakeSettings);

    return () => {
      stateListener.then(l => l.remove());
      shakeStateListener.then(l => l.remove());
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener(SHAKE_SETTINGS_CHANGED_EVENT, loadShakeSettings);
    };
  }, [loadShakeSettings, setNeedsPinAuth]);

  return isAppActive;
}
