import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type TouchEvent } from 'react';
import { Globe, Moon, Sun, Monitor, Check, ChevronDown, Volume2, Smartphone, Rows3, ShieldCheck, Sparkles, SlidersHorizontal, Zap, ZoomIn, Heart, Droplets, Flame, Gem } from 'lucide-react';
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
import useLiteMode from '../../hooks/useLiteMode';
import { useConfirm } from '../../contexts/ConfirmContext';

const THEME_OPTIONS = [
  { key: 'dark', icon: Moon, label: 'settings.darkMode', color: 'indigo', fallbackLabel: 'Tá»‘i chuyÃªn nghiá»‡p' },
  { key: 'light', icon: Sun, label: 'settings.lightMode', color: 'amber', fallbackLabel: 'SÃ¡ng rÃµ nÃ©t' },
  { key: 'amoled', icon: Monitor, label: 'settings.amoledMode', color: 'slate', fallbackLabel: 'AMOLED' },
  { key: 'pink', icon: Heart, label: 'settings.pinkMode', color: 'pink', fallbackLabel: 'Há»“ng rose' },
  { key: 'blue', icon: Droplets, label: 'settings.blueMode', color: 'blue', fallbackLabel: 'Xanh sapphire' },
  { key: 'red', icon: Flame, label: 'settings.redMode', color: 'red', fallbackLabel: 'Äá» ruby' },
  { key: 'purple', icon: Gem, label: 'settings.purpleMode', color: 'purple', fallbackLabel: 'TÃ­m amethyst' },
  { key: 'emerald', icon: ShieldCheck, label: 'settings.emeraldMode', color: 'emerald', fallbackLabel: 'Xanh ngá»c báº£o máº­t' },
];

const MIN_DISPLAY_SCALE = 5;
const MAX_DISPLAY_SCALE = 200;
const DISPLAY_SCALE_PRESETS = [50, 75, 100, 125, 150, 200];
const MIN_TARGET_DPI = 240;
const MAX_TARGET_DPI = 800;
const DEFAULT_TARGET_DPI = 480;
const TARGET_DPI_PRESETS = [320, 360, 400, 480, 520, 561];
const DENSITY_OPTIONS = [
  { key: 'comfortable', label: 'settings.walletDensityComfortable' },
  { key: 'compact', label: 'settings.walletDensityCompact' },
  { key: 'ultra', label: 'settings.walletDensityUltra' },
];

const clampDisplayScale = (value: number | string) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, parsed));
};

const clampTargetDpi = (value: number | string) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TARGET_DPI;
  return Math.min(MAX_TARGET_DPI, Math.max(MIN_TARGET_DPI, parsed));
};

type ThemeMode = 'dark' | 'light' | 'amoled' | 'pink' | 'blue' | 'red' | 'purple' | 'emerald';
type SettingsSection = 'theme' | 'scale' | 'dpi' | 'density' | 'feedback';
type ToggleRowProps = {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  enabled: boolean;
  activeClass: string;
  iconClass: string;
  onToggle: () => void;
};
type FeedbackType = 'sound' | 'vibration';

function SettingsGroupLabel({ children }: { children: string }) {
  return (
    <div className="mt-5 mb-2 px-1 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-surface-500 first:mt-0">
      {children}
    </div>
  );
}

function ToggleRow({ icon: Icon, title, description, enabled, activeClass, iconClass, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-sm font-medium leading-tight text-white">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-surface-400">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${enabled ? activeClass : 'bg-surface-600'}`}
        aria-pressed={enabled}
      >
        <span className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export default function GeneralTab() {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [draftScale, setDraftScale] = useState<number | null>(null);
  const [scaleInput, setScaleInput] = useState('');
  const [dpiInput, setDpiInput] = useState('');
  const [isScaleInputFocused, setIsScaleInputFocused] = useState(false);
  const [isDpiInputFocused, setIsDpiInputFocused] = useState(false);
  const [feedbackSettings, setFeedbackSettings] = useState(() => getFeedbackSettings());
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>(null);
  const scaleConfirmingRef = useRef(false);
  const dpiConfirmingRef = useRef(false);

  const toggleSection = (section: SettingsSection) => {
    hapticTap();
    setExpandedSection(prev => prev === section ? null : section);
  };

  const { theme, setTheme, displayScale, setDisplayScale, dpiMode, setDpiMode, targetDpi, setTargetDpi, deviceDpi, effectiveDisplayScale, rawEffectiveDisplayScale, effectiveDisplayScaleClamped, dpiNativeSupported, walletDensity, setWalletDensity, brandReminders, setBrandReminders, showWalletScores, setShowWalletScores, compactBalance, setCompactBalance } = useTheme();
  const t = useT();
  const showConfirm = useConfirm();
  const { lang, changeLang } = useLanguage();
  const currentLang = LANGUAGES.find(l => l.code === lang);
  const { isLiteMode, toggleLiteMode } = useLiteMode();
  const visibleScale = draftScale ?? displayScale;
  const scaleProgress = ((visibleScale - MIN_DISPLAY_SCALE) / (MAX_DISPLAY_SCALE - MIN_DISPLAY_SCALE)) * 100;
  const visibleDpi = clampTargetDpi(isDpiInputFocused && dpiInput ? dpiInput : targetDpi);
  const dpiProgress = ((visibleDpi - MIN_TARGET_DPI) / (MAX_TARGET_DPI - MIN_TARGET_DPI)) * 100;
  const dpiScaleRatio = effectiveDisplayScale / 100;

  useEffect(() => {
    setDraftScale(displayScale);
    if (!isScaleInputFocused) setScaleInput(String(displayScale));
  }, [displayScale, isScaleInputFocused]);

  useEffect(() => {
    if (!isScaleInputFocused) setScaleInput(String(visibleScale));
  }, [visibleScale, isScaleInputFocused]);

  useEffect(() => {
    if (!isDpiInputFocused) setDpiInput(String(targetDpi));
  }, [targetDpi, isDpiInputFocused]);

  const requestScaleChange = async (value: number | string) => {
    const nextScale = clampDisplayScale(value);
    setDraftScale(nextScale);
    setScaleInput(String(nextScale));

    if (nextScale === displayScale) return;
    if (scaleConfirmingRef.current) return;

    scaleConfirmingRef.current = true;
    const ok = await showConfirm(
      t('settings.displayScaleConfirmMessage', { from: displayScale, to: nextScale }),
      {
        title: t('settings.displayScaleConfirmTitle'),
        confirmText: t('settings.applyScale'),
        cancelText: t('common.cancel')
      }
    );
    scaleConfirmingRef.current = false;

    if (ok) {
      setDisplayScale(nextScale);
      hapticSuccess();
      return;
    }

    setDraftScale(displayScale);
    setScaleInput(String(displayScale));
  };

  const commitScaleInput = () => {
    if (scaleInput.trim() === '') {
      setScaleInput(String(displayScale));
      setDraftScale(displayScale);
      setIsScaleInputFocused(false);
      return;
    }

    const nextScale = clampDisplayScale(scaleInput);
    setIsScaleInputFocused(false);
    requestScaleChange(nextScale);
  };

  const commitScaleDraft = (value: number | string = visibleScale) => {
    requestScaleChange(value);
  };

  const requestDpiModeChange = async (enabled: boolean) => {
    if (enabled === dpiMode) return;

    const nextDpi = enabled ? DEFAULT_TARGET_DPI : targetDpi;
    const nextScale = enabled ? Math.round((Math.max(deviceDpi, 1) / nextDpi) * displayScale) : effectiveDisplayScale;

    const ok = await showConfirm(
      t(enabled ? 'settings.dpiModeEnableConfirmMessage' : 'settings.dpiModeDisableConfirmMessage', { dpi: nextDpi, deviceDpi, scale: nextScale }),
      {
        title: t('settings.dpiModeConfirmTitle'),
        confirmText: t(enabled ? 'settings.enableDpiMode' : 'settings.disableDpiMode'),
        cancelText: t('common.cancel')
      }
    );

    if (ok) {
      if (enabled) {
        setTargetDpi(DEFAULT_TARGET_DPI);
      }
      setDpiMode(enabled);
      hapticSuccess();
    }
  };

  const requestDpiChange = async (value: number | string) => {
    const nextDpi = clampTargetDpi(value);
    setDpiInput(String(nextDpi));

    if (nextDpi === targetDpi) return;
    if (dpiConfirmingRef.current) return;

    dpiConfirmingRef.current = true;
    const nextScale = Math.round((Math.max(deviceDpi, 1) / nextDpi) * displayScale);
    const ok = await showConfirm(
      t('settings.dpiConfirmMessage', { from: targetDpi, to: nextDpi, deviceDpi, scale: nextScale }),
      {
        title: t('settings.dpiConfirmTitle'),
        confirmText: t('settings.applyDpi'),
        cancelText: t('common.cancel')
      }
    );
    dpiConfirmingRef.current = false;

    if (ok) {
      setTargetDpi(nextDpi);
      hapticSuccess();
      return;
    }

    setDpiInput(String(targetDpi));
  };

  const commitDpiInput = () => {
    if (dpiInput.trim() === '') {
      setDpiInput(String(targetDpi));
      setIsDpiInputFocused(false);
      return;
    }

    const nextDpi = clampTargetDpi(dpiInput);
    setIsDpiInputFocused(false);
    requestDpiChange(nextDpi);
  };

  const toggleFeedback = async (type: FeedbackType) => {
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
      <SettingsGroupLabel>{t('settings.language')}</SettingsGroupLabel>

      {/* â•â•â• Language Picker â•â•â• */}
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


      <SettingsGroupLabel>{t('settings.appearance')}</SettingsGroupLabel>

      {/* â•â•â• Theme Selector â•â•â• */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => toggleSection('theme')}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Moon size={20} className="text-indigo-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">{t('settings.appearance')}</p>
              <p className="text-xs text-surface-400">{t(`settings.${theme}Mode`)}</p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-surface-500 transition-transform duration-200 ${expandedSection === 'theme' ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'theme' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4 border-t border-surface-700/50 pt-4 sm:grid-cols-3">
            {THEME_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = theme === opt.key;
              return (
                <button key={opt.key} onClick={() => { hapticTap(); setTheme(opt.key as ThemeMode); }}
                  className={`btn-glow flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all
                    ${active ? 'bg-brand-500/15 border-2 border-brand-500/40 text-white' : 'bg-surface-800/60 border-2 border-transparent text-surface-400 hover:text-white'}`}>
                  <Icon size={14} />
                  {t(opt.label)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* â•â•â• Display Scale â•â•â• */}
      <div className="glass-card overflow-hidden mt-4">
        <button
          onClick={() => toggleSection('scale')}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <ZoomIn size={20} className="text-brand-400" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-white font-medium text-sm">{t('settings.displayScale')}</p>
              <p className="text-xs text-surface-400">
                <span>{displayScale}%</span>
                <span aria-hidden="true" className="text-surface-500">·</span>
                <span>{t(dpiMode ? 'settings.manualScalePaused' : 'settings.manualScaleActive')}</span>
              </p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-surface-500 transition-transform duration-200 ${expandedSection === 'scale' ? 'rotate-180' : ''}`} />
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'scale' ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 border-t border-surface-700/50 pt-4">
            <p className="text-xs text-surface-400 leading-relaxed mb-4">{t('settings.displayScaleDesc')}</p>

            {dpiMode && (
              <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                {t('settings.displayScalePausedByDpi')}
              </div>
            )}

            {effectiveDisplayScaleClamped && (
              <div className="mb-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs leading-relaxed text-orange-100">
                {t('settings.effectiveScaleClamped', { raw: rawEffectiveDisplayScale, applied: effectiveDisplayScale })}
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {DISPLAY_SCALE_PRESETS.map(scale => {
                const active = displayScale === scale;
                return (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => { hapticTap(); requestScaleChange(scale); }}
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
              <span className="rounded-full border border-surface-700 bg-surface-800/50 px-2.5 py-1 text-xs font-semibold text-brand-300">
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
                  value={visibleScale}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const nextScale = clampDisplayScale(e.target.value);
                    setDraftScale(nextScale);
                    if (!isScaleInputFocused) setScaleInput(String(nextScale));
                  }}
                  onPointerUp={(e: PointerEvent<HTMLInputElement>) => commitScaleDraft(e.currentTarget.value)}
                  onTouchEnd={(e: TouchEvent<HTMLInputElement>) => commitScaleDraft(e.currentTarget.value)}
                  onBlur={(e: FocusEvent<HTMLInputElement>) => commitScaleDraft(e.currentTarget.value)}
                  style={{ '--scale-progress': `${scaleProgress}%` } as CSSProperties}
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setScaleInput(e.target.value);
                    }}
                    onFocus={() => {
                      setIsScaleInputFocused(true);
                      setScaleInput(String(visibleScale));
                    }}
                    onBlur={commitScaleInput}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
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
                <div className="flex justify-between text-[0.625rem] font-semibold text-surface-500">
                  <span>{MIN_DISPLAY_SCALE}%</span>
                  <span>100%</span>
                  <span>{MAX_DISPLAY_SCALE}%</span>
                </div>
                <div />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â•â•â• DPI Balanced Display â•â•â• */}
      <div className="glass-card overflow-hidden mt-4">
        <button
          onClick={() => toggleSection('dpi')}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <SlidersHorizontal size={20} className="text-cyan-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">{t('settings.dpiMode')}</p>
              <p className="text-xs text-surface-400">{dpiMode ? `${targetDpi} dp · ${effectiveDisplayScale}%` : t('settings.disabled')}</p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-surface-500 transition-transform duration-200 ${expandedSection === 'dpi' ? 'rotate-180' : ''}`} />
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'dpi' ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 border-t border-surface-700/50 pt-4">
            <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t('settings.dpiBalancedTitle')}</p>
                <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.dpiModeDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => { hapticTap(); requestDpiModeChange(!dpiMode); }}
                className={`relative flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${dpiMode ? 'bg-cyan-500' : 'bg-surface-600'}`}
                aria-pressed={dpiMode}
              >
                <span className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dpiMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {dpiMode && !dpiNativeSupported && (
              <div className="mb-4 rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-100">
                {t('settings.dpiFallbackMode')}
              </div>
            )}

            {effectiveDisplayScaleClamped && (
              <div className="mb-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs leading-relaxed text-orange-100">
                {t('settings.effectiveScaleClamped', { raw: rawEffectiveDisplayScale, applied: effectiveDisplayScale })}
              </div>
            )}

            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-surface-700/70 bg-surface-950/50 px-2 py-2">
                <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-surface-500">{t('settings.deviceDpi')}</p>
                <p className="mt-1 text-sm font-bold text-white">{deviceDpi}</p>
              </div>
              <div className="rounded-xl border border-surface-700/70 bg-surface-950/50 px-2 py-2">
                <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-surface-500">{t('settings.targetDpi')}</p>
                <p className="mt-1 text-sm font-bold text-cyan-200">{targetDpi}</p>
              </div>
              <div className="rounded-xl border border-surface-700/70 bg-surface-950/50 px-2 py-2">
                <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-surface-500">{t('settings.effectiveScale')}</p>
                <p className="mt-1 text-sm font-bold text-brand-300">×{dpiScaleRatio.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {TARGET_DPI_PRESETS.map(dpi => {
                const active = targetDpi === dpi;
                return (
                  <button
                    key={dpi}
                    type="button"
                    onClick={() => { hapticTap(); requestDpiChange(dpi); }}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                      active
                        ? 'border-cyan-500/50 bg-cyan-500/15 text-white shadow-sm shadow-cyan-500/10'
                        : 'border-surface-700 bg-surface-800/60 text-surface-300 hover:border-surface-600 hover:text-white'
                    }`}
                  >
                    {dpi}
                  </button>
                );
              })}
            </div>

            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-surface-400">
                {t('settings.targetDpiCustom')}
              </label>
              <span className="rounded-full border border-surface-700 bg-surface-800/50 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                {MIN_TARGET_DPI}-{MAX_TARGET_DPI} dp
              </span>
            </div>

            <div className="rounded-2xl border border-surface-700/70 bg-surface-950/35 p-3">
              <div className="grid grid-cols-[1fr_6rem] items-center gap-3">
                <input
                  type="range"
                  min={MIN_TARGET_DPI}
                  max={MAX_TARGET_DPI}
                  step="10"
                  value={visibleDpi}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setDpiInput(String(clampTargetDpi(e.target.value)));
                  }}
                  onPointerUp={(e: PointerEvent<HTMLInputElement>) => requestDpiChange(e.currentTarget.value)}
                  onTouchEnd={(e: TouchEvent<HTMLInputElement>) => requestDpiChange(e.currentTarget.value)}
                  onBlur={(e: FocusEvent<HTMLInputElement>) => requestDpiChange(e.currentTarget.value)}
                  style={{ '--scale-progress': `${dpiProgress}%` } as CSSProperties}
                  className="scale-range"
                />
                <div className="flex h-11 items-center justify-center gap-1 rounded-xl border border-surface-700 bg-surface-950/80 px-2 shadow-inner shadow-black/20 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/15">
                  <input
                    type="number"
                    min={MIN_TARGET_DPI}
                    max={MAX_TARGET_DPI}
                    step="10"
                    inputMode="numeric"
                    value={dpiInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDpiInput(e.target.value)}
                    onFocus={() => {
                      setIsDpiInputFocused(true);
                      setDpiInput(String(targetDpi));
                    }}
                    onBlur={commitDpiInput}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') {
                        setDpiInput(String(targetDpi));
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-14 bg-transparent text-right text-base font-bold leading-none text-white outline-none"
                  />
                  <span className="text-xs font-semibold text-surface-400">dp</span>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-surface-400">
                {t('settings.dpiCalculatedScale', { dpi: targetDpi, deviceDpi, scale: effectiveDisplayScale })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* â•â•â• Wallet Density â•â•â• */}
      <div className="glass-card overflow-hidden mt-4">
        <button
          onClick={() => toggleSection('density')}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Rows3 size={20} className="text-violet-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">{t('settings.walletDensity')}</p>
              <p className="text-xs text-surface-400">{t(`settings.walletDensity${walletDensity.charAt(0).toUpperCase() + walletDensity.slice(1)}`)}</p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-surface-500 transition-transform duration-200 ${expandedSection === 'density' ? 'rotate-180' : ''}`} />
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'density' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 border-t border-surface-700/50 pt-4">
            <p className="text-xs text-surface-400 leading-relaxed mb-4">{t('settings.walletDensityDesc')}</p>
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
        </div>
      </div>

      {/* â•â•â• Lite Mode â€” visible in Appearance/General settings â•â•â• */}
      <div className="glass-card overflow-hidden mt-4">
        <div className="p-4">
          <ToggleRow
            icon={Zap}
            title={t('settings.liteMode')}
            description={t('settings.liteModeDesc')}
            enabled={isLiteMode}
            activeClass="bg-emerald-500"
            iconClass="bg-emerald-500/10 text-emerald-400"
            onToggle={() => { hapticTap(); toggleLiteMode(); }}
          />
        </div>
      </div>

      <SettingsGroupLabel>{t('settings.walletDisplay')}</SettingsGroupLabel>

      {/* â•â•â• Wallet Display Options â•â•â• */}
      <div className="glass-card overflow-hidden mt-4">
        <div className="space-y-0 divide-y divide-surface-700/50">
          <div className="p-4">
            <ToggleRow
              icon={ShieldCheck}
              title={t('settings.brandReminders')}
              description={t('settings.brandRemindersDesc')}
              enabled={brandReminders}
              activeClass="bg-emerald-500"
              iconClass="bg-emerald-500/10 text-emerald-400"
              onToggle={() => { hapticTap(); setBrandReminders(!brandReminders); }}
            />
          </div>
          <div className="p-4">
            <ToggleRow
              icon={Sparkles}
              title={t('settings.walletScores')}
              description={t('settings.walletScoresDesc')}
              enabled={showWalletScores}
              activeClass="bg-cyan-500"
              iconClass="bg-cyan-500/10 text-cyan-400"
              onToggle={() => { hapticTap(); setShowWalletScores(!showWalletScores); }}
            />
          </div>
          <div className="p-4">
            <ToggleRow
              icon={SlidersHorizontal}
              title={t('settings.compactBalance')}
              description={t('settings.compactBalanceDesc')}
              enabled={compactBalance}
              activeClass="bg-violet-500"
              iconClass="bg-violet-500/10 text-violet-400"
              onToggle={() => { hapticTap(); setCompactBalance(!compactBalance); }}
            />
          </div>
        </div>
      </div>

      <SettingsGroupLabel>{t('settings.feedback')}</SettingsGroupLabel>

      {/* â•â•â• Feedback Options â•â•â• */}
      <div className="glass-card overflow-hidden mt-4">
        <button
          onClick={() => toggleSection('feedback')}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Volume2 size={20} className="text-sky-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">{t('settings.feedback')}</p>
              <p className="text-xs text-surface-400">
                {(feedbackSettings.soundEnabled || feedbackSettings.vibrationEnabled) ? t('settings.enabled') : t('settings.disabled')}
              </p>
            </div>
          </div>
          <ChevronDown size={18} className={`text-surface-500 transition-transform duration-200 ${expandedSection === 'feedback' ? 'rotate-180' : ''}`} />
        </button>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'feedback' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 border-t border-surface-700/50 pt-4">
            <p className="text-xs text-surface-400 leading-relaxed mb-4">{t('settings.feedbackDesc')}</p>
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
        </div>
      </div>


    </>
  );
}

