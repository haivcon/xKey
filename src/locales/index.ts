import en from './en';

export type LanguageCode = 'en' | 'vi' | 'zh' | 'ko' | 'ja' | 'ru' | 'hi' | 'ar' | 'id' | 'th' | 'fr' | 'es' | 'pt' | 'de' | 'tr';

export type LanguageOption = {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
};

export type LocaleValue = string | number | boolean | null | undefined | LocaleValue[] | { [key: string]: LocaleValue };
export type LocaleTree = { [key: string]: LocaleValue };

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

const localeLoaders: Record<LanguageCode, () => Promise<{ default: LocaleTree }>> = {
  en: () => Promise.resolve({ default: en as LocaleTree }),
  vi: () => import('./vi'),
  zh: () => import('./zh'),
  ko: () => import('./ko'),
  ja: () => import('./ja'),
  ru: () => import('./ru'),
  hi: () => import('./hi'),
  ar: () => import('./ar'),
  id: () => import('./id'),
  th: () => import('./th'),
  fr: () => import('./fr'),
  es: () => import('./es'),
  pt: () => import('./pt'),
  de: () => import('./de'),
  tr: () => import('./tr'),
};

export const defaultLocale = en as LocaleTree;
export const isSupportedLanguage = (code: string): code is LanguageCode => (
  Object.prototype.hasOwnProperty.call(localeLoaders, code)
);

export const loadLocale = async (code: LanguageCode): Promise<LocaleTree> => {
  const module = await localeLoaders[code]();
  return module.default;
};
