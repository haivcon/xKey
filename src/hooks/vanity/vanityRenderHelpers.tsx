import type { ReactNode } from 'react';
import { MiddleEllipsisAddress } from '../../components/create-wallet/components';
import type { GeneratedWallet } from '../../components/create-wallet/types';

export const compactVanityAddress = (address: string, head = 12, tail = 8): ReactNode => {
  if (!address) return '';
  const clean = address.startsWith('0x') || address.startsWith('0X') ? address : `0x${address}`;
  return <MiddleEllipsisAddress address={clean} head={head} tail={tail} />;
};

export const createVanityAddressRenderer = (
  vanityPrefixClean: string,
  vanitySuffixClean: string
) => {
  const renderVanityAddress = (address: string, compact = false): ReactNode => {
    if (compact) return <>{compactVanityAddress(address, 12, 8)}</>;
    const hasHexPrefix = address.startsWith('0x') || address.startsWith('0X');
    const prefix = hasHexPrefix ? address.slice(0, 2) : '';
    const body = hasHexPrefix ? address.slice(2) : address;
    const prefixEnd = Math.min(vanityPrefixClean.length, body.length);
    const suffixStart = Math.max(prefixEnd, body.length - vanitySuffixClean.length);

    return (
      <>
        <span>{prefix}</span>
        {prefixEnd ? (
          <span className="rounded bg-brand-500/20 px-1 py-0.5 font-extrabold text-brand-700 ring-1 ring-brand-400/30 dark:text-brand-200">
            {body.slice(0, prefixEnd)}
          </span>
        ) : null}
        <span className="mx-0.5 opacity-80">{body.slice(prefixEnd, suffixStart)}</span>
        {vanitySuffixClean.length ? (
          <span className="rounded bg-brand-500/20 px-1 py-0.5 font-extrabold text-brand-700 ring-1 ring-brand-400/30 dark:text-brand-200">
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
    if (compact) return <>{compactVanityAddress(address, 12, 8)}</>;
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

    if (!headLength && !tailLength) return renderVanityAddress(address);

    const middleStart = Math.min(headLength, body.length);
    const middleEnd = Math.max(middleStart, body.length - tailLength);

    return (
      <>
        <span>{prefix}</span>
        {headLength ? (
          <span className="rounded bg-cyan-500/20 px-1 py-0.5 font-extrabold text-cyan-700 ring-1 ring-cyan-400/30 dark:text-cyan-200">
            {body.slice(0, middleStart)}
          </span>
        ) : null}
        <span className="mx-0.5 opacity-80">{body.slice(middleStart, middleEnd)}</span>
        {tailLength ? (
          <span className="rounded bg-cyan-500/20 px-1 py-0.5 font-extrabold text-cyan-700 ring-1 ring-cyan-400/30 dark:text-cyan-200">
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