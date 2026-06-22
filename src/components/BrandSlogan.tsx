import { XKEY_SLOGAN } from '../utils/branding';

type BrandSloganTone = 'brand' | 'success' | 'warning' | 'danger' | 'subtle';

type BrandSloganProps = {
  note?: string;
  tone?: BrandSloganTone;
  compact?: boolean;
  large?: boolean;
  className?: string;
};

const toneClasses: Record<BrandSloganTone, string> = {
  brand: 'border-brand-500/20 bg-brand-500/10 text-brand-300',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/25 bg-red-500/10 text-red-300',
  subtle: 'border-surface-700 bg-surface-800/40 text-surface-300',
};

export default function BrandSlogan({ note, tone = 'brand', compact = false, large = false, className = '' }: BrandSloganProps) {
  const sloganSize = large ? 'text-base sm:text-lg' : compact ? 'text-[10px]' : 'text-[11px]';
  const noteSize = large ? 'text-sm sm:text-base' : 'text-xs';

  return (
    <div className={`rounded-xl border text-center ${toneClasses[tone]} ${compact ? 'px-3 py-2' : large ? 'px-4 py-4' : 'p-3'} ${className}`}>
      <p className={`${sloganSize} font-black uppercase tracking-[0.16em] leading-relaxed`}>
        {XKEY_SLOGAN}
      </p>
      {note && <p className={`mx-auto mt-1 max-w-2xl ${noteSize} leading-relaxed text-surface-300`}>{note}</p>}
    </div>
  );
}
