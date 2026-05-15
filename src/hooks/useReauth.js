import { NativeBiometric } from '@capgo/capacitor-native-biometric';

/**
 * Trigger a biometric/lock-screen re-authentication.
 * Returns true if verified, false if cancelled or unavailable.
 */
export async function reauthenticate(reason = 'Confirm this action') {
  try {
    const { isAvailable } = await NativeBiometric.isAvailable();
    if (!isAvailable) return true; // No biometrics → allow (fallback devices)

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
