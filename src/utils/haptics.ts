import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Feedback utility — triggers device vibration and optional UI sounds.
 * Falls back silently if a capability is unsupported.
 */

export const VIBRATION_ENABLED_KEY = 'xkey_vibration_enabled';
export const SOUND_ENABLED_KEY = 'xkey_sound_enabled';

let vibrationEnabled = true;
let soundEnabled = false;
let audioContext: AudioContext | null = null;

const readLocalBoolean = (key: string, fallback: boolean): boolean => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
};

const writeLocalBoolean = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Local storage is best-effort only.
  }
};

vibrationEnabled = readLocalBoolean(VIBRATION_ENABLED_KEY, true);
soundEnabled = readLocalBoolean(SOUND_ENABLED_KEY, false);

export const initFeedbackSettings = async (): Promise<void> => {
  try {
    const [{ value: vibration }, { value: sound }] = await Promise.all([
      Preferences.get({ key: VIBRATION_ENABLED_KEY }),
      Preferences.get({ key: SOUND_ENABLED_KEY }),
    ]);

    vibrationEnabled = vibration === null ? vibrationEnabled : vibration === 'true';
    soundEnabled = sound === null ? soundEnabled : sound === 'true';
    writeLocalBoolean(VIBRATION_ENABLED_KEY, vibrationEnabled);
    writeLocalBoolean(SOUND_ENABLED_KEY, soundEnabled);
  } catch {
    // Keep local/default values.
  }
};

export const getFeedbackSettings = (): { vibrationEnabled: boolean; soundEnabled: boolean } => ({
  vibrationEnabled,
  soundEnabled,
});

export const setVibrationEnabled = async (enabled: boolean): Promise<void> => {
  vibrationEnabled = Boolean(enabled);
  writeLocalBoolean(VIBRATION_ENABLED_KEY, vibrationEnabled);
  await Preferences.set({ key: VIBRATION_ENABLED_KEY, value: String(vibrationEnabled) }).catch(() => {});
};

export const setSoundEnabled = async (enabled: boolean): Promise<void> => {
  soundEnabled = Boolean(enabled);
  writeLocalBoolean(SOUND_ENABLED_KEY, soundEnabled);
  await Preferences.set({ key: SOUND_ENABLED_KEY, value: String(soundEnabled) }).catch(() => {});
};

const renderTone = (frequency: number, duration: number, volume: number): void => {
  if (!audioContext) return;
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // Audio feedback is best-effort only.
  }
};

const playTone = (frequency: number, duration = 0.035, volume = 0.035): void => {
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioContext ||= new AudioContextClass();
    const context = audioContext;
    if (context.state === 'suspended') {
      context.resume().then(() => {
        if (context.state === 'running') renderTone(frequency, duration, volume);
      }).catch(() => {});
      return;
    }

    renderTone(frequency, duration, volume);
  } catch {
    // Audio feedback is best-effort only.
  }
};

const vibrate = (pattern: VibratePattern, nativeFeedback?: () => Promise<void>): void => {
  if (!vibrationEnabled) return;

  if (nativeFeedback) {
    nativeFeedback().catch(() => {});
    return;
  }

  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // Vibration is best-effort only.
  }
};

/** Light tap — for button presses */
export const hapticTap = () => {
  vibrate(12, () => Haptics.impact({ style: ImpactStyle.Light }));
  playTone(520, 0.055, 0.08);
};

/** Medium tap — for confirmations, saves */
export const hapticSuccess = () => {
  vibrate([10, 30, 10], () => Haptics.notification({ type: NotificationType.Success }));
  playTone(740, 0.075, 0.1);
};

/** Warning — for destructive actions */
export const hapticWarning = () => {
  vibrate([20, 40, 20, 40, 20], () => Haptics.notification({ type: NotificationType.Warning }));
  playTone(260, 0.09, 0.1);
};

/** Error — for failed operations */
export const hapticError = () => {
  vibrate([50, 50, 50], () => Haptics.notification({ type: NotificationType.Error }));
  playTone(180, 0.11, 0.11);
};
