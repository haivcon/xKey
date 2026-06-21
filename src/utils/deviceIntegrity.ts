import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface DeviceIntegrityRisk {
  native: boolean;
  risky: boolean;
  unavailable?: boolean;
  testKeys?: boolean;
  rootFiles?: boolean;
  suCommand?: boolean;
  appDebuggable?: boolean;
  adbEnabled?: boolean;
  reasons: string[];
}

type DeviceIntegrityPlugin = {
  getRiskInfo: () => Promise<DeviceIntegrityRisk>;
};

const DeviceIntegrity = registerPlugin<DeviceIntegrityPlugin>('DeviceIntegrity');

export const DEVICE_INTEGRITY_GUARD_KEY = 'xkey_device_integrity_guard';

export const getDeviceIntegrityRisk = async (): Promise<DeviceIntegrityRisk> => {
  if (!Capacitor.isNativePlatform()) {
    return { native: false, risky: false, reasons: [] };
  }
  try {
    return await DeviceIntegrity.getRiskInfo();
  } catch {
    return { native: true, risky: false, unavailable: true, reasons: [] };
  }
};

export const isDeviceIntegrityGuardEnabled = async (): Promise<boolean> => {
  const { value } = await Preferences.get({ key: DEVICE_INTEGRITY_GUARD_KEY });
  return value === 'true';
};

export const setDeviceIntegrityGuardEnabled = async (enabled: boolean): Promise<boolean> => {
  await Preferences.set({ key: DEVICE_INTEGRITY_GUARD_KEY, value: enabled ? 'true' : 'false' });
  return enabled;
};
