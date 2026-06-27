import { useState, type MouseEvent } from 'react';
import { X, Copy, Check, Heart, Send, Globe2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Clipboard } from '@capacitor/clipboard';
import { useT } from '../contexts/LanguageContext';
import { hapticTap, hapticSuccess } from '../utils/haptics';

type DonateModalProps = {
  onClose: () => void;
};

export default function DonateModal({ onClose }: DonateModalProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const donateAddress = '0xBBBB8FE7A23e22D6B880B4e5c7eF42Cd1bC98009';
  const donateNetwork = 'XLAYER';

  const handleCopy = async () => {
    try {
      await Clipboard.write({ string: donateAddress });
      setCopied(true);
      hapticSuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleOpenX = () => {
    hapticTap();
    window.open('https://x.com/haivcon', '_blank');
  };

  const handleOpenTelegram = () => {
    hapticTap();
    window.open('https://t.me/haivcon', '_blank');
  };

  const handleOpenGithub = () => {
    hapticTap();
    window.open('https://github.com/haivcon/xkey', '_blank', 'noopener,noreferrer');
  };

  const handleOpenWebsite = () => {
    hapticTap();
    window.open('https://xlayer.my', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="app-scaled-icons fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm animate-in fade-in sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Background */}
        <div className="absolute left-0 right-0 top-0 z-0 h-16 bg-gradient-to-br from-brand-600/20 via-fuchsia-500/20 to-surface-900"></div>

        <div className="relative z-10 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 shadow-lg shadow-brand-500/20">
                <Heart size={17} className="fill-white text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold tracking-tight text-white">{t('donate.title')}</h3>
                <p className="truncate text-xs font-medium text-brand-400">{t('donate.subtitle')}</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-800/50 backdrop-blur-sm transition-colors hover:bg-surface-700">
              <X size={18} className="text-surface-300" />
            </button>
          </div>
          
          <p className="mb-2.5 text-scale-xs leading-snug text-surface-300">
            {t('donate.message')}
          </p>

          <div className="glass-card mb-2.5 rounded-xl border border-brand-500/20 bg-surface-800/50 p-2.5 shadow-inner">
            <div className="flex flex-col items-center gap-2.5">
              {donateAddress ? (
                <div
                  className="cursor-pointer rounded-2xl bg-white p-3 shadow-lg ring-1 ring-white/10 transition-transform hover:scale-105 active:scale-95"
                  onClick={() => { hapticTap(); setIsZoomed(true); }}
                >
                  <QRCodeSVG value={donateAddress} size={168} />
                </div>
              ) : (
                <div className="h-44 w-44 animate-pulse rounded-2xl bg-surface-800"></div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                <span className="rounded-full bg-orange-500/15 px-3 py-1 text-scale-xs font-bold text-orange-400">
                  {t('donate.network')}: {donateNetwork}
                </span>
                <span className="rounded-full bg-surface-900/80 px-3 py-1 text-scale-2xs font-semibold text-surface-400 ring-1 ring-surface-700/80">
                  {t('donate.networkNote')}
                </span>
                <span className="text-scale-2xs font-semibold uppercase tracking-wider text-surface-500">
                  {t('donate.scanQR')}
                </span>
              </div>

              <div className="w-full rounded-xl border border-surface-700 bg-surface-950/50 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-scale-2xs font-semibold uppercase tracking-wider text-surface-500">{t('donate.address')}</p>
                    <p className="text-scale-2xs text-surface-400">{t('donate.author')}: ＤＯＲＥＭＯＮ (@haivcon)</p>
                  </div>
                  {copied && (
                    <span className="flex-shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-scale-2xs font-semibold text-emerald-400">
                      {t('donate.copiedAddress')}
                    </span>
                  )}
                </div>
                <p className="mb-2 break-all rounded-lg bg-surface-900 px-2.5 py-2 font-mono text-scale-2xs leading-tight text-brand-300 sm:text-scale-xs">{donateAddress}</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    copied
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-brand-600 text-white hover:bg-brand-500'
                  }`}
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? t('donate.copiedAddress') : t('donate.copyAddress')}
                </button>
              </div>

              <div className="grid w-full grid-cols-1 gap-1.5 min-[360px]:grid-cols-2">
                <button
                  type="button"
                  onClick={handleOpenGithub}
                  className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-surface-600 bg-surface-950/60 px-2 py-1.5 text-scale-xs font-semibold text-white transition-all hover:border-white/30 hover:bg-surface-800"
                >
                  <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-current" aria-hidden="true">
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.11-.75.41-1.26.74-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .98-.31 3.18 1.18.93-.26 1.92-.39 2.9-.39s1.97.13 2.9.39c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                  </svg>
                  <span className="truncate">GitHub</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenWebsite}
                  className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2 py-1.5 text-scale-xs font-semibold text-cyan-200 transition-all hover:border-cyan-300/40 hover:bg-cyan-400/15"
                >
                  <Globe2 size={15} />
                  <span className="truncate">{t('donate.website')}</span>
                </button>
              </div>
            </div>
          </div>

          <p className="mb-2 text-center text-scale-xs font-medium text-emerald-400">
            {t('donate.thankYou')}
          </p>

          <div className="flex gap-2">
            <button 
              onClick={handleOpenX}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-600 bg-surface-800 py-1.5 text-scale-xs font-medium text-white transition-all hover:border-surface-500 hover:bg-surface-700"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.004 3.916H5.078z" />
              </svg>
              X.com
            </button>
            <button 
              onClick={handleOpenTelegram}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#2AABEE]/30 bg-[#2AABEE]/10 py-1.5 text-scale-xs font-medium text-[#2AABEE] transition-all hover:bg-[#2AABEE]/20"
            >
              <Send size={16} className="-ml-1" />
              Telegram
            </button>
          </div>
        </div>
      </div>

      {/* Zoomed QR Overlay */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in zoom-in duration-200"
          onClick={() => { hapticTap(); setIsZoomed(false); }}
        >
          <div className="p-4 bg-white rounded-3xl shadow-2xl mb-6">
            <QRCodeSVG value={donateAddress} size={256} />
          </div>
          <p className="text-white font-medium text-lg mb-2">{t('donate.scanQR')}</p>
          <p className="text-surface-400 text-sm font-mono break-all px-8 text-center">{donateAddress}</p>
          
          <button 
            className="absolute top-6 right-6 w-10 h-10 bg-surface-800 rounded-full flex items-center justify-center"
            onClick={(e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); hapticTap(); setIsZoomed(false); }}
          >
            <X size={20} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
