import { useEffect, useState } from 'react';
import { Globe, Moon, Sun, Monitor, Check, ChevronDown, Heart, Volume2, Smartphone, Rows3, Clock3, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useT, useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES } from '../../locales';
import {
  getFeedbackSettings,
  hapticSuccess,
  hapticTap,
  setSoundEnabled,
  setVibrationEnabled,
} from '../../utils/haptics';
import DonateModal from '../DonateModal';
import useLiteMode from '../../hooks/useLiteMode';
import { clearActionHistory, getActionHistory } from '../../utils/actionHistory';

const THEME_OPTIONS = [
  { key: 'dark', icon: Moon, label: 'settings.darkMode', color: 'indigo' },
  { key: 'light', icon: Sun, label: 'settings.lightMode', color: 'amber' },
  { key: 'amoled', icon: Monitor, label: 'settings.amoledMode', color: 'slate' },
];

const MIN_DISPLAY_SCALE = 5;
const MAX_DISPLAY_SCALE = 200;
const DISPLAY_SCALE_PRESETS = [50, 75, 100, 125, 150, 200];
const DENSITY_OPTIONS = [
  { key: 'comfortable', label: 'settings.walletDensityComfortable' },
  { key: 'compact', label: 'settings.walletDensityCompact' },
  { key: 'ultra', label: 'settings.walletDensityUltra' },
];

const clampDisplayScale = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, parsed));
};

export default function GeneralTab() {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [scaleInput, setScaleInput] = useState('');
  const [isScaleInputFocused, setIsScaleInputFocused] = useState(false);
  const [feedbackSettings, setFeedbackSettings] = useState(() => getFeedbackSettings());
  const [actionHistory, setActionHistory] = useState([]);

  const { theme, setTheme, displayScale, setDisplayScale, walletDensity, setWalletDensity } = useTheme();
  const t = useT();
  const { lang, changeLang } = useLanguage();
  const currentLang = LANGUAGES.find(l => l.code === lang);
  const { isLiteMode, toggleLiteMode } = useLiteMode();
  const scaleProgress = ((displayScale - MIN_DISPLAY_SCALE) / (MAX_DISPLAY_SCALE - MIN_DISPLAY_SCALE)) * 100;

  useEffect(() => {
    if (!isScaleInputFocused) setScaleInput(String(displayScale));
  }, [displayScale, isScaleInputFocused]);

  useEffect(() => {
    let mounted = true;
    getActionHistory().then(items => { if (mounted) setActionHistory(items); });
    const handleUpdate = (event) => setActionHistory(event.detail || []);
    window.addEventListener('xkey-action-history-updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('xkey-action-history-updated', handleUpdate);
    };
  }, []);

  const commitScaleInput = () => {
    if (scaleInput.trim() === '') {
      setScaleInput(String(displayScale));
      setIsScaleInputFocused(false);
      return;
    }

    const nextScale = clampDisplayScale(scaleInput);
    setDisplayScale(nextScale);
    setScaleInput(String(nextScale));
    setIsScaleInputFocused(false);
  };

  const toggleFeedback = async (type) => {
    if (type === 'sound') {
      const next = !feedbackSettings.soundEnabled;
      setSoundEnabled(next);
      setFeedbackSettings(getFeedbackSettings());
      if (next) hapticSuccess();
      else hapticTap();
      return;
    }

    const next = !feedbackSettings.vibrationEnabled;
    await setVibrationEnabled(next);
    setFeedbackSettings(getFeedbackSettings());
    if (next) hapticSuccess();
    else hapticTap();
  };

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

      {/* ═══ Display Scale ═══ */}
      <div className="glass-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Monitor size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{t('settings.displayScale')}</p>
              <p className="text-xs text-surface-400 leading-relaxed">{t('settings.displayScaleDesc')}</p>
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-surface-800/70 border border-surface-700 px-3 py-1 text-xs font-semibold text-white">
            {displayScale}%
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {DISPLAY_SCALE_PRESETS.map(scale => {
            const active = displayScale === scale;
            return (
              <button
                key={scale}
                type="button"
                onClick={() => { hapticTap(); setDisplayScale(scale); }}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'border-brand-500/50 bg-brand-500/15 text-white shadow-sm shadow-brand-500/10'
                    : 'border-surface-700 bg-surface-800/60 text-surface-300 hover:border-surface-600 hover:text-white'
                }`}
              >
                {scale}%
              </button>
            );
          })}
        </div>

        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-xs font-medium text-surface-400">
            {t('settings.displayScaleCustom')}
          </label>
          <span className="rounded-full border border-surface-700 bg-surface-800/50 px-2.5 py-1 text-[11px] font-semibold text-brand-300">
            {MIN_DISPLAY_SCALE}-{MAX_DISPLAY_SCALE}%
          </span>
        </div>

        <div className="rounded-2xl border border-surface-700/70 bg-surface-950/35 p-3">
          <div className="grid grid-cols-[1fr_5.5rem] items-center gap-3">
            <input
              type="range"
              min={MIN_DISPLAY_SCALE}
              max={MAX_DISPLAY_SCALE}
              step="5"
              value={displayScale}
              onChange={(e) => setDisplayScale(e.target.value)}
              style={{ '--scale-progress': `${scaleProgress}%` }}
              className="scale-range"
            />
            <div className="flex h-11 items-center justify-center gap-1 rounded-xl border border-surface-700 bg-surface-950/80 px-2 shadow-inner shadow-black/20 focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/15">
              <input
                type="number"
                min={MIN_DISPLAY_SCALE}
                max={MAX_DISPLAY_SCALE}
                step="5"
                inputMode="numeric"
                value={scaleInput}
                onChange={(e) => {
                  setScaleInput(e.target.value);
                }}
                onFocus={() => {
                  setIsScaleInputFocused(true);
                  setScaleInput(String(displayScale));
                }}
                onBlur={commitScaleInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    setScaleInput(String(displayScale));
                    e.currentTarget.blur();
                  }
                }}
                className="w-12 bg-transparent text-right text-base font-bold leading-none text-white outline-none"
              />
              <span className="text-xs font-semibold text-surface-400">%</span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[1fr_5.5rem] gap-3">
            <div className="flex justify-between text-[10px] font-semibold text-surface-500">
              <span>{MIN_DISPLAY_SCALE}%</span>
              <span>100%</span>
              <span>{MAX_DISPLAY_SCALE}%</span>
            </div>
            <div />
          </div>
        </div>
      </div>

      {/* ═══ Wallet Density ═══ */}
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Rows3 size={20} className="text-violet-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{t('settings.walletDensity')}</p>
            <p className="text-xs text-surface-400">{t('settings.walletDensityDesc')}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DENSITY_OPTIONS.map(option => {
            const active = walletDensity === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => { hapticTap(); setWalletDensity(option.key); }}
                className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? 'border-violet-500/50 bg-violet-500/15 text-white'
                    : 'border-surface-700 bg-surface-800/60 text-surface-300 hover:border-surface-600 hover:text-white'
                }`}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Feedback Options ═══ */}
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Volume2 size={20} className="text-sky-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{t('settings.feedback')}</p>
            <p className="text-xs text-surface-400">{t('settings.feedbackDesc')}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => toggleFeedback('sound')}
            className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${
              feedbackSettings.soundEnabled
                ? 'border-sky-500/40 bg-sky-500/10 text-white'
                : 'border-surface-700 bg-surface-800/60 text-surface-300 hover:border-surface-600'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Volume2 size={16} />
              {t('settings.soundFeedback')}
            </span>
            <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${feedbackSettings.soundEnabled ? 'bg-sky-500' : 'bg-surface-600'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${feedbackSettings.soundEnabled ? 'translate-x-4' : ''}`} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => toggleFeedback('vibration')}
            className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${
              feedbackSettings.vibrationEnabled
                ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                : 'border-surface-700 bg-surface-800/60 text-surface-300 hover:border-surface-600'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Smartphone size={16} />
              {t('settings.vibrationFeedback')}
            </span>
            <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${feedbackSettings.vibrationEnabled ? 'bg-emerald-500' : 'bg-surface-600'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${feedbackSettings.vibrationEnabled ? 'translate-x-4' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {/* ═══ Action History ═══ */}
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock3 size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{t('settings.activityHistory')}</p>
              <p className="text-xs text-surface-400">{t('settings.activityHistoryDesc')}</p>
            </div>
          </div>
          {actionHistory.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                hapticTap();
                await clearActionHistory();
              }}
              className="flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-800/60 px-2.5 py-2 text-xs font-semibold text-surface-300 hover:text-red-300"
            >
              <Trash2 size={13} />
              {t('settings.clearHistory')}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {actionHistory.length === 0 ? (
            <p className="rounded-xl border border-surface-700/70 bg-surface-900/40 px-3 py-3 text-center text-xs text-surface-400">
              {t('settings.noActivityHistory')}
            </p>
          ) : (
            actionHistory.slice(0, 6).map(item => (
              <div key={item.id} className="rounded-xl border border-surface-700/70 bg-surface-900/40 px-3 py-2">
                <p className="line-clamp-2 text-xs font-medium text-surface-200">{item.message}</p>
                <p className="mt-1 text-[10px] text-surface-500">{new Date(item.ts).toLocaleString()}</p>
              </div>
            ))
          )}
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
              <p className="text-white font-medium text-sm">{t('settings.liteMode')}</p>
              <p className="text-xs text-surface-400">{t('settings.liteModeDesc')}</p>
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
            {t('donate.button')}
          </button>
        </div>
      </div>

      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
    </>
  );
}
