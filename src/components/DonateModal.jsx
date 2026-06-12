import { useState } from 'react';
import { X, Copy, Check, Heart, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Clipboard } from '@capacitor/clipboard';
import { useT } from '../contexts/LanguageContext';
import { hapticTap, hapticSuccess } from '../utils/haptics';

export default function DonateModal({ onClose }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const donateAddress = '0x5c6253e43c834ed82916256681aa70eb8692eddb';

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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div 
        className="bg-surface-900 border border-surface-700 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header Background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-brand-600/20 via-fuchsia-500/20 to-surface-900 z-0"></div>

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Heart size={24} className="text-white fill-white" />
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-surface-800/50 hover:bg-surface-700 backdrop-blur-sm rounded-full transition-colors">
              <X size={18} className="text-surface-300" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight mt-4">{t('donate.title')}</h3>
          <p className="text-sm text-brand-400 font-medium mb-4">{t('donate.subtitle')}</p>
          
          <p className="text-surface-300 text-[13px] leading-relaxed mb-6">
            {t('donate.message')}
          </p>

          <div className="glass-card bg-surface-800/50 rounded-2xl p-4 mb-6 border border-brand-500/20 shadow-inner">
            <div className="flex flex-col items-center">
              {donateAddress ? (
                <div 
                  className="p-2 bg-white rounded-xl mb-3 shadow-lg ring-1 ring-white/10 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  onClick={() => { hapticTap(); setIsZoomed(true); }}
                >
                  <QRCodeSVG value={donateAddress} size={128} />
                </div>
              ) : (
                <div className="w-32 h-32 bg-surface-800 rounded-xl mb-3 animate-pulse"></div>
              )}
              <p className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-2">
                {t('donate.scanQR')}
              </p>
              
              <div 
                onClick={handleCopy}
                className="w-full bg-surface-950/50 hover:bg-surface-900 border border-surface-700 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors group"
              >
                <div className="overflow-hidden mr-2 flex-1">
                  <p className="text-[11px] text-surface-400 mb-0.5">{t('donate.author')}: ＤＯＲＥＭＯＮ (@haivcon)</p>
                  <p className="text-xs text-brand-300 font-mono break-all leading-tight">{donateAddress}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 group-hover:bg-brand-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-brand-400" />}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs font-medium text-emerald-400 mb-6">
            {t('donate.thankYou')}
          </p>

          <div className="flex gap-3">
            <button 
              onClick={handleOpenX}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-600 text-sm font-medium text-white transition-all hover:border-surface-500"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.004 3.916H5.078z" />
              </svg>
              X.com
            </button>
            <button 
              onClick={handleOpenTelegram}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 border border-[#2AABEE]/30 text-sm font-medium text-[#2AABEE] transition-all"
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
            onClick={(e) => { e.stopPropagation(); hapticTap(); setIsZoomed(false); }}
          >
            <X size={20} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
