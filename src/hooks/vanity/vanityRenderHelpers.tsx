import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MiddleEllipsisAddress } from '../../components/create-wallet/components';
import type { GeneratedWallet } from '../../components/create-wallet/types';

export const compactVanityAddress = (address: string, head = 12, tail = 8): ReactNode => {
  if (!address) return '';
  const clean = address.startsWith('0x') || address.startsWith('0X') ? address : `0x${address}`;
  return <MiddleEllipsisAddress address={clean} head={head} tail={tail} />;
};

type CompactVanityAddressOptions = {
  head?: number;
  tail?: number;
  minHead?: number;
  minTail?: number;
};

function HighlightedCompactAddress({
  address,
  head = 12,
  tail = 8,
  minHead = 6,
  minTail = 6,
  headHighlightLength = 0,
  tailHighlightLength = 0,
  highlightClassName,
}: {
  address: string;
  head?: number;
  tail?: number;
  minHead?: number;
  minTail?: number;
  headHighlightLength?: number;
  tailHighlightLength?: number;
  highlightClassName: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const clean = address.startsWith('0x') || address.startsWith('0X') ? address : `0x${address}`;
  const hasHexPrefix = clean.startsWith('0x') || clean.startsWith('0X');
  const prefix = hasHexPrefix ? clean.slice(0, 2) : '';
  const [displayParts, setDisplayParts] = useState(() => ({
    headLength: clean.length,
    tailLength: 0,
    compacted: false,
  }));

  useEffect(() => {
    const updateDisplay = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure || !clean) {
        setDisplayParts({ headLength: clean.length, tailLength: 0, compacted: false });
        return;
      }

      measure.textContent = clean;
      const availableWidth = container.clientWidth;
      const fullWidth = measure.scrollWidth;
      if (!availableWidth || fullWidth <= availableWidth) {
        setDisplayParts({ headLength: clean.length, tailLength: 0, compacted: false });
        return;
      }

      const normalizedWidth = Math.max(0, availableWidth - 4);
      measure.textContent = '0'.repeat(Math.max(clean.length, 42));
      const charWidth = Math.max(1, measure.scrollWidth / Math.max(clean.length, 42));
      const availableChars = Math.max(minHead + minTail + 3, Math.floor(normalizedWidth / charWidth));

      const maxVisibleChars = Math.max(minHead + minTail, availableChars - 3);
      const preferredHead = Math.min(head, Math.max(minHead, Math.ceil(maxVisibleChars * 0.56)));
      let nextHead = Math.min(preferredHead, maxVisibleChars - minTail);
      let nextTail = Math.min(tail, maxVisibleChars - nextHead);

      if (nextTail < minTail) {
        nextTail = Math.min(minTail, maxVisibleChars - minHead);
        nextHead = Math.max(minHead, maxVisibleChars - nextTail);
      }

      while (nextHead + nextTail + 3 > availableChars && nextHead > minHead) nextHead -= 1;
      while (nextHead + nextTail + 3 > availableChars && nextTail > minTail) nextTail -= 1;

      setDisplayParts({ headLength: nextHead, tailLength: nextTail, compacted: true });
    };

    updateDisplay();

    const observer = typeof ResizeObserver !== 'undefined' && containerRef.current
      ? new ResizeObserver(updateDisplay)
      : null;
    if (observer && containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateDisplay);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateDisplay);
    };
  }, [clean, head, tail, minHead, minTail]);

  const fullBody = clean.slice(prefix.length);
  const visibleHead = displayParts.compacted ? clean.slice(0, displayParts.headLength) : clean;
  const visibleTail = displayParts.compacted && displayParts.tailLength ? clean.slice(-displayParts.tailLength) : '';
  const headBodyOffset = prefix.length;
  const headBody = visibleHead.slice(headBodyOffset);
  const tailBody = visibleTail;

  const renderFullBody = () => {
    const headHighlight = Math.min(Math.max(0, headHighlightLength), fullBody.length);
    const tailHighlight = Math.min(
      Math.max(0, tailHighlightLength),
      Math.max(0, fullBody.length - headHighlight)
    );
    const tailStart = fullBody.length - tailHighlight;

    return (
      <>
        {headHighlight ? <span className={highlightClassName}>{fullBody.slice(0, headHighlight)}</span> : null}
        <span className="opacity-80">{fullBody.slice(headHighlight, tailStart)}</span>
        {tailHighlight ? <span className={highlightClassName}>{fullBody.slice(tailStart)}</span> : null}
      </>
    );
  };

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
    <span ref={containerRef} className="relative block min-w-0 max-w-full overflow-hidden whitespace-nowrap" title={clean}>
      <span className="block min-w-0 overflow-visible whitespace-nowrap">
        <span>{prefix}</span>
        {displayParts.compacted ? (
          <>
            {renderHead()}
            <span className="opacity-80">...</span>
            {renderTail()}
          </>
        ) : renderFullBody()}
      </span>
      <span ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-mono" aria-hidden="true" />
    </span>
  );
}

const renderHighlightedCompactAddress = (props: {
  address: string;
  head?: number;
  tail?: number;
  minHead?: number;
  minTail?: number;
  headHighlightLength?: number;
  tailHighlightLength?: number;
  highlightClassName: string;
}): ReactNode => {
  if (!props.address) return '';
  return <HighlightedCompactAddress {...props} />;
};

export const createVanityAddressRenderer = (
  vanityPrefixClean: string,
  vanitySuffixClean: string
) => {
  const renderVanityAddress = (
    address: string,
    compact = false,
    compactOptions: CompactVanityAddressOptions = {}
  ): ReactNode => {
    const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
    const prefix = hasHexPrefix ? address.slice(0, 2) : '';
    const body = hasHexPrefix ? address.slice(2) : address;
    const prefixEnd = Math.min(vanityPrefixClean.length, body.length);
    const suffixStart = Math.max(prefixEnd, body.length - vanitySuffixClean.length);
    const highlightClassName = 'rounded-[0.18em] bg-brand-500/20 text-brand-700 box-decoration-clone dark:text-brand-200';

    if (compact) {
      return renderHighlightedCompactAddress({
        address,
        head: compactOptions.head ?? 14,
        tail: compactOptions.tail ?? 10,
        minHead: compactOptions.minHead ?? 6,
        minTail: compactOptions.minTail ?? 6,
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
        <span className="opacity-80">{body.slice(prefixEnd, suffixStart)}</span>
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
    compact = false,
    compactOptions: CompactVanityAddressOptions = {}
  ): ReactNode => {
    const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
    const prefix = hasHexPrefix ? address.slice(0, 2) : '';
    const body = hasHexPrefix ? address.slice(2) : address;
    const repeatFallbackLength = Math.max(0, wallet.vanityRepeatLength || 0);
    const headLength = Math.max(
      0,
      wallet.vanityHeadRun?.length ||
        (wallet.vanityRepeatSide === 'head' || wallet.vanityRepeatSide === 'both' ? repeatFallbackLength : 0)
    );
    const tailLength = Math.max(
      0,
      wallet.vanityTailRun?.length ||
        (wallet.vanityRepeatSide === 'tail' || wallet.vanityRepeatSide === 'both' ? repeatFallbackLength : 0)
    );
    const highlightClassName = 'rounded-[0.18em] bg-cyan-500/20 text-cyan-700 box-decoration-clone dark:text-cyan-200';

    if (!headLength && !tailLength) return renderVanityAddress(address, compact, compactOptions);

    if (compact) {
      return renderHighlightedCompactAddress({
        address,
        head: compactOptions.head ?? 14,
        tail: compactOptions.tail ?? 10,
        minHead: compactOptions.minHead ?? 6,
        minTail: compactOptions.minTail ?? 6,
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
        <span className="opacity-80">{body.slice(middleStart, middleEnd)}</span>
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