import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';

export const SECURE_DISPLAY_KEY = 'xkey_secure_display_rendering';
export const SECURE_DISPLAY_CHANGED_EVENT = 'xkey-secure-display-changed';

type GlyphAlphabet = Record<string, string>;

type SecureDisplayContextValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  remapToSessionGlyphs: (value: unknown) => string;
};

const SecureDisplayContext = createContext<SecureDisplayContextValue | null>(null);

export function useSecureDisplay(): SecureDisplayContextValue {
  const ctx = useContext(SecureDisplayContext);
  if (!ctx) throw new Error('useSecureDisplay must be used within SecureDisplayProvider');
  return ctx;
}

const createSessionAlphabet = (): GlyphAlphabet => {
  const printable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 `~!@#$%^&*()-_=+[]{}\\|;:\'",.<>/?';
  const start = 0xe000 + secureRandomInt(256);
  const shuffled = Array.from(printable).map((char, index) => ({ char, code: start + index }));

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.reduce((acc, item) => {
    acc[item.char] = String.fromCharCode(item.code);
    return acc;
  }, {} as GlyphAlphabet);
};

const secureRandomInt = (maxExclusive: number): number => {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
};

export function SecureDisplayProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [glyphAlphabet, setGlyphAlphabet] = useState(() => createSessionAlphabet());

  useEffect(() => {
    Preferences.get({ key: SECURE_DISPLAY_KEY })
      .then(({ value }) => setEnabledState(value === 'true'))
      .catch(() => {});
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    const normalized = !!next;
    setEnabledState(normalized);
    setGlyphAlphabet(createSessionAlphabet());
    Preferences.set({ key: SECURE_DISPLAY_KEY, value: normalized ? 'true' : 'false' }).catch(() => {});
    window.dispatchEvent(new Event(SECURE_DISPLAY_CHANGED_EVENT));
  }, []);

  const remapToSessionGlyphs = useCallback((value: unknown) => (
    String(value || '').split('').map(char => glyphAlphabet[char] || char).join('')
  ), [glyphAlphabet]);

  const value = useMemo(() => ({
    enabled,
    setEnabled,
    remapToSessionGlyphs,
  }), [enabled, setEnabled, remapToSessionGlyphs]);

  return (
    <SecureDisplayContext.Provider value={value}>
      {children}
    </SecureDisplayContext.Provider>
  );
}
