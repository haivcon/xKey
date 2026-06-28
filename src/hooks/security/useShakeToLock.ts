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

export type ShakeSensorHealth = 'healthy' | 'no-data' | 'stuck' | 'unstable' | 'unsupported' | 'denied';

export type ShakeSensorTestResult = {
  status: ShakeSensorHealth;
  sampleCount: number;
  maxDelta: number;
  averageDelta: number;
  recommendation?: 'keep' | 'lower-sensitivity' | 'disable';
};

const DEFAULT_SHAKE_THRESHOLD = 18;
const UNLOCK_GRACE_MS = 4000;
const LOCK_COOLDOWN_MS = 2500;
const SHAKE_WINDOW_MS = 900;
const REQUIRED_SHAKE_HITS = 2;
const MAX_PLAUSIBLE_DELTA = 120;
const SENSOR_TEST_MS = 4000;
const SENSOR_MIN_SAMPLES = 8;
const SENSOR_STUCK_DELTA = 0.35;
const SENSOR_UNSTABLE_AVG_DELTA = 10;
const SENSOR_UNSTABLE_MAX_DELTA = 45;

const readMotionSnapshot = (e: DeviceMotionEvent): MotionSnapshot | null => {
  const acceleration = e.accelerationIncludingGravity || e.acceleration;
  if (!acceleration) return null;

  const x = Number(acceleration.x);
  const y = Number(acceleration.y);
  const z = Number(acceleration.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  return { x, y, z };
};

const calculateDelta = (last: MotionSnapshot, current: MotionSnapshot) => (
  Math.abs(last.x - current.x) + Math.abs(last.y - current.y) + Math.abs(last.z - current.z)
);

export const testShakeSensor = async (durationMs = SENSOR_TEST_MS): Promise<ShakeSensorTestResult> => {
  if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') {
    return { status: 'unsupported', sampleCount: 0, maxDelta: 0, averageDelta: 0, recommendation: 'disable' };
  }

  const hasPermission = await requestMotionPermission();
  if (!hasPermission) {
    return { status: 'denied', sampleCount: 0, maxDelta: 0, averageDelta: 0, recommendation: 'disable' };
  }

  return new Promise(resolve => {
    const samples: MotionSnapshot[] = [];
    const deltas: number[] = [];
    let last: MotionSnapshot | null = null;

    const handleMotion = (e: DeviceMotionEvent) => {
      const snapshot = readMotionSnapshot(e);
      if (!snapshot) return;
      samples.push(snapshot);
      if (last) deltas.push(calculateDelta(last, snapshot));
      last = snapshot;
    };

    const finish = () => {
      window.removeEventListener('devicemotion', handleMotion);
      const sampleCount = samples.length;
      const maxDelta = deltas.length ? Math.max(...deltas) : 0;
      const averageDelta = deltas.length ? deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length : 0;

      if (sampleCount < SENSOR_MIN_SAMPLES) {
        resolve({ status: 'no-data', sampleCount, maxDelta, averageDelta, recommendation: 'disable' });
        return;
      }

      if (maxDelta < SENSOR_STUCK_DELTA) {
        resolve({ status: 'stuck', sampleCount, maxDelta, averageDelta, recommendation: 'disable' });
        return;
      }

      if (averageDelta > SENSOR_UNSTABLE_AVG_DELTA || maxDelta > SENSOR_UNSTABLE_MAX_DELTA) {
        resolve({ status: 'unstable', sampleCount, maxDelta, averageDelta, recommendation: 'lower-sensitivity' });
        return;
      }

      resolve({ status: 'healthy', sampleCount, maxDelta, averageDelta, recommendation: 'keep' });
    };

    window.addEventListener('devicemotion', handleMotion);
    window.setTimeout(finish, durationMs);
  });
};


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
  const thresholdRef = useRef(DEFAULT_SHAKE_THRESHOLD);
  const lastMotionRef = useRef<MotionSnapshot | null>(null);
  const lastLockAtRef = useRef(0);
  const ignoreMotionUntilRef = useRef(Date.now() + UNLOCK_GRACE_MS);
  const shakeHitsRef = useRef<number[]>([]);
  const previousNeedsPinAuthRef = useRef(needsPinAuth);

  needsPinAuthRef.current = needsPinAuth;
  vaultLoadingRef.current = vaultLoading;
  enabledRef.current = enabled;

  useEffect(() => {
    if (previousNeedsPinAuthRef.current && !needsPinAuth) {
      ignoreMotionUntilRef.current = Date.now() + UNLOCK_GRACE_MS;
      lastMotionRef.current = null;
      shakeHitsRef.current = [];
    }
    previousNeedsPinAuthRef.current = needsPinAuth;
  }, [needsPinAuth]);

  const loadShakeSettings = useCallback(async () => {
    const { value: en } = await Preferences.get({ key: SHAKE_TO_LOCK_KEY });
    shakeEnabledRef.current = en === 'true';
    const { value: sens } = await Preferences.get({ key: SHAKE_SENSITIVITY_KEY });
    const parsed = Number(sens);
    thresholdRef.current = Number.isFinite(parsed) ? parsed : DEFAULT_SHAKE_THRESHOLD;
    lastMotionRef.current = null;
    shakeHitsRef.current = [];
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
      const now = Date.now();
      const snapshot = readMotionSnapshot(e);
      if (!enabledRef.current || !shakeEnabledRef.current || needsPinAuthRef.current || vaultLoadingRef.current || !snapshot) return;

      if (now < ignoreMotionUntilRef.current || now - lastLockAtRef.current < LOCK_COOLDOWN_MS) {
        lastMotionRef.current = snapshot;
        shakeHitsRef.current = [];
        return;
      }

      const last = lastMotionRef.current;
      lastMotionRef.current = snapshot;
      if (!last) return;

      const delta = calculateDelta(last, snapshot);
      if (delta > MAX_PLAUSIBLE_DELTA) {
        shakeHitsRef.current = [];
        return;
      }

      if (delta > thresholdRef.current) {
        shakeHitsRef.current = [...shakeHitsRef.current, now].filter(hitAt => now - hitAt <= SHAKE_WINDOW_MS);
      } else {
        shakeHitsRef.current = shakeHitsRef.current.filter(hitAt => now - hitAt <= SHAKE_WINDOW_MS);
      }

      if (shakeHitsRef.current.length >= REQUIRED_SHAKE_HITS) {
        lastLockAtRef.current = now;
        ignoreMotionUntilRef.current = now + LOCK_COOLDOWN_MS;
        lastMotionRef.current = null;
        shakeHitsRef.current = [];
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
