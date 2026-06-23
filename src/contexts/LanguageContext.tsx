import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { defaultLocale, isSupportedLanguage, loadLocale, type LanguageCode } from '../locales';

type LocalePrimitive = string | number | boolean | null | undefined;
type LocaleValue = LocalePrimitive | LocaleValue[] | { [key: string]: LocaleValue };
type LocaleTree = { [key: string]: LocaleValue };
export type TranslationVars = Record<string, LocalePrimitive>;
export type TranslationFn = (key: string, vars?: TranslationVars) => string;

type LanguageContextValue = {
  lang: string;
  changeLang: (code: string) => void;
  t: TranslationFn;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANG_KEY = 'xkey_language';

/**
 * Get a nested value from an object using dot notation.
 */
const getNestedValue = (obj: LocaleTree | undefined, path: string): LocaleValue => {
  let current: LocaleValue = obj;
  for (const key of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = current[key];
  }
  return current;
};

/**
 * Replace template variables: "Hello {name}" + {name: "World"} → "Hello World"
 */
const interpolate = (str: LocaleValue, vars?: TranslationVars): string => {
  if (typeof str !== 'string') return String(str ?? '');
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, key: string) => (
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  ));
};

/**
 * Detect the best matching language from the device/browser.
 * e.g. "vi-VN" → "vi", "zh-CN" → "zh", "pt-BR" → "pt"
 */
const detectDeviceLanguage = (): string => {
  try {
    const navLang = navigator.language || navigator.languages?.[0] || 'en';
    const code = navLang.split('-')[0].toLowerCase();
    return isSupportedLanguage(code) ? code : 'en';
  } catch {
    return 'en';
  }
};

export function useT(): TranslationFn {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT must be used within LanguageProvider');
  return ctx.t;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState('en');
  const [ready, setReady] = useState(false);
  const [loadedLocales, setLoadedLocales] = useState<Record<string, LocaleTree>>({ en: defaultLocale });
  const loadedLocalesRef = useRef<Record<string, LocaleTree>>({ en: defaultLocale });

  const loadLocaleTree = useCallback(async (code: string): Promise<LanguageCode> => {
    const safeCode = isSupportedLanguage(code) ? code : 'en';
    if (!loadedLocalesRef.current[safeCode]) {
      const locale = await loadLocale(safeCode);
      loadedLocalesRef.current = { ...loadedLocalesRef.current, [safeCode]: locale };
      setLoadedLocales(prev => ({ ...prev, [safeCode]: locale }));
    }
    return safeCode;
  }, []);

  // Load saved language or auto-detect from device
  useEffect(() => {
    let active = true;
    Preferences.get({ key: LANG_KEY }).then(({ value }) => {
      const nextLang = value && isSupportedLanguage(value) ? value : detectDeviceLanguage();
      return loadLocaleTree(nextLang).then(code => {
        if (!active) return;
        setLang(code);
        if (!value || value !== code) Preferences.set({ key: LANG_KEY, value: code }).catch(() => {});
        setReady(true);
      });
    }).catch(() => {
      if (!active) return;
      setLang('en');
      setReady(true);
    });
    return () => { active = false; };
  }, [loadLocaleTree]);

  const changeLang = useCallback((code: string) => {
    if (!isSupportedLanguage(code)) return;
    loadLocaleTree(code)
      .then(safeCode => {
        setLang(safeCode);
        Preferences.set({ key: LANG_KEY, value: safeCode }).catch(() => {});
      })
      .catch(() => {});
  }, [loadLocaleTree]);

  /**
   * Translation function.
   * Usage: t('settings.title') → "Vault Settings"
   *        t('home.importSuccess', { count: 5, folder: 'CSV1' }) → "Imported 5 wallets from CSV1"
   */
  const t = useCallback<TranslationFn>((key, vars) => {
    const currentLocale = loadedLocales[lang] || defaultLocale;
    let value = getNestedValue(currentLocale, key);

    // Fallback to English if key not found in current locale
    if (value === undefined) {
      value = getNestedValue(defaultLocale, key);
    }

    // If still not found, return the key itself (makes debugging easy)
    if (value === undefined) return key;

    return interpolate(value, vars);
  }, [lang, loadedLocales]);

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}
