import type { ReactNode } from 'react';
import { MiddleEllipsisAddress } from '../../components/create-wallet/components';
import type { GeneratedWallet } from '../../components/create-wallet/types';

export const compactVanityAddress = (address: string, head = 12, tail = 8): ReactNode => {
  if (!address) return '';
  const clean = address.startsWith('0x') || address.startsWith('0X') ? address : `0x${address}`;
  return <MiddleEllipsisAddress address={clean} head={head} tail={tail} />;
};

const renderHighlightedCompactAddress = ({
  address,
  head = 12,
  tail = 8,
  headHighlightLength = 0,
  tailHighlightLength = 0,
  highlightClassName,
}: {
  address: string;
  head?: number;
  tail?: number;
  headHighlightLength?: number;
  tailHighlightLength?: number;
  highlightClassName: string;
}): ReactNode => {
  if (!address) return '';
  const clean = address.startsWith('0x') || address.startsWith('0X') ? address : `0x${address}`;
  const hasHexPrefix = clean.startsWith('0x') || clean.startsWith('0X');
  const prefix = hasHexPrefix ? clean.slice(0, 2) : '';
  const body = hasHexPrefix ? clean.slice(2) : clean;
  const headBodyLength = Math.min(Math.max(0, head - prefix.length), body.length);
  const tailBodyLength = Math.min(Math.max(0, tail), Math.max(0, body.length - headBodyLength));
  const headBody = body.slice(0, headBodyLength);
  const tailBody = tailBodyLength ? body.slice(-tailBodyLength) : '';
  const hiddenLength = body.length - headBodyLength - tailBodyLength;

  const renderHead = () => {
    const highlightLength = Math.min(headHighlightLength, headBody.length);
    if (!highlightLength) return <span>{headBody}</span>;
    return (
      <>
        <span className={highlightClassName}>{headBody.slice(0, highlightLength)}</span>
        <span>{headBody.slice(highlightLength)}</span>
      </>
    );
  };

  const renderTail = () => {
    const highlightLength = Math.min(tailHighlightLength, tailBody.length);
    if (!highlightLength) return <span>{tailBody}</span>;
    return (
      <>
        <span>{tailBody.slice(0, tailBody.length - highlightLength)}</span>
        <span className={highlightClassName}>{tailBody.slice(-highlightLength)}</span>
      </>
    );
  };

  return (
    <span className="block min-w-0 max-w-full overflow-hidden whitespace-nowrap">
      <span>{prefix}</span>
      {renderHead()}
      {hiddenLength > 0 ? <span className="mx-0.5 opacity-80">...</span> : null}
      {renderTail()}
    </span>
  );
};

export const createVanityAddressRenderer = (
  vanityPrefixClean: string,
  vanitySuffixClean: string
) => {
  const renderVanityAddress = (address: string, compact = false): ReactNode => {
    const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
    const prefix = hasHexPrefix ? address.slice(0, 2) : '';
    const body = hasHexPrefix ? address.slice(2) : address;
    const prefixEnd = Math.min(vanityPrefixClean.length, body.length);
    const suffixStart = Math.max(prefixEnd, body.length - vanitySuffixClean.length);
    const highlightClassName = 'rounded bg-brand-500/20 px-1 py-0.5 font-extrabold text-brand-700 ring-1 ring-brand-400/30 dark:text-brand-200';

    if (compact) {
      return renderHighlightedCompactAddress({
        address,
        head: 14,
        tail: 10,
        headHighlightLength: prefixEnd,
        tailHighlightLength: vanitySuffixClean.length,
        highlightClassName,
      });
    }

    return (
      <>
        <span>{prefix}</span>
        {prefixEnd ? (
          <span className={highlightClassName}>
            {body.slice(0, prefixEnd)}
          </span>
        ) : null}
        <span className="mx-0.5 opacity-80">{body.slice(prefixEnd, suffixStart)}</span>
        {vanitySuffixClean.length ? (
          <span className={highlightClassName}>
            {body.slice(suffixStart)}
          </span>
        ) : null}
      </>
    );
  };

  const renderVanityExtraAddress = (
    address: string,
    wallet: GeneratedWallet,
    compact = false
  ): ReactNode => {
    const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
    const prefix = hasHexPrefix ? address.slice(0, 2) : '';
    const body = hasHexPrefix ? address.slice(2) : address;
    const headLength = Math.max(
      0,
      wallet.vanityHeadRun?.length ||
        (wallet.vanityRepeatSide === 'head' ? wallet.vanityRepeatLength || 0 : 0)
    );
    const tailLength = Math.max(
      0,
      wallet.vanityTailRun?.length ||
        (wallet.vanityRepeatSide === 'tail' ? wallet.vanityRepeatLength || 0 : 0)
    );
    const highlightClassName = 'rounded bg-cyan-500/20 px-1 py-0.5 font-extrabold text-cyan-700 ring-1 ring-cyan-400/30 dark:text-cyan-200';

    if (!headLength && !tailLength) return renderVanityAddress(address, compact);

    if (compact) {
      return renderHighlightedCompactAddress({
        address,
        head: 14,
        tail: 10,
        headHighlightLength: headLength,
        tailHighlightLength: tailLength,
        highlightClassName,
      });
    }

    const middleStart = Math.min(headLength, body.length);
    const middleEnd = Math.max(middleStart, body.length - tailLength);

    return (
      <>
        <span>{prefix}</span>
        {headLength ? (
          <span className={highlightClassName}>
            {body.slice(0, middleStart)}
          </span>
        ) : null}
        <span className="mx-0.5 opacity-80">{body.slice(middleStart, middleEnd)}</span>
        {tailLength ? (
          <span className={highlightClassName}>
            {body.slice(middleEnd)}
          </span>
        ) : null}
      </>
    );
  };

  return {
    renderVanityAddress,
    renderVanityExtraAddress,
  };
};