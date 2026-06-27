import { Capacitor, registerPlugin } from '@capacitor/core';

export type DpiOverrideResult = {
  supported: boolean;
  dpi?: number;
  systemDpi?: number;
  overrideEnabled?: boolean;
};

type DpiOverridePlugin = {
  setDpi: (options: { dpi: number }) => Promise<DpiOverrideResult>;
  resetDpi: () => Promise<DpiOverrideResult>;
  getSystemDpi: () => Promise<DpiOverrideResult>;
  getCurrentDpi: () => Promise<DpiOverrideResult>;
};

const DpiOverride = registerPlugin<DpiOverridePlugin>('DpiOverride');

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function setAndroidAppDpi(dpi: number): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.setDpi({ dpi });
  } catch {
    return { supported: false };
  }
}

export async function resetAndroidAppDpi(): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.resetDpi();
  } catch {
    return { supported: false };
  }
}

export async function getAndroidSystemDpi(): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.getSystemDpi();
  } catch {
    return { supported: false };
  }
}

export async function getAndroidCurrentDpi(): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.getCurrentDpi();
  } catch {
    return { supported: false };
  }
}
