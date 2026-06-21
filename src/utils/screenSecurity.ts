import { Capacitor, registerPlugin } from '@capacitor/core';

export const BLOCK_SCREEN_CAPTURE_KEY = 'xkey_block_screen_capture';

type ScreenSecurityPlugin = {
  setSecure: (options: { enabled: boolean }) => Promise<{ enabled?: boolean }>;
  isSecure: () => Promise<{ enabled?: boolean }>;
};

const ScreenSecurity = registerPlugin<ScreenSecurityPlugin>('ScreenSecurity');

export async function setScreenCaptureBlocked(enabled: boolean): Promise<{ enabled: boolean; supported: boolean }> {
  if (!Capacitor.isNativePlatform()) return { enabled: false, supported: false };
  const result = await ScreenSecurity.setSecure({ enabled: !!enabled });
  return { enabled: !!result?.enabled, supported: true };
}

export async function isScreenCaptureBlocked(): Promise<{ enabled: boolean; supported: boolean }> {
  if (!Capacitor.isNativePlatform()) return { enabled: false, supported: false };
  const result = await ScreenSecurity.isSecure();
  return { enabled: !!result?.enabled, supported: true };
}
