import { useState } from 'react';
import { BadgeInfo, GitBranch, ExternalLink, Heart } from 'lucide-react';
import { useT } from '../../contexts/LanguageContext';
import { hapticTap } from '../../utils/haptics';
import useAppVersion from '../../hooks/useAppVersion';
import DonateModal from '../DonateModal';
import BrandSlogan from '../shared/BrandSlogan';

export default function InfoTab() {
  const t = useT();
  const appVersion = useAppVersion();
  const githubUrl = 'https://github.com/haivcon/xKey';
  const okxJoinUrl = 'https://web3.okx.com/join/BANMAO';
  const [showDonate, setShowDonate] = useState(false);

  return (
    <>
      {/* ═══ App Version & Open Source ═══ */}
      <div className="glass-card p-4">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:text-left">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-300">
                <BadgeInfo size={21} />
            </div>
            <div className="min-w-0 max-w-sm sm:text-center">
                <p className="text-base font-bold text-white">{t('settings.appVersion')}</p>
                <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.appVersionDesc')}</p>
            </div>
            <div className="inline-flex min-w-[6.75rem] items-center justify-center whitespace-nowrap rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-2 text-center text-sm font-extrabold leading-none text-brand-200 shadow-sm shadow-brand-500/10">
                {appVersion.fullLabel}
            </div>
        </div>
        <div className="mt-4 rounded-xl border border-surface-700/70 bg-surface-950/30 p-3 text-center">
            <p className="text-sm font-bold text-white">{t('settings.openSourceTitle')}</p>
            <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-surface-400">{t('settings.openSourceDesc')}</p>
            <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                onClick={hapticTap}
                className="group mt-3 flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-900 px-3 py-2.5 text-sm font-semibold text-surface-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-brand-400/60 hover:bg-brand-500/10 hover:text-brand-100 hover:shadow-lg hover:shadow-brand-500/15 active:scale-[0.97]"
            >
                <GitBranch size={16} className="transition-transform duration-200 group-hover:scale-110" />
                <span className="min-w-0 truncate">{t('settings.openGithub')}</span>
                <ExternalLink size={13} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
        </div>
      </div>

      <div className="glass-card overflow-hidden p-5">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <BrandSlogan tone="success" large className="mb-4" />
          <h2 className="mt-2 text-center text-2xl font-black text-white">xKey</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-surface-300">{t('brand.aboutDesc')}</p>
        </div>
      </div>

      {/* ═══ Multi-chain Wallet Guide ═══ */}
      <div className="glass-card p-4 text-center">
        <div className="mb-3 flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 flex-shrink-0 grid-cols-3 grid-rows-3 gap-0.5 rounded-2xl bg-white p-2 shadow-lg shadow-black/10">
            {[0, 1, 3, 4, 5, 7, 8].map(item => (
              <span key={item} className="rounded-[2px] bg-black" style={{ gridColumn: (item % 3) + 1, gridRow: Math.floor(item / 3) + 1 }} />
            ))}
          </div>
          <div className="max-w-xl">
            <p className="text-base font-bold text-white">{t('settings.okxGuideTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.okxGuideDesc')}</p>
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-surface-700/70 bg-surface-900/50 p-3 text-left">
          <p className="text-xs leading-relaxed text-surface-300">{t('settings.okxGuideStep1')}</p>
          <p className="text-xs leading-relaxed text-surface-300">{t('settings.okxGuideStep2')}</p>
          <p className="text-xs leading-relaxed text-surface-300">{t('settings.okxGuideStep3')}</p>
          <a
            href={okxJoinUrl}
            target="_blank"
            rel="noreferrer"
            onClick={hapticTap}
            className="group mt-3 flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-950 px-3 py-2.5 text-sm font-semibold text-surface-100 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-white/50 hover:bg-white hover:text-black hover:shadow-lg hover:shadow-white/10 active:scale-[0.97]"
          >
            <span className="grid h-5 w-5 flex-shrink-0 grid-cols-3 grid-rows-3 gap-[1px] rounded bg-white p-[2px] transition-transform duration-200 group-hover:scale-110 group-hover:bg-black">
              {[0, 1, 3, 4, 5, 7, 8].map(item => (
                <span key={item} className="rounded-[1px] bg-black transition-colors duration-200 group-hover:bg-white" style={{ gridColumn: (item % 3) + 1, gridRow: Math.floor(item / 3) + 1 }} />
              ))}
            </span>
            <span className="min-w-0 truncate">web3.okx.com/join/BANMAO</span>
            <ExternalLink size={14} className="flex-shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>

      {/* ═══ Donate ═══ */}
      <div className="bg-gradient-to-br from-brand-600/10 via-fuchsia-500/10 to-surface-800 border border-brand-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
              <Heart size={20} className="text-white fill-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('donate.title')}</h2>
              <p className="text-xs text-brand-400">{t('donate.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowDonate(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-brand-500/20 transition-all active:scale-95 whitespace-nowrap ml-2"
          >
            {t('donate.button')}
          </button>
        </div>
      </div>

      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
    </>
  );
}
