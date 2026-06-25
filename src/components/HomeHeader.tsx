import type { RefObject } from 'react';
import { Bell, Heart, Settings } from 'lucide-react';
import { hapticTap } from '../utils/haptics';
import { XKEY_SLOGAN } from '../utils/branding';
import { HEADER_SLOGAN_LETTERS } from '../app/constants';
import type { TranslationFn } from '../contexts/LanguageContext';

type HomeHeaderProps = {
  headerRef: RefObject<HTMLElement | null>;
  version: string;
  brandReminders: boolean;
  keyHealthAttentionCount: number;
  t: TranslationFn;
  onOpenKeyHealth: () => void;
  onOpenDonate: () => void;
  onOpenSettings: () => void;
};

export default function HomeHeader({
  headerRef,
  version,
  brandReminders,
  keyHealthAttentionCount,
  t,
  onOpenKeyHealth,
  onOpenDonate,
  onOpenSettings,
}: HomeHeaderProps) {
  const handleOpenKeyHealth = () => {
    hapticTap();
    onOpenKeyHealth();
  };

  const handleOpenDonate = () => {
    hapticTap();
    onOpenDonate();
  };

  const handleOpenSettings = () => {
    hapticTap();
    onOpenSettings();
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 bg-surface-900/95 backdrop-blur-md border-b border-surface-800 px-[clamp(0.625rem,3vw,1rem)] py-[clamp(0.625rem,2.6vw,1rem)] shadow-xl"
    >
      <div className="max-w-[140rem] mx-auto w-full">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[clamp(0.25rem,1.8vw,0.5rem)]">
          <div className="flex min-w-0 items-center gap-[clamp(0.25rem,1.5vw,0.5rem)]">
            <img src="/logo.png" alt="xKey" className="home-header-logo rounded-lg logo-animated" />
            <div className="flex min-w-0 items-baseline gap-[clamp(0.125rem,0.8vw,0.25rem)]">
              <h1 className="home-header-title font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-surface-400 leading-tight">
                xKey
              </h1>
              <span className="home-header-version shrink-0 font-semibold leading-none text-surface-400">
                {version}
              </span>
            </div>
          </div>
          <div className="pointer-events-none min-w-0 justify-self-center text-center" aria-label={XKEY_SLOGAN}>
            {brandReminders && (
              <div className="home-header-slogan whitespace-nowrap text-center">
                {HEADER_SLOGAN_LETTERS.map((letter, index) => (
                  <span
                    key={`${letter}-${index}`}
                    className={letter === ' ' ? 'home-header-slogan-space' : 'home-header-slogan-letter'}
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    {letter === ' ' ? '\u00A0' : letter}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-self-end gap-1">
            <button
              onClick={handleOpenKeyHealth}
              className="btn-icon-glow relative rounded-full bg-surface-800 p-2 text-surface-400 transition-colors hover:bg-surface-700 hover:text-white"
              title={t('keyHealth.title')}
              aria-label={t('keyHealth.title')}
            >
              <Bell size={20} />
              {keyHealthAttentionCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-surface-900 bg-red-500 px-1 text-[9px] font-black leading-none text-white">
                  {Math.min(9, keyHealthAttentionCount)}
                </span>
              )}
            </button>
            <button
              onClick={handleOpenDonate}
              className="p-2 bg-gradient-to-br from-fuchsia-500/20 to-brand-500/20 hover:from-fuchsia-500/30 hover:to-brand-500/30 border border-fuchsia-500/30 rounded-full transition-all relative overflow-hidden group shadow-[0_0_15px_rgba(217,70,239,0.4)] animate-pulse"
              title={t('donate.button')}
              aria-label={t('donate.button')}
            >
              <Heart size={20} className="text-fuchsia-400 fill-fuchsia-400/50 group-hover:fill-fuchsia-400 group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
            </button>
            <button
              onClick={handleOpenSettings}
              className="btn-icon-glow p-2 text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-full transition-colors"
              title={t('settings.title')}
              aria-label={t('settings.title')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}