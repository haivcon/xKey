import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { TranslationFn } from '../../contexts/LanguageContext';
import type { EntropyVerification } from '../../types';

type EntropyBadgeProps = {
  t: TranslationFn;
  verification: EntropyVerification | null;
  onRetry?: () => void;
};

const getEntropySourceLabel = (t: TranslationFn, source: EntropyVerification['source']) => {
  switch (source) {
    case 'crypto.getRandomValues':
      return t('createWallet.entropySourceCryptoGetRandomValues');
    case 'unavailable':
      return t('createWallet.entropySourceUnavailable');
    default:
      return t('createWallet.entropySourceUnknown');
  }
};

export function EntropyBadge({ t, verification, onRetry }: EntropyBadgeProps) {
  const isChecking = verification === null;
  const isOk = verification?.ok === true;
  const isFailed = verification?.ok === false;
  const Icon = isOk ? ShieldCheck : ShieldAlert;

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-left ${
        isOk
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
          : isFailed
            ? 'border-red-400/30 bg-red-400/10 text-red-100'
            : 'border-surface-600/60 bg-surface-800/40 text-surface-200'
      }`}
    >
      <div className="flex items-start gap-2">
        {isChecking ? (
          <RefreshCw size={15} className="mt-0.5 flex-shrink-0 animate-spin text-surface-300" />
        ) : (
          <Icon
            size={15}
            className={`mt-0.5 flex-shrink-0 ${isOk ? 'text-emerald-300' : 'text-red-300'}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-scale-xs font-bold">
            {t(
              isOk
                ? 'createWallet.entropyVerified'
                : isFailed
                  ? 'createWallet.entropyFailed'
                  : 'createWallet.entropyChecking'
            )}
          </p>
          <p
            className={`mt-0.5 text-scale-2xs leading-relaxed ${
              isOk ? 'text-emerald-100/80' : isFailed ? 'text-red-100/80' : 'text-surface-400'
            }`}
          >
            {isOk
              ? t('createWallet.entropyVerifiedDetail', {
                source: getEntropySourceLabel(t, verification.source),
                bytes: verification.sampleBytes,
              })
              : isFailed
                ? t('createWallet.entropyFailedDetail')
                : t('createWallet.entropyCheckingDetail')}
          </p>
          {isFailed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-red-300/25 bg-red-300/10 px-2 py-1 text-scale-2xs font-semibold text-red-100 transition-colors hover:bg-red-300/15"
            >
              <RefreshCw size={12} />
              {t('createWallet.entropyRetry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
