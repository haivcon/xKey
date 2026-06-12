import { useState } from 'react';
import { Globe, Moon, Sun, Monitor, Check, ChevronDown, Heart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useT, useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES } from '../../locales';
import { hapticTap } from '../../utils/haptics';
import DonateModal from '../DonateModal';
import useLiteMode from '../../hooks/useLiteMode';

const THEME_OPTIONS = [
  { key: 'dark', icon: Moon, label: 'settings.darkMode', color: 'indigo' },
  { key: 'light', icon: Sun, label: 'settings.lightMode', color: 'amber' },
  { key: 'amoled', icon: Monitor, label: 'settings.amoledMode', color: 'slate' },
];

export default function GeneralTab() {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  const { theme, setTheme } = useTheme();
  const t = useT();
  const { lang, changeLang } = useLanguage();
  const currentLang = LANGUAGES.find(l => l.code === lang);
  const { isLiteMode, toggleLiteMode } = useLiteMode();

  return (
    <>
      {/* ═══ Language Picker ═══ */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => { hapticTap(); setShowLangPicker(!showLangPicker); }}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Globe size={20} className="text-brand-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">{t('settings.language')}</p>
              <p className="text-xs text-surface-400">{currentLang?.flag} {currentLang?.nativeName}</p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-surface-500 transition-transform duration-200 ${showLangPicker ? 'rotate-180' : ''}`} />
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showLangPicker ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 border-t border-surface-700/50">
            <p className="text-xs text-surface-500 py-3">{t('settings.languageDesc')}</p>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map(l => {
                const isActive = lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => { changeLang(l.code); setShowLangPicker(false); }}
                    className={`relative flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-all duration-150 
                      ${isActive 
                        ? 'bg-brand-500/15 border-2 border-brand-500/40 text-white shadow-lg shadow-brand-500/5' 
                        : 'bg-surface-800/60 border-2 border-transparent text-surface-400 hover:bg-surface-700/80 hover:text-white hover:border-surface-600'}`}
                  >
                    <span className="text-xl leading-none">{l.flag}</span>
                    <span className="font-medium truncate w-full text-center">{l.nativeName}</span>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center shadow-md">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Theme Selector ═══ */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Moon size={20} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{t('settings.appearance')}</p>
            <p className="text-xs text-surface-400">{t(`settings.${theme}Mode`)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = theme === opt.key;
            return (
              <button key={opt.key} onClick={() => { hapticTap(); setTheme(opt.key); }}
                className={`btn-glow flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all
                  ${active ? 'bg-brand-500/15 border-2 border-brand-500/40 text-white' : 'bg-surface-800/60 border-2 border-transparent text-surface-400 hover:text-white'}`}>
                <Icon size={14} />
                {t(opt.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Performance Options ═══ */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Monitor size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Lite Mode</p>
              <p className="text-xs text-surface-400">Disable blurs for low-end devices</p>
            </div>
          </div>
          <button
            onClick={() => { hapticTap(); toggleLiteMode(); }}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${isLiteMode ? 'bg-emerald-500' : 'bg-surface-600'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-transform ${isLiteMode ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* ═══ Donate ═══ */}
      <div className="bg-gradient-to-br from-brand-600/10 via-fuchsia-500/10 to-surface-800 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Heart size={20} className="text-white fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('donate.title')}</h2>
              <p className="text-xs text-brand-400">{t('donate.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowDonate(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-brand-500/20 transition-all active:scale-95"
          >
            Donate
          </button>
        </div>
      </div>

      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
    </>
  );
}
