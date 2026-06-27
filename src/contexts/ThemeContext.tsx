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
  dpiMode: boolean;
  setDpiMode: (next: boolean) => void;
  targetDpi: number;
  setTargetDpi: (next: number | string | null | undefined) => void;
  deviceDpi: number;
  effectiveDisplayScale: number;
  walletDensity: WalletDensity;
  setWalletDensity: (next: string | null | undefined) => void;
  brandReminders: boolean;
  setBrandReminders: (next: boolean) => void;
  showWalletScores: boolean;
  setShowWalletScores: (next: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'xkey_theme';
const DISPLAY_SCALE_KEY = 'xkey_display_scale';
const DPI_MODE_KEY = 'xkey_dpi_mode';
const TARGET_DPI_KEY = 'xkey_target_dpi';
const WALLET_DENSITY_KEY = 'xkey_wallet_density';
const BRAND_REMINDERS_KEY = 'xkey_brand_reminders';
const SHOW_WALLET_SCORES_KEY = 'xkey_show_wallet_scores';
const DEFAULT_DISPLAY_SCALE = 75;
const MIN_DISPLAY_SCALE = 5;
const MAX_DISPLAY_SCALE = 200;
const DEFAULT_TARGET_DPI = 250;
const MIN_TARGET_DPI = 120;
const MAX_TARGET_DPI = 960;
const BASELINE_DPI = 160;

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
  const themeClasses = ['dark', 'theme-light', 'theme-dark', 'theme-amoled'];
  const roots = [document.documentElement, document.body].filter(Boolean);

  roots.forEach(root => {
    const cl = root.classList;
    cl.remove(...themeClasses);
    root.dataset.theme = theme;

    if (theme === 'light') {
      cl.add('theme-light');
    } else {
      cl.add('dark', theme === 'amoled' ? 'theme-amoled' : 'theme-dark');
    }
  });
};

const normalizeDisplayScale = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DISPLAY_SCALE;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, parsed));
};

const getDeviceDpi = (): number => {
  if (typeof window === 'undefined') return DEFAULT_TARGET_DPI;
  const ratio = Number(window.devicePixelRatio);
  return Math.round((Number.isFinite(ratio) && ratio > 0 ? ratio : 3) * BASELINE_DPI);
};

const normalizeTargetDpi = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TARGET_DPI;
  return Math.min(MAX_TARGET_DPI, Math.max(MIN_TARGET_DPI, parsed));
};

const calculateDpiScale = (targetDpi: number, deviceDpi: number): number => {
  const safeDeviceDpi = Number.isFinite(deviceDpi) && deviceDpi > 0 ? deviceDpi : DEFAULT_TARGET_DPI;
  return normalizeDisplayScale(Math.round((targetDpi / safeDeviceDpi) * 100));
};

const applyDisplayScale = (scale: number) => {
  document.documentElement.style.setProperty('--app-display-scale', String(scale / 100));
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [displayScale, setDisplayScaleState] = useState(DEFAULT_DISPLAY_SCALE);
  const [dpiMode, setDpiModeState] = useState(false);
  const [targetDpi, setTargetDpiState] = useState(DEFAULT_TARGET_DPI);
  const [deviceDpi, setDeviceDpi] = useState(() => getDeviceDpi());
  const [walletDensity, setWalletDensityState] = useState<WalletDensity>('comfortable');
  const [brandReminders, setBrandRemindersState] = useState(true);
  const [showWalletScores, setShowWalletScoresState] = useState(false);

  useEffect(() => {
    applyThemeClass('dark');
    applyDisplayScale(DEFAULT_DISPLAY_SCALE);

    Preferences.get({ key: THEME_KEY }).then(({ value }) => {
      if (isThemeMode(value)) {
        setThemeState(value);
        applyThemeClass(value);
      }
    }).catch(() => {});

    Promise.all([
      Preferences.get({ key: DISPLAY_SCALE_KEY }),
      Preferences.get({ key: DPI_MODE_KEY }),
      Preferences.get({ key: TARGET_DPI_KEY })
    ]).then(([scaleResult, dpiModeResult, targetDpiResult]) => {
      const nextScale = normalizeDisplayScale(scaleResult.value);
      const nextDpiMode = dpiModeResult.value === 'true';
      const storedTargetDpi = normalizeTargetDpi(targetDpiResult.value);
      const nextTargetDpi = nextDpiMode && storedTargetDpi === 480 ? DEFAULT_TARGET_DPI : storedTargetDpi;
      const nextDeviceDpi = getDeviceDpi();

      setDisplayScaleState(nextScale);
      setDpiModeState(nextDpiMode);
      setTargetDpiState(nextTargetDpi);
      setDeviceDpi(nextDeviceDpi);
      applyDisplayScale(nextDpiMode ? calculateDpiScale(nextTargetDpi, nextDeviceDpi) : nextScale);
      if (nextDpiMode && storedTargetDpi === 480) {
        Preferences.set({ key: TARGET_DPI_KEY, value: String(DEFAULT_TARGET_DPI) }).catch(() => {});
      }
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

    Preferences.get({ key: SHOW_WALLET_SCORES_KEY }).then(({ value }) => {
      if (value === 'true') setShowWalletScoresState(true);
      else if (value === 'false') setShowWalletScoresState(false);
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
    if (!dpiMode) applyDisplayScale(nextScale);
    Preferences.set({ key: DISPLAY_SCALE_KEY, value: String(nextScale) }).catch(() => {});
  }, [dpiMode]);

  const setDpiMode = useCallback((next: boolean) => {
    const nextDeviceDpi = getDeviceDpi();
    const nextTargetDpi = next ? DEFAULT_TARGET_DPI : targetDpi;
    setDeviceDpi(nextDeviceDpi);
    if (next) setTargetDpiState(nextTargetDpi);
    setDpiModeState(next);
    applyDisplayScale(next ? calculateDpiScale(nextTargetDpi, nextDeviceDpi) : displayScale);
    if (next) Preferences.set({ key: TARGET_DPI_KEY, value: String(nextTargetDpi) }).catch(() => {});
    Preferences.set({ key: DPI_MODE_KEY, value: String(next) }).catch(() => {});
  }, [displayScale, targetDpi]);

  const setTargetDpi = useCallback((next: number | string | null | undefined) => {
    const nextTargetDpi = normalizeTargetDpi(next);
    const nextDeviceDpi = getDeviceDpi();
    setTargetDpiState(nextTargetDpi);
    setDeviceDpi(nextDeviceDpi);
    if (dpiMode) applyDisplayScale(calculateDpiScale(nextTargetDpi, nextDeviceDpi));
    Preferences.set({ key: TARGET_DPI_KEY, value: String(nextTargetDpi) }).catch(() => {});
  }, [dpiMode]);

  const setWalletDensity = useCallback((next: string | null | undefined) => {
    const normalized: WalletDensity = isWalletDensity(next) ? next : 'comfortable';
    setWalletDensityState(normalized);
    Preferences.set({ key: WALLET_DENSITY_KEY, value: normalized }).catch(() => {});
  }, []);

  const setBrandReminders = useCallback((next: boolean) => {
    setBrandRemindersState(next);
    Preferences.set({ key: BRAND_REMINDERS_KEY, value: String(next) }).catch(() => {});
  }, []);

  const setShowWalletScores = useCallback((next: boolean) => {
    setShowWalletScoresState(next);
    Preferences.set({ key: SHOW_WALLET_SCORES_KEY, value: String(next) }).catch(() => {});
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

  const effectiveDisplayScale = dpiMode ? calculateDpiScale(targetDpi, deviceDpi) : displayScale;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, displayScale, setDisplayScale, dpiMode, setDpiMode, targetDpi, setTargetDpi, deviceDpi, effectiveDisplayScale, walletDensity, setWalletDensity, brandReminders, setBrandReminders, showWalletScores, setShowWalletScores }}>
      {children}
    </ThemeContext.Provider>
  );
}
