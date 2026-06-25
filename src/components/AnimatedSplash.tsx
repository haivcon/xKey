import { useMemo, useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import { XKEY_SLOGAN } from '../utils/branding';
import { useTheme } from '../contexts/ThemeContext';

const LETTER_DELAY = 250;   // ms between each letter
const HOLD_DURATION = 800;  // ms to hold after all visible
const FADE_DURATION = 500;  // ms for fade-out

type AnimatedSplashProps = {
  onFinish: () => void;
  status?: string;
  version?: string;
};

export default function AnimatedSplash({ onFinish, status, version }: AnimatedSplashProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);
  const { theme } = useTheme();

  const brandText = 'xKey';
  const letters = useMemo(() => Array.from(brandText), [brandText]);
  const logoSrc = '/logo.png';

  useEffect(() => {
    const total = letters.length;
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;

    const showNext = () => {
      step++;
      setVisibleCount(step);

      if (step < total) {
        timer = setTimeout(showNext, LETTER_DELAY);
      } else {
        // All shown — hold then fade
        timer = setTimeout(() => {
          setFading(true);
          timer = setTimeout(() => {
            onFinish();
          }, FADE_DURATION);
        }, HOLD_DURATION);
      }
    };

    // Start after a tiny delay
    timer = setTimeout(showNext, 300);

    return () => clearTimeout(timer);
  }, [letters.length, onFinish]);

  const renderChar = (char: string, index: number) => {
    const isVisible = index < visibleCount;
    const isJustAppeared = index === visibleCount - 1;
    const isSpace = char === ' ';

    return (
      <span
        key={index}
        className={`splash-letter${isSpace ? ' splash-letter-space' : ''}`}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.5)',
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, text-shadow 0.4s ease-out',
          textShadow: isJustAppeared
            ? 'var(--splash-letter-shadow-strong)'
            : isVisible
              ? 'var(--splash-letter-shadow-soft)'
              : 'none',
        }}
      >
        {isSpace ? '\u00A0' : char}
      </span>
    );
  };

  const badgeVisible = visibleCount >= letters.length;

  return (
    <div
      className={`animated-splash animated-splash-${theme}`}
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-in-out`,
      }}
    >
      {/* Subtle radial glow behind text */}
      <div className="splash-glow" />

      <div className="splash-brand-stack">
        <img src={logoSrc} alt="" className="splash-logo" />
        <div className="splash-text">
          {letters.map((ch, i) => renderChar(ch, i))}
        </div>
        <div
          className={`splash-slogan ${badgeVisible ? 'is-visible' : ''}`}
          aria-label={XKEY_SLOGAN}
        >
          <span>NOT YOUR </span><strong>KEY</strong><span>, NOT YOUR CRYPTO</span>
        </div>
        <div
          className="splash-key-icon"
          style={{
            opacity: badgeVisible ? 1 : 0,
            transform: badgeVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s ease-out',
          }}
        >
          <Key size={32} />
        </div>
        <div className={`splash-status-wrap ${badgeVisible ? 'is-visible' : ''}`}>
          <div className="splash-status" aria-live="polite">
            {status && (
              <>
                <span>{status}</span>
                <span className="splash-status-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </>
            )}
          </div>
          {version && <div className="splash-version">v{version}</div>}
        </div>
      </div>
    </div>
  );
}