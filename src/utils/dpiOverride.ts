import { Capacitor, registerPlugin } from '@capacitor/core';

export type DpiOverrideResult = {
  supported: boolean;
  swDp?: number;
  dpi?: number;
  systemSwDp?: number;
  systemDpi?: number;
  overrideEnabled?: boolean;
};

type DpiOverridePlugin = {
  setSwDp: (options: { swDp: number }) => Promise<DpiOverrideResult>;
  resetSwDp: () => Promise<DpiOverrideResult>;
  getSystemSwDp: () => Promise<DpiOverrideResult>;
  getCurrentSwDp: () => Promise<DpiOverrideResult>;
  setDpi?: (options: { dpi: number }) => Promise<DpiOverrideResult>;
  resetDpi?: () => Promise<DpiOverrideResult>;
  getSystemDpi?: () => Promise<DpiOverrideResult>;
  getCurrentDpi?: () => Promise<DpiOverrideResult>;
};

const DpiOverride = registerPlugin<DpiOverridePlugin>('DpiOverride');

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function setAndroidAppSwDp(swDp: number): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.setSwDp({ swDp });
  } catch {
    try {
      return await DpiOverride.setDpi?.({ dpi: swDp }) ?? { supported: false };
    } catch {
      return { supported: false };
    }
  }
}

export async function resetAndroidAppSwDp(): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.resetSwDp();
  } catch {
    try {
      return await DpiOverride.resetDpi?.() ?? { supported: false };
    } catch {
      return { supported: false };
    }
  }
}

export async function getAndroidSystemSwDp(): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.getSystemSwDp();
  } catch {
    try {
      return await DpiOverride.getSystemDpi?.() ?? { supported: false };
    } catch {
      return { supported: false };
    }
  }
}

export async function getAndroidCurrentSwDp(): Promise<DpiOverrideResult> {
  if (!isAndroidNative()) return { supported: false };
  try {
    return await DpiOverride.getCurrentSwDp();
  } catch {
    try {
      return await DpiOverride.getCurrentDpi?.() ?? { supported: false };
    } catch {
      return { supported: false };
    }
  }
}

// Legacy exports kept so older imports still compile; values now represent smallest-width dp.
export const setAndroidAppDpi = setAndroidAppSwDp;
export const resetAndroidAppDpi = resetAndroidAppSwDp;
export const getAndroidSystemDpi = getAndroidSystemSwDp;
export const getAndroidCurrentDpi = getAndroidCurrentSwDp;
