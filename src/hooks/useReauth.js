import { NativeBiometric } from '@capgo/capacitor-native-biometric';

/**
 * Trigger a biometric/lock-screen re-authentication.
 * Returns true if verified, false if cancelled or unavailable.
 */
export async function reauthenticate(reason = 'Confirm this action') {
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Security Verification',
      subtitle: reason,
      useFallback: true
    });
    return true;
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    const code = (err.code || '').toLowerCase();
    // Block if user actively canceled
    if (msg.includes('cancel') || code === 'usercancel' || code === 'user_cancel') {
        return false;
    }
    // Allow pass-through if device has no lock screen at all
    return true;
  }
}
