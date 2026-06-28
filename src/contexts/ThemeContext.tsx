import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { getAndroidCurrentSwDp, getAndroidSystemSwDp, resetAndroidAppSwDp, setAndroidAppSwDp } from '../utils/dpiOverride';

type ThemeMode = 'dark' | 'light' | 'amoled' | 'pink' | 'blue' | 'red' | 'purple' | 'emerald';
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
  compactBalance: boolean;
  setCompactBalance: (next: boolean) => void;
  privacyMode: boolean;
  setPrivacyMode: (next: boolean) => void;
  togglePrivacyMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'xkey_theme';
const DISPLAY_SCALE_KEY = 'xkey_display_scale';
const DPI_MODE_KEY = 'xkey_dpi_mode';
const TARGET_DPI_KEY = 'xkey_target_dpi';
const WALLET_DENSITY_KEY = 'xkey_wallet_density';
const COMPACT_BALANCE_KEY = 'xkey_compact_balance';
const BRAND_REMINDERS_KEY = 'xkey_brand_reminders';
const SHOW_WALLET_SCORES_KEY = 'xkey_show_wallet_scores';
const PRIVACY_MODE_KEY = 'xkey_privacy_mode';
const DEFAULT_DISPLAY_SCALE = 75;
const MIN_DISPLAY_SCALE = 5;
const MAX_DISPLAY_SCALE = 200;
const DEFAULT_TARGET_DPI = 480;
const MIN_TARGET_DPI = 240;
const MAX_TARGET_DPI = 800;

const THEME_MODES: ThemeMode[] = ['dark', 'light', 'amoled', 'pink', 'blue', 'red', 'purple', 'emerald'];
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
  const themeClasses = ['dark', 'theme-light', 'theme-dark', 'theme-amoled', 'theme-pink', 'theme-blue', 'theme-red', 'theme-purple', 'theme-emerald'];
  const roots = [document.documentElement, document.body].filter(Boolean);

  roots.forEach(root => {
    const cl = root.classList;
    cl.remove(...themeClasses);
    root.dataset.theme = theme;

    if (theme === 'light') {
      cl.add('theme-light');
    } else {
      cl.add('dark', theme === 'dark' ? 'theme-dark' : `theme-${theme}`);
    }
  });
};

const normalizeDisplayScale = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DISPLAY_SCALE;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, parsed));
};

const getDeviceSwDp = (): number => {
  if (typeof window === 'undefined') return DEFAULT_TARGET_DPI;
  const width = Math.min(window.screen?.width || window.innerWidth || DEFAULT_TARGET_DPI, window.innerWidth || DEFAULT_TARGET_DPI);
  const ratio = Number(window.devicePixelRatio);
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return Math.max(1, Math.round(width / safeRatio));
};

const normalizeTargetDpi = (value: number | string | null | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TARGET_DPI;
  return Math.min(MAX_TARGET_DPI, Math.max(MIN_TARGET_DPI, parsed));
};

const calculateDpiScale = (targetSwDp: number, deviceSwDp: number): number => {
  const safeDeviceSwDp = Number.isFinite(deviceSwDp) && deviceSwDp > 0 ? deviceSwDp : DEFAULT_TARGET_DPI;
  const safeTargetSwDp = Number.isFinite(targetSwDp) && targetSwDp > 0 ? targetSwDp : DEFAULT_TARGET_DPI;
  return normalizeDisplayScale(Math.round((safeDeviceSwDp / safeTargetSwDp) * 100));
};

const applyDisplayScale = (scale: number) => {
  document.documentElement.style.setProperty('--app-display-scale', String(scale / 100));
};

const getEffectiveDeviceDpi = async (): Promise<number> => {
  const native = await getAndroidSystemSwDp();
  if (native.supported && Number.isFinite(native.systemSwDp)) return native.systemSwDp as number;
  if (native.supported && Number.isFinite(native.swDp)) return native.swDp as number;
  if (native.supported && Number.isFinite(native.systemDpi)) return native.systemDpi as number;
  if (native.supported && Number.isFinite(native.dpi)) return native.dpi as number;
  return getDeviceSwDp();
};

const applyNativeDpiIfAvailable = async (targetSwDp: number, fallbackDeviceSwDp: number, manualScale: number) => {
  const native = await setAndroidAppSwDp(targetSwDp);
  const deviceDpi = native.supported && Number.isFinite(native.systemSwDp)
    ? native.systemSwDp as number
    : native.supported && Number.isFinite(native.systemDpi)
      ? native.systemDpi as number
      : fallbackDeviceSwDp;
  const fallbackScale = normalizeDisplayScale(Math.round((manualScale * calculateDpiScale(targetSwDp, deviceDpi)) / 100));
  applyDisplayScale(native.supported ? manualScale : fallbackScale);
  return { deviceDpi, nativeSupported: native.supported };
};

const resetNativeDpiIfAvailable = async (fallbackScale: number) => {
  const native = await resetAndroidAppSwDp();
  applyDisplayScale(fallbackScale);
  if (native.supported && Number.isFinite(native.systemSwDp)) return native.systemSwDp as number;
  if (native.supported && Number.isFinite(native.systemDpi)) return native.systemDpi as number;
  return getDeviceSwDp();
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [displayScale, setDisplayScaleState] = useState(DEFAULT_DISPLAY_SCALE);
  const [dpiMode, setDpiModeState] = useState(true);
  const [targetDpi, setTargetDpiState] = useState(DEFAULT_TARGET_DPI);
  const [deviceDpi, setDeviceDpi] = useState(() => getDeviceSwDp());
  const [walletDensity, setWalletDensityState] = useState<WalletDensity>('comfortable');
  const [brandReminders, setBrandRemindersState] = useState(true);
  const [showWalletScores, setShowWalletScoresState] = useState(false);
  const [compactBalance, setCompactBalanceState] = useState(false);
  const [privacyMode, setPrivacyModeState] = useState(false);

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
    ]).then(async ([scaleResult, dpiModeResult, targetDpiResult]) => {
      const nextScale = normalizeDisplayScale(scaleResult.value);
      const nextDpiMode = dpiModeResult.value == null ? true : dpiModeResult.value === 'true';
      const nextTargetDpi = normalizeTargetDpi(targetDpiResult.value);
      let nextDeviceDpi = await getEffectiveDeviceDpi();

      setDisplayScaleState(nextScale);
      setDpiModeState(nextDpiMode);
      setTargetDpiState(nextTargetDpi);
      setDeviceDpi(nextDeviceDpi);

      if (dpiModeResult.value == null) Preferences.set({ key: DPI_MODE_KEY, value: 'true' }).catch(() => {});
      if (targetDpiResult.value == null) Preferences.set({ key: TARGET_DPI_KEY, value: String(nextTargetDpi) }).catch(() => {});
      if (scaleResult.value == null) Preferences.set({ key: DISPLAY_SCALE_KEY, value: String(nextScale) }).catch(() => {});

      if (nextDpiMode) {
        const applied = await applyNativeDpiIfAvailable(nextTargetDpi, nextDeviceDpi, nextScale);
        nextDeviceDpi = applied.deviceDpi;
        setDeviceDpi(nextDeviceDpi);
      } else {
        const current = await getAndroidCurrentSwDp();
        if (current.supported && current.overrideEnabled) {
          nextDeviceDpi = await resetNativeDpiIfAvailable(nextScale);
          setDeviceDpi(nextDeviceDpi);
        } else {
          applyDisplayScale(nextScale);
        }
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

    Preferences.get({ key: COMPACT_BALANCE_KEY }).then(({ value }) => {
      if (value === 'true') setCompactBalanceState(true);
      else if (value === 'false') setCompactBalanceState(false);
    }).catch(() => {});

    Preferences.get({ key: PRIVACY_MODE_KEY }).then(({ value }) => {
      if (value === 'true') setPrivacyModeState(true);
      else if (value === 'false') setPrivacyModeState(false);
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

    if (dpiMode) {
      void (async () => {
        const nextDeviceDpi = await getEffectiveDeviceDpi();
        setDeviceDpi(nextDeviceDpi);
        await applyNativeDpiIfAvailable(targetDpi, nextDeviceDpi, nextScale);
      })();
    }
  }, [dpiMode, targetDpi]);

  const setDpiMode = useCallback((next: boolean) => {
    const nextTargetDpi = next ? DEFAULT_TARGET_DPI : targetDpi;
    if (next) setTargetDpiState(nextTargetDpi);
    setDpiModeState(next);
    if (next) Preferences.set({ key: TARGET_DPI_KEY, value: String(nextTargetDpi) }).catch(() => {});
    Preferences.set({ key: DPI_MODE_KEY, value: String(next) }).catch(() => {});

    void (async () => {
      const nextDeviceDpi = await getEffectiveDeviceDpi();
      setDeviceDpi(nextDeviceDpi);
      if (next) {
        const applied = await applyNativeDpiIfAvailable(nextTargetDpi, nextDeviceDpi, displayScale);
        setDeviceDpi(applied.deviceDpi);
      } else {
        const restoredDpi = await resetNativeDpiIfAvailable(displayScale);
        setDeviceDpi(restoredDpi);
      }
    })();
  }, [displayScale, targetDpi]);

  const setTargetDpi = useCallback((next: number | string | null | undefined) => {
    const nextTargetDpi = normalizeTargetDpi(next);
    setTargetDpiState(nextTargetDpi);
    Preferences.set({ key: TARGET_DPI_KEY, value: String(nextTargetDpi) }).catch(() => {});

    void (async () => {
      const nextDeviceDpi = await getEffectiveDeviceDpi();
      setDeviceDpi(nextDeviceDpi);
      if (dpiMode) {
        const applied = await applyNativeDpiIfAvailable(nextTargetDpi, nextDeviceDpi, displayScale);
        setDeviceDpi(applied.deviceDpi);
      }
    })();
  }, [displayScale, dpiMode]);

  const setWalletDensity = useCallback((next: string | null | undefined) => {
    const normalized: WalletDensity = isWalletDensity(next) ? next : 'comfortable';
    setWalletDensityState(normalized);
    Preferences.set({ key: WALLET_DENSITY_KEY, value: normalized }).catch(() => {});
  }, []);

  const setBrandReminders = useCallback((next: boolean) => {
    setBrandRemindersState(next);
    Preferences.set({ key: BRAND_REMINDERS_KEY, value: String(next) }).catch(() => {});
  }, []);

  const setCompactBalance = useCallback((next: boolean) => {
    setCompactBalanceState(next);
    Preferences.set({ key: COMPACT_BALANCE_KEY, value: String(next) }).catch(() => {});
  }, []);

  const setShowWalletScores = useCallback((next: boolean) => {
    setShowWalletScoresState(next);
    Preferences.set({ key: SHOW_WALLET_SCORES_KEY, value: String(next) }).catch(() => {});
  }, []);

  const setPrivacyMode = useCallback((next: boolean) => {
    setPrivacyModeState(next);
    Preferences.set({ key: PRIVACY_MODE_KEY, value: String(next) }).catch(() => {});
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyModeState(prev => {
      const next = !prev;
      Preferences.set({ key: PRIVACY_MODE_KEY, value: String(next) }).catch(() => {});
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyThemeClass(next);
      Preferences.set({ key: THEME_KEY, value: next }).catch(() => {});
      return next;
    });
  }, []);

  const effectiveDisplayScale = dpiMode
    ? normalizeDisplayScale(Math.round((displayScale * calculateDpiScale(targetDpi, deviceDpi)) / 100))
    : displayScale;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, displayScale, setDisplayScale, dpiMode, setDpiMode, targetDpi, setTargetDpi, deviceDpi, effectiveDisplayScale, walletDensity, setWalletDensity, brandReminders, setBrandReminders, showWalletScores, setShowWalletScores, compactBalance, setCompactBalance, privacyMode, setPrivacyMode, togglePrivacyMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
