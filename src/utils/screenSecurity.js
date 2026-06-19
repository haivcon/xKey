import { Capacitor, registerPlugin } from '@capacitor/core';

export const BLOCK_SCREEN_CAPTURE_KEY = 'xkey_block_screen_capture';

const ScreenSecurity = registerPlugin('ScreenSecurity');

export async function setScreenCaptureBlocked(enabled) {
  if (!Capacitor.isNativePlatform()) return { enabled: false, supported: false };
  const result = await ScreenSecurity.setSecure({ enabled: !!enabled });
  return { enabled: !!result?.enabled, supported: true };
}

export async function isScreenCaptureBlocked() {
  if (!Capacitor.isNativePlatform()) return { enabled: false, supported: false };
  const result = await ScreenSecurity.isSecure();
  return { enabled: !!result?.enabled, supported: true };
}
