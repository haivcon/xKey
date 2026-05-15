import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import locales from '../locales';

const LanguageContext = createContext(null);
const LANG_KEY = 'xkey_language';

/**
 * Get a nested value from an object using dot notation.
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

/**
 * Replace template variables: "Hello {name}" + {name: "World"} → "Hello World"
 */
const interpolate = (str, vars) => {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{${key}}`));
};

/**
 * Detect the best matching language from the device/browser.
 * e.g. "vi-VN" → "vi", "zh-CN" → "zh", "pt-BR" → "pt"
 */
const detectDeviceLanguage = () => {
  try {
    const navLang = navigator.language || navigator.languages?.[0] || 'en';
    const code = navLang.split('-')[0].toLowerCase();
    return locales[code] ? code : 'en';
  } catch {
    return 'en';
  }
};

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT must be used within LanguageProvider');
  return ctx.t;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [ready, setReady] = useState(false);

  // Load saved language or auto-detect from device
  useEffect(() => {
    Preferences.get({ key: LANG_KEY }).then(({ value }) => {
      if (value && locales[value]) {
        setLang(value);
      } else {
        // First launch: detect device language
        const detected = detectDeviceLanguage();
        setLang(detected);
        Preferences.set({ key: LANG_KEY, value: detected }).catch(() => {});
      }
      setReady(true);
    }).catch(() => {
      setLang(detectDeviceLanguage());
      setReady(true);
    });
  }, []);

  const changeLang = useCallback((code) => {
    if (!locales[code]) return;
    setLang(code);
    Preferences.set({ key: LANG_KEY, value: code }).catch(() => {});
  }, []);

  /**
   * Translation function.
   * Usage: t('settings.title') → "Vault Settings"
   *        t('home.importSuccess', { count: 5, folder: 'CSV1' }) → "Imported 5 wallets from CSV1"
   */
  const t = useCallback((key, vars) => {
    const currentLocale = locales[lang] || locales.en;
    let value = getNestedValue(currentLocale, key);

    // Fallback to English if key not found in current locale
    if (value === undefined) {
      value = getNestedValue(locales.en, key);
    }

    // If still not found, return the key itself (makes debugging easy)
    if (value === undefined) return key;

    return interpolate(value, vars);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}
