import { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { hapticSuccess } from '../utils/haptics';

/**
 * Hook that manages:
 * 1. App Switcher Privacy (blur when app goes to background)
 * 2. Shake to Lock (accelerometer-based instant lock)
 */
export default function useShakeToLock(needsPinAuth, vaultLoading, setNeedsPinAuth) {
  const [isAppActive, setIsAppActive] = useState(true);

  useEffect(() => {
    // 1. App Switcher Privacy
    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      setIsAppActive(isActive);
    });

    // 2. Shake to Lock
    let lastX = null, lastY = null, lastZ = null;
    let shakeEnabled = false;
    let threshold = 15;

    const checkShakeSettings = async () => {
      const { value: en } = await Preferences.get({ key: 'xkey_shake_to_lock' });
      shakeEnabled = en === 'true';
      const { value: sens } = await Preferences.get({ key: 'xkey_shake_sensitivity' });
      if (sens) threshold = Number(sens);
    };

    checkShakeSettings();
    const shakeStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkShakeSettings();
    });

    const handleMotion = (e) => {
      if (!shakeEnabled || needsPinAuth || vaultLoading || !e.accelerationIncludingGravity) return;
      const { x, y, z } = e.accelerationIncludingGravity;
      if (lastX !== null) {
        const deltaX = Math.abs(lastX - x);
        const deltaY = Math.abs(lastY - y);
        const deltaZ = Math.abs(lastZ - z);
        if (deltaX + deltaY + deltaZ > threshold) {
          setNeedsPinAuth(true);
          hapticSuccess();
        }
      }
      lastX = x;
      lastY = y;
      lastZ = z;
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      stateListener.then(l => l.remove());
      shakeStateListener.then(l => l.remove());
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [needsPinAuth, vaultLoading, setNeedsPinAuth]);

  return isAppActive;
}
