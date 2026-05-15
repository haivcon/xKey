import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';

const ThemeContext = createContext(null);
const THEME_KEY = 'xkey_theme';

export function useTheme() {
  return useContext(ThemeContext);
}

const applyThemeClass = (theme) => {
  const cl = document.documentElement.classList;
  cl.remove('theme-light', 'theme-amoled');
  if (theme === 'light') cl.add('theme-light');
  else if (theme === 'amoled') cl.add('theme-amoled');
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    Preferences.get({ key: THEME_KEY }).then(({ value }) => {
      if (value && ['dark', 'light', 'amoled'].includes(value)) {
        setThemeState(value);
        applyThemeClass(value);
      }
    }).catch(() => {});
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    applyThemeClass(next);
    Preferences.set({ key: THEME_KEY, value: next }).catch(() => {});
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
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
