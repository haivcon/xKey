import { hapticTap } from './haptics';
import { Preferences } from '@capacitor/preferences';

let clearTimer = null;

/**
 * Get the clipboard timeout preference key
 */
export const CLIPBOARD_TIMEOUT_KEY = 'xkey_clipboard_timeout';

/**
 * Copy text to clipboard with auto-clear after specified duration.
 * @param {string} text - Text to copy
 * @param {number|null} clearAfterMs - Auto-clear delay in ms. null = read from preferences.
 * @param {function} onClear - Optional callback when clipboard is cleared
 */
export const secureCopy = async (text, clearAfterMs = null, onClear = null) => {
  try {
    await navigator.clipboard.writeText(text);
    hapticTap();

    // Resolve timeout: explicit param > saved preference > 30s default
    let timeout = clearAfterMs;
    if (timeout === null) {
      try {
        const { value } = await Preferences.get({ key: CLIPBOARD_TIMEOUT_KEY });
        timeout = value !== null ? parseInt(value) : 30000;
        if (isNaN(timeout)) timeout = 30000;
      } catch {
        timeout = 30000;
      }
    }

    // Cancel any previous pending clear
    if (clearTimer) clearTimeout(clearTimer);

    // Schedule auto-clear
    if (timeout > 0) {
      clearTimer = setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          try { await navigator.clipboard.writeText(''); } catch {}
        }
        clearTimer = null;
        if (onClear) onClear();
      }, timeout);
    }

    return true;
  } catch {
    return false;
  }
};


/**
 * Default timeout options (ms)
 */
export const CLIPBOARD_OPTIONS = [
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
  { label: '90s', value: 90000 },
  { label: '2min', value: 120000 },
  { label: '∞', value: 0 },
];
