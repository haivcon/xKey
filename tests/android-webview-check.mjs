import { _android as android } from 'playwright';

// Read-only diagnostic: attach to an already-open debug WebView, never reset a vault.
// Exit 2 means unavailable/unverified, not a passed Android security check.
const packageName = process.env.XKEY_ANDROID_PACKAGE || 'com.haivcon.xkey';
let devices = [];
try {
  devices = await android.devices();
  const device = process.env.ANDROID_SERIAL
    ? devices.find(device => device.serial() === process.env.ANDROID_SERIAL)
    : devices.length === 1 ? devices[0] : null;
  if (!device) {
    console.log('UNVERIFIED: connect one test device or select ANDROID_SERIAL.');
    process.exitCode = 2;
  } else {
    device.setDefaultTimeout(10000);
    const webview = await device.webView({ pkg: packageName });
    const page = await webview.page();
    await page.locator('#root').waitFor({ state: 'attached' });
    console.log('Debug WebView attachment verified. Native security cases remain UNVERIFIED; follow tests/ANDROID_SECURITY_CHECKLIST.md.');
  }
} catch {
  console.error('UNVERIFIED: Android debug WebView unavailable. Open the debug app on an authorized test device.');
  process.exitCode = 2;
} finally {
  await Promise.all(devices.map(device => device.close()));
}
