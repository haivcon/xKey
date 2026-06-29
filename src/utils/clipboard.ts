import { hapticTap } from './haptics';
import { Preferences } from '@capacitor/preferences';
import { Clipboard } from '@capacitor/clipboard';
import { getClipboardPolicy, isSecretKind, SECRET_COPY_DISABLED_KEY, type SecretKind } from './dataSensitivity';

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Get the clipboard timeout preference key
 */
export const CLIPBOARD_TIMEOUT_KEY = 'xkey_clipboard_timeout';

const writeClipboard = async (text: string): Promise<boolean> => {
  try {
    await Clipboard.write({ string: text, label: 'xKey' });
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
};

export const readClipboard = async (): Promise<string | null> => {
  try {
    const { value } = await Clipboard.read();
    return value;
  } catch {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }
};

export type SecureCopyOptions = {
  clearAfterMs?: number | null;
  kind?: SecretKind;
  onClear?: (() => void) | null;
  onBlocked?: (() => void) | null;
  allowWhenSecretCopyDisabled?: boolean;
};

const resolveTimeout = async (clearAfterMs: number | null | undefined, kind: SecretKind): Promise<number> => {
  if (typeof clearAfterMs === 'number') return clearAfterMs;

  try {
    const { value } = await Preferences.get({ key: CLIPBOARD_TIMEOUT_KEY });
    const saved = value !== null ? Number.parseInt(value, 10) : Number.NaN;
    if (Number.isFinite(saved) && saved >= 0) return saved;
  } catch {
    // Fall back to per-kind policy below.
  }

  return getClipboardPolicy(kind).defaultClearAfterMs;
};

const overwriteClipboardInLayers = async (): Promise<boolean> => {
  const noise = `xkey-cleared-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  const steps = [noise, '', ' '];

  let ok = false;
  for (const value of steps) {
    ok = (await writeClipboard(value)) || ok;
  }

  return ok;
};

/**
 * Copy text to clipboard with auto-clear after specified duration.
 */
export async function secureCopy(text: string, options?: SecureCopyOptions): Promise<boolean>;
export async function secureCopy(text: string, clearAfterMs?: number | null, onClear?: (() => void) | null): Promise<boolean>;
export async function secureCopy(
  text: string,
  optionsOrClearAfterMs: SecureCopyOptions | number | null = null,
  legacyOnClear: (() => void) | null = null,
): Promise<boolean> {
  try {
    const options: SecureCopyOptions = typeof optionsOrClearAfterMs === 'object' && optionsOrClearAfterMs !== null
      ? optionsOrClearAfterMs
      : { clearAfterMs: optionsOrClearAfterMs, onClear: legacyOnClear };
    const kind = options.kind || 'generic';

    if (isSecretKind(kind) && !options.allowWhenSecretCopyDisabled) {
      try {
        const { value } = await Preferences.get({ key: SECRET_COPY_DISABLED_KEY });
        if (value === 'true') {
          options.onBlocked?.();
          return false;
        }
      } catch {
        // If settings cannot be read, continue with copy so existing behavior is not broken.
      }
    }

    const copied = await writeClipboard(text);
    if (!copied) return false;

    hapticTap();

    const timeout = await resolveTimeout(options.clearAfterMs, kind);

    // Cancel any previous pending clear
    if (clearTimer) clearTimeout(clearTimer);

    // Schedule auto-clear
    if (timeout > 0) {
      clearTimer = setTimeout(async () => {
        let cleared = false;
        try {
          const current = await readClipboard();
          if (current === text) {
            cleared = await overwriteClipboardInLayers();
          }
        } catch {
          cleared = await overwriteClipboardInLayers();
        }
        clearTimer = null;
        if (cleared) options.onClear?.();
      }, timeout);
    }

    return true;
  } catch {
    return false;
  }
}

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