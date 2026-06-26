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
        <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
                <BadgeInfo size={20} />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t('settings.appVersion')}</p>
                <p className="mt-0.5 text-xs text-surface-400">{t('settings.appVersionDesc')}</p>
            </div>
            <div className="ml-auto rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-200">
                {appVersion.fullLabel}
            </div>
        </div>
        <div className="mt-4 rounded-xl border border-surface-700/70 bg-surface-950/30 p-3">
            <p className="text-sm font-bold text-white">{t('settings.openSourceTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-surface-400">{t('settings.openSourceDesc')}</p>
            <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                onClick={hapticTap}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-900 px-3 py-2.5 text-sm font-semibold text-surface-200 transition-colors hover:border-brand-400/60 hover:bg-brand-500/10 hover:text-brand-100"
            >
                <GitBranch size={16} />
                {t('settings.openGithub')}
                <ExternalLink size={13} />
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
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-10 w-10 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl bg-white p-1.5 flex-shrink-0">
            {[0, 1, 3, 4, 5, 7, 8].map(item => (
              <span key={item} className="rounded-[2px] bg-black" style={{ gridColumn: (item % 3) + 1, gridRow: Math.floor(item / 3) + 1 }} />
            ))}
          </div>
          <div>
            <p className="text-white font-medium text-sm">{t('settings.okxGuideTitle')}</p>
            <p className="text-xs text-surface-400">{t('settings.okxGuideDesc')}</p>
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-surface-700/70 bg-surface-900/50 p-3">
          <p className="text-xs leading-relaxed text-surface-300">{t('settings.okxGuideStep1')}</p>
          <p className="text-xs leading-relaxed text-surface-300">{t('settings.okxGuideStep2')}</p>
          <p className="text-xs leading-relaxed text-surface-300">{t('settings.okxGuideStep3')}</p>
          <a
            href={okxJoinUrl}
            target="_blank"
            rel="noreferrer"
            onClick={hapticTap}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-950 px-3 py-2.5 text-sm font-semibold text-surface-100 transition-colors hover:border-white/50 hover:bg-white hover:text-black"
          >
            <span className="grid h-5 w-5 grid-cols-3 grid-rows-3 gap-[1px] rounded bg-white p-[2px]">
              {[0, 1, 3, 4, 5, 7, 8].map(item => (
                <span key={item} className="rounded-[1px] bg-black" style={{ gridColumn: (item % 3) + 1, gridRow: Math.floor(item / 3) + 1 }} />
              ))}
            </span>
            web3.okx.com/join/BANMAO
            <ExternalLink size={14} />
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
