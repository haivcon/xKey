/**
 * Haptic feedback utility — triggers device vibration if available.
 * Falls back silently if the Vibration API is unsupported.
 */

/** Light tap — for button presses */
export const hapticTap = () => {
  try {
    if (navigator.vibrate) navigator.vibrate(12);
  } catch {}
};

/** Medium tap — for confirmations, saves */
export const hapticSuccess = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  } catch {}
};

/** Warning — for destructive actions */
export const hapticWarning = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([20, 40, 20, 40, 20]);
  } catch {}
};

/** Error — for failed operations */
export const hapticError = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  } catch {}
};
