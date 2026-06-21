import { useState } from 'react';
import type { ReactNode } from 'react';
import { ShieldCheck, Lock, Download, ChevronRight } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { useT } from '../contexts/LanguageContext';

const ONBOARDED_KEY = 'xkey_onboarded';

type OnboardingSlide = {
  icon: ReactNode;
  bg: string;
  title: string;
  desc: string;
};

const SLIDES = (t: (key: string) => string): OnboardingSlide[] => [
  {
    icon: <ShieldCheck size={40} className="text-brand-400" />,
    bg: 'from-brand-600/20 to-cyan-600/10',
    title: t('onboarding.slide1Title'),
    desc: t('onboarding.slide1Desc'),
  },
  {
    icon: <Lock size={40} className="text-emerald-400" />,
    bg: 'from-emerald-600/20 to-green-600/10',
    title: t('onboarding.slide2Title'),
    desc: t('onboarding.slide2Desc'),
  },
  {
    icon: <Download size={40} className="text-amber-400" />,
    bg: 'from-amber-600/20 to-orange-600/10',
    title: t('onboarding.slide3Title'),
    desc: t('onboarding.slide3Desc'),
  },
];

type OnboardingScreenProps = {
  onComplete: () => void;
};

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [slide, setSlide] = useState(0);
  const t = useT();
  const slides = SLIDES(t);

  const handleNext = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      Preferences.set({ key: ONBOARDED_KEY, value: 'true' }).catch(() => {});
      onComplete();
    }
  };

  const handleSkip = () => {
    Preferences.set({ key: ONBOARDED_KEY, value: 'true' }).catch(() => {});
    onComplete();
  };

  const s = slides[slide];
  const isLast = slide === slides.length - 1;

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <img src="/logo.png" alt="xKey" className="w-20 h-20 rounded-2xl logo-animated mb-8" />

      {/* Slide Content */}
      <div className={`w-full max-w-sm bg-gradient-to-br ${s.bg} rounded-3xl p-8 text-center mb-8 transition-all duration-300`}>
        <div className="w-20 h-20 rounded-full bg-surface-900/50 flex items-center justify-center mx-auto mb-5">
          {s.icon}
        </div>
        <h2 className="text-xl font-bold text-white mb-3">{s.title}</h2>
        <p className="text-surface-300 text-sm leading-relaxed">{s.desc}</p>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mb-8">
        {slides.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === slide ? 'w-6 bg-brand-500' : 'w-2 bg-surface-700'}`} />
        ))}
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <button onClick={handleNext}
          className="btn-glow w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
          {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          {!isLast && <ChevronRight size={18} />}
        </button>
        {!isLast && (
          <button onClick={handleSkip}
            className="w-full text-surface-500 hover:text-surface-300 text-sm py-2 transition-colors">
            {t('onboarding.skip')}
          </button>
        )}
      </div>
    </div>
  );
}

export { ONBOARDED_KEY };
