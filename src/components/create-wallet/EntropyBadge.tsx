import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { TranslationFn } from '../../contexts/LanguageContext';
import type { EntropyVerification } from '../../types';

type EntropyBadgeProps = {
  t: TranslationFn;
  verification: EntropyVerification | null;
};

export function EntropyBadge({ t, verification }: EntropyBadgeProps) {
  const isOk = verification?.ok === true;
  const statusKey = isOk ? 'createWallet.entropyVerified' : 'createWallet.entropyNotVerified';
  const detailKey = isOk ? 'createWallet.entropyVerifiedDetail' : 'createWallet.entropyNotVerifiedDetail';
  const Icon = isOk ? ShieldCheck : ShieldAlert;

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-left ${
        isOk
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
          : 'border-amber-400/25 bg-amber-400/10 text-amber-100'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon size={15} className={`mt-0.5 flex-shrink-0 ${isOk ? 'text-emerald-300' : 'text-amber-300'}`} />
        <div className="min-w-0">
          <p className="text-scale-xs font-bold">{t(statusKey)}</p>
          <p className={`mt-0.5 text-scale-2xs leading-relaxed ${isOk ? 'text-emerald-100/80' : 'text-amber-100/80'}`}>
            {t(detailKey, {
              source: verification?.source || 'crypto.getRandomValues',
              bytes: verification?.sampleBytes || 0,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}