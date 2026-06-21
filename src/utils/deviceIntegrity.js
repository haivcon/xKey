import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const DeviceIntegrity = registerPlugin('DeviceIntegrity');

export const DEVICE_INTEGRITY_GUARD_KEY = 'xkey_device_integrity_guard';

export const getDeviceIntegrityRisk = async () => {
  if (!Capacitor.isNativePlatform()) {
    return { native: false, risky: false, reasons: [] };
  }
  try {
    return await DeviceIntegrity.getRiskInfo();
  } catch {
    return { native: true, risky: false, unavailable: true, reasons: [] };
  }
};

export const isDeviceIntegrityGuardEnabled = async () => {
  const { value } = await Preferences.get({ key: DEVICE_INTEGRITY_GUARD_KEY });
  return value === 'true';
};

export const setDeviceIntegrityGuardEnabled = async (enabled) => {
  await Preferences.set({ key: DEVICE_INTEGRITY_GUARD_KEY, value: enabled ? 'true' : 'false' });
  return enabled;
};
