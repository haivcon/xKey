import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';

type ThemeMode = 'dark' | 'light' | 'amoled';
type WalletDensity = 'comfortable' | 'compact' | 'ultra';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
  displayScale: number;
  setDisplayScale: (next: number | string | null | undefined) => void;
  walletDensity: WalletDensity;
  setWalletDensity: (next: string | null | undefined) => void;
  brandReminders: boolean;
  setBrandReminders: (next: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'xkey_theme';
const DISPLAY_SCALE_KEY = 'xkey_display_scale';
const WALLET_DENSITY_KEY = 'xkey_wallet_density';
const BRAND_REMINDERS_KEY = 'xkey_brand_reminders';
const DEFAULT_DISPLAY_SCALE = 75;
const MIN_DISPLAY_SCALE = 5;
const MAX_DISPLAY_SCALE = 200;

const THEME_MODES: ThemeMode[] = ['dark', 'light', 'amoled'];
const WALLET_DENSITIES: WalletDensity[] = ['comfortable', 'compact', 'ultra'];

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

const isThemeMode = (value: unknown): value is ThemeMode => (
  typeof value === 'string' && THEME_MODES.includes(value as ThemeMode)
);

const isWalletDensity = (value: unknown): value is WalletDensity => (
  typeof value === 'string' && WALLET_DENSITIES.includes(value as WalletDensity)
);

const applyThemeClass = (theme: ThemeMode) => {
  const cl = document.documentElement.classList;
  cl.remove('theme-light', 'theme-amoled');
  if (theme === 'light') cl.add('theme-light');
  else if (theme === 'amoled') cl.add('theme-amoled');
};

const normalizeDisplayScale = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DISPLAY_SCALE;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, parsed));
};

const applyDisplayScale = (scale: number) => {
  document.documentElement.style.setProperty('--app-display-scale', String(scale / 100));
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [displayScale, setDisplayScaleState] = useState(DEFAULT_DISPLAY_SCALE);
  const [walletDensity, setWalletDensityState] = useState<WalletDensity>('comfortable');
  const [brandReminders, setBrandRemindersState] = useState(true);

  useEffect(() => {
    applyDisplayScale(DEFAULT_DISPLAY_SCALE);

    Preferences.get({ key: THEME_KEY }).then(({ value }) => {
      if (isThemeMode(value)) {
        setThemeState(value);
        applyThemeClass(value);
      }
    }).catch(() => {});

    Preferences.get({ key: DISPLAY_SCALE_KEY }).then(({ value }) => {
      const nextScale = normalizeDisplayScale(value);
      setDisplayScaleState(nextScale);
      applyDisplayScale(nextScale);
    }).catch(() => {});

    Preferences.get({ key: WALLET_DENSITY_KEY }).then(({ value }) => {
      if (isWalletDensity(value)) {
        setWalletDensityState(value);
      }
    }).catch(() => {});

    Preferences.get({ key: BRAND_REMINDERS_KEY }).then(({ value }) => {
      if (value === 'false') setBrandRemindersState(false);
      else if (value === 'true') setBrandRemindersState(true);
    }).catch(() => {});
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    applyThemeClass(next);
    Preferences.set({ key: THEME_KEY, value: next }).catch(() => {});
  }, []);

  const setDisplayScale = useCallback((next: number | string | null | undefined) => {
    const nextScale = normalizeDisplayScale(next);
    setDisplayScaleState(nextScale);
    applyDisplayScale(nextScale);
    Preferences.set({ key: DISPLAY_SCALE_KEY, value: String(nextScale) }).catch(() => {});
  }, []);

  const setWalletDensity = useCallback((next: string | null | undefined) => {
    const normalized: WalletDensity = isWalletDensity(next) ? next : 'comfortable';
    setWalletDensityState(normalized);
    Preferences.set({ key: WALLET_DENSITY_KEY, value: normalized }).catch(() => {});
  }, []);

  const setBrandReminders = useCallback((next: boolean) => {
    setBrandRemindersState(next);
    Preferences.set({ key: BRAND_REMINDERS_KEY, value: String(next) }).catch(() => {});
  }, []);

  // Legacy toggle for backward compat
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyThemeClass(next);
      Preferences.set({ key: THEME_KEY, value: next }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, displayScale, setDisplayScale, walletDensity, setWalletDensity, brandReminders, setBrandReminders }}>
      {children}
    </ThemeContext.Provider>
  );
}
