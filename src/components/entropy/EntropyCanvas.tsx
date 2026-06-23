import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useT } from '../../contexts/LanguageContext';
import { EntropyAccumulator } from '../../utils/entropyUtils';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface EntropyCanvasProps {
  onComplete: (seedHex: string) => void;
  requiredEvents?: number;
}

export default function EntropyCanvas({ onComplete, requiredEvents = 128 }: EntropyCanvasProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const accumulatorRef = useRef<EntropyAccumulator>(new EntropyAccumulator());
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Resize canvas to match container
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 1;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        
        const opacity = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace('1)', `${opacity})`);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handlePointerEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isCompleted) return;

    // Collect entropy
    const acc = accumulatorRef.current;
    acc.addNumbers(e.clientX, e.clientY, e.timeStamp, e.pressure || 1);
    
    // Add particle effect
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Colors based on pressure/velocity logic could be nice, but random neon works
    const colors = ['rgba(56,189,248,1)', 'rgba(168,85,247,1)', 'rgba(52,211,153,1)', 'rgba(251,191,36,1)'];
    
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Update progress
    const currentCount = acc.getEventCount();
    const newProgress = Math.min(100, Math.floor((currentCount / requiredEvents) * 100));
    setProgress(newProgress);

    if (newProgress >= 100 && !isCompleted) {
      setIsCompleted(true);
      setTimeout(() => {
        onComplete(acc.getSeedHex());
      }, 500); // Wait a bit to show 100%
    }
  };

  const handleReset = () => {
    accumulatorRef.current = new EntropyAccumulator();
    particlesRef.current = [];
    setProgress(0);
    setIsCompleted(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div 
        ref={containerRef} 
        className="relative h-64 w-full rounded-2xl border border-surface-700 bg-surface-900 overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerEvent}
          onPointerDown={handlePointerEvent}
          className="absolute inset-0 cursor-crosshair"
        />
        
        {progress === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-surface-400 font-medium animate-pulse flex flex-col items-center gap-2">
              <Sparkles size={24} className="text-brand-400" />
              {t('Swipe randomly here')}
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900/80 backdrop-blur-sm pointer-events-none">
            <p className="text-emerald-400 font-bold text-xl drop-shadow-md">
              {t('Entropy Generated')} 100%
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-3 bg-surface-800 rounded-full overflow-hidden border border-surface-700">
          <div 
            className="h-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-bold text-surface-300 w-12 text-right">
          {progress}%
        </span>
        <button
          onClick={handleReset}
          className="p-2 rounded-xl border border-surface-700 bg-surface-800 text-surface-400 hover:text-white hover:border-surface-600 transition-colors"
          title={t('Reset')}
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </div>
  );
}