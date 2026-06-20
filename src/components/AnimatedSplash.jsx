import { useMemo, useState, useEffect } from 'react';
import { Key } from 'lucide-react';

const LETTER_DELAY = 250;   // ms between each letter
const HOLD_DURATION = 800;  // ms to hold after all visible
const FADE_DURATION = 500;  // ms for fade-out

export default function AnimatedSplash({ onFinish }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);

  const brandText = 'xKey';
  const letters = useMemo(() => Array.from(brandText), [brandText]);

  useEffect(() => {
    const total = letters.length;
    let step = 0;
    let timer;

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

  const renderChar = (char, index) => {
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
            ? '0 0 30px rgba(99, 102, 241, 1), 0 0 60px rgba(99, 102, 241, 0.6), 0 0 100px rgba(99, 102, 241, 0.3)'
            : isVisible
              ? '0 0 10px rgba(99, 102, 241, 0.4), 0 0 20px rgba(99, 102, 241, 0.2)'
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
      className="animated-splash"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-in-out`,
      }}
    >
      {/* Subtle radial glow behind text */}
      <div className="splash-glow" />

      <div className="splash-brand-stack">
        <img src="/logo.png" alt="" className="splash-logo" />
        <div className="splash-text">
          {letters.map((ch, i) => renderChar(ch, i))}
        </div>
        <div 
          className="splash-key-icon"
          style={{
            opacity: badgeVisible ? 1 : 0,
            transform: badgeVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s ease-out',
            marginTop: '1rem',
            color: '#6366f1',
            filter: 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.8))'
          }}
        >
          <Key size={32} />
        </div>
      </div>
    </div>
  );
}
