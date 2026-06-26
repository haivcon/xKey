import { Sparkles } from 'lucide-react';
import type { Wallet } from '../../types';
import { getVanityScoreGradeLabel, getVanityScoreReason, getVanityScoreTone } from '../../utils/vanity/vanityScoreGrade';

type VanityScoreBadgeProps = {
  wallet: Pick<Wallet, 'vanityScore' | 'vanityPatternType' | 'vanityRepeatSide' | 'vanityRepeatChar' | 'vanityRepeatLength' | 'vanityHeadRun' | 'vanityTailRun'>;
  compact?: boolean;
  showScore?: boolean;
  className?: string;
};

export default function VanityScoreBadge({
  wallet,
  compact = false,
  showScore = true,
  className = '',
}: VanityScoreBadgeProps) {
  const score = typeof wallet.vanityScore === 'number' ? wallet.vanityScore : 0;
  const gradeLabel = getVanityScoreGradeLabel(score);
  const reason = getVanityScoreReason(wallet);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-black uppercase leading-none shadow-sm ${getVanityScoreTone(score)} ${
        compact ? 'px-1.5 py-[0.125rem] text-[0.55rem]' : 'px-2 py-0.5 text-[0.625rem]'
      } ${className}`}
      title={`${reason} · Score ${score}`}
      aria-label={`${reason}. Score ${score}. Grade ${gradeLabel}`}
    >
      <Sparkles size={compact ? 9 : 10} />
      <span>{gradeLabel}</span>
      {showScore && <span className="font-mono opacity-80">{score}</span>}
    </span>
  );
}