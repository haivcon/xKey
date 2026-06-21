import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { authenticateDeviceCredential, isDeviceCredentialAvailable } from '../utils/deviceCredential';

/**
 * Trigger a biometric/lock-screen re-authentication.
 * Returns true if verified, false if cancelled or unavailable.
 * On devices without biometric, returns true (user already authenticated via PIN).
 */
export async function reauthenticate(reason = 'Confirm this action'): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform() && await isDeviceCredentialAvailable()) {
      await authenticateDeviceCredential({
        title: 'Security Verification',
        subtitle: reason,
      });
      return true;
    }

    const { isAvailable } = await NativeBiometric.isAvailable();
    if (!isAvailable) return true; // No biometrics → user already authenticated via app PIN

    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Security Verification',
      subtitle: reason,
      useFallback: true
    });
    return true;
  } catch {
    return false;
  }
}
