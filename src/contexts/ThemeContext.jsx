import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';

const ThemeContext = createContext(null);
const THEME_KEY = 'xkey_theme';
const DISPLAY_SCALE_KEY = 'xkey_display_scale';
const WALLET_DENSITY_KEY = 'xkey_wallet_density';
const DEFAULT_DISPLAY_SCALE = 75;
const MIN_DISPLAY_SCALE = 5;
const MAX_DISPLAY_SCALE = 200;

export function useTheme() {
  return useContext(ThemeContext);
}

const applyThemeClass = (theme) => {
  const cl = document.documentElement.classList;
  cl.remove('theme-light', 'theme-amoled');
  if (theme === 'light') cl.add('theme-light');
  else if (theme === 'amoled') cl.add('theme-amoled');
};

const normalizeDisplayScale = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DISPLAY_SCALE;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, parsed));
};

const applyDisplayScale = (scale) => {
  document.documentElement.style.setProperty('--app-display-scale', String(scale / 100));
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [displayScale, setDisplayScaleState] = useState(DEFAULT_DISPLAY_SCALE);
  const [walletDensity, setWalletDensityState] = useState('comfortable');

  useEffect(() => {
    applyDisplayScale(DEFAULT_DISPLAY_SCALE);

    Preferences.get({ key: THEME_KEY }).then(({ value }) => {
      if (value && ['dark', 'light', 'amoled'].includes(value)) {
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
      if (['comfortable', 'compact', 'ultra'].includes(value)) {
        setWalletDensityState(value);
      }
    }).catch(() => {});
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    applyThemeClass(next);
    Preferences.set({ key: THEME_KEY, value: next }).catch(() => {});
  }, []);

  const setDisplayScale = useCallback((next) => {
    const nextScale = normalizeDisplayScale(next);
    setDisplayScaleState(nextScale);
    applyDisplayScale(nextScale);
    Preferences.set({ key: DISPLAY_SCALE_KEY, value: String(nextScale) }).catch(() => {});
  }, []);

  const setWalletDensity = useCallback((next) => {
    const normalized = ['comfortable', 'compact', 'ultra'].includes(next) ? next : 'comfortable';
    setWalletDensityState(normalized);
    Preferences.set({ key: WALLET_DENSITY_KEY, value: normalized }).catch(() => {});
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
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, displayScale, setDisplayScale, walletDensity, setWalletDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}
