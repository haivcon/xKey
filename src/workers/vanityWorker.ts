import { ethers } from 'ethers';
import type { Wallet } from '../types';
import { compareVanityExtraMatches, detectExtraVanityMatch, type VanityExtraMatch, type VanityRepeatSide } from '../utils/vanityMatch';

let running = false;

type VanityWorkerRequest = {
  type?: 'start' | 'stop';
  prefix?: string;
  suffix?: string;
  batchSize?: number;
  targetCount?: number;
  initialScanned?: number;
  elapsedOffset?: number;
  captureExtras?: boolean;
  extraMinRun?: number;
  extraLimit?: number;
  initialExtraCandidates?: VanityExtraCandidate[];
};

type VanityWallet = Wallet & {
  mnemonic?: string;
  vanityMatchType?: 'primary' | 'extra';
  vanityRepeatSide?: VanityRepeatSide;
  vanityRepeatChar?: string;
  vanityRepeatLength?: number;
  vanityScore?: number;
  vanityHeadRun?: string;
  vanityTailRun?: string;
};

type VanityExtraCandidate = Pick<VanityWallet,
  'address' | 'vanityMatchType' | 'vanityRepeatSide' | 'vanityRepeatChar' |
  'vanityRepeatLength' | 'vanityScore' | 'vanityHeadRun' | 'vanityTailRun'
>;

type RankedVanityWallet = VanityWallet | VanityExtraCandidate;

type VanityWorkerResponse =
  | {
      type: 'found';
      scanned: number;
      found: number;
      elapsed: number;
      wallet: VanityWallet;
      matchType: 'primary' | 'extra';
    }
  | {
      type: 'extras';
      scanned: number;
      found: number;
      elapsed: number;
      wallets: VanityExtraCandidate[];
    }
  | {
      type: 'progress' | 'complete';
      scanned: number;
      found: number;
      elapsed: number;
      candidate?: string;
    };

const postVanityMessage = (message: VanityWorkerResponse): void => {
  self.postMessage(message);
};

const createVanityWallet = (
  wallet: ethers.HDNodeWallet,
  matchType: 'primary' | 'extra',
  extra?: VanityExtraMatch | null,
): VanityWallet => ({
  name: 'Vanity Wallet',
  address: wallet.address,
  privateKey: wallet.privateKey,
  mnemonic: wallet.mnemonic?.phrase || '',
  seedPhrase: wallet.mnemonic?.phrase || '',
  balance: '0.00',
  network: 'XLAYER',
  vanityMatchType: matchType,
  vanityRepeatSide: extra?.side,
  vanityRepeatChar: extra?.char,
  vanityRepeatLength: extra?.length,
  vanityScore: extra?.score,
  vanityHeadRun: extra?.headRun,
  vanityTailRun: extra?.tailRun,
});

const compareWalletScore = (left: RankedVanityWallet, right: RankedVanityWallet): number => compareVanityExtraMatches({
  side: left.vanityRepeatSide || 'head',
  char: left.vanityRepeatChar || '',
  length: left.vanityRepeatLength || 0,
  score: left.vanityScore || 0,
  headRun: left.vanityHeadRun,
  tailRun: left.vanityTailRun,
}, {
  side: right.vanityRepeatSide || 'head',
  char: right.vanityRepeatChar || '',
  length: right.vanityRepeatLength || 0,
  score: right.vanityScore || 0,
  headRun: right.vanityHeadRun,
  tailRun: right.vanityTailRun,
});

self.onmessage = (event: MessageEvent<VanityWorkerRequest>) => {
  const {
    type,
    prefix = '',
    suffix = '',
    batchSize = 120,
    targetCount = 1,
    initialScanned = 0,
    elapsedOffset = 0,
    captureExtras = false,
    extraMinRun = 4,
    extraLimit = 50,
    initialExtraCandidates = [],
  } = event.data || {};

  if (type === 'stop') {
    running = false;
    return;
  }

  if (type !== 'start') return;

  running = true;
  const startTime = Date.now() - Math.max(0, Number(elapsedOffset) || 0) * 1000;
  let scanned = Math.max(0, Number(initialScanned) || 0);
  let found = 0;
  let lastReport = Date.now();
  let lastCandidate = '';
  const safeTargetCount = Math.max(1, Math.min(100, Number(targetCount) || 1));
  const safeExtraMinRun = Math.max(3, Math.min(6, Number(extraMinRun) || 4));
  const safeExtraLimit = Math.max(0, Math.min(500, Number(extraLimit) || 0));
  const extraWallets = initialExtraCandidates
    .filter(wallet => !!wallet.address)
    .sort(compareWalletScore)
    .slice(0, safeExtraLimit);

  const safeBatchSize = Math.max(1, Math.min(5000, Number(batchSize) || 120));

  const runBatch = (): void => {
    if (!running) return;

    for (let i = 0; i < safeBatchSize; i += 1) {
      const wallet = ethers.Wallet.createRandom();
      const address = wallet.address.toLowerCase();
      lastCandidate = address;
      scanned += 1;

      const primaryMatch = (!prefix || address.startsWith(`0x${prefix}`)) && (!suffix || address.endsWith(suffix));
      const extraMatch = captureExtras && safeExtraLimit > 0 ? detectExtraVanityMatch(address, safeExtraMinRun) : null;

      if (primaryMatch) {
        found += 1;
        postVanityMessage({
          type: 'found',
          scanned,
          found,
          elapsed: (Date.now() - startTime) / 1000,
          wallet: createVanityWallet(wallet, 'primary', extraMatch),
          matchType: 'primary',
        });

        if (found >= safeTargetCount) {
          running = false;
          postVanityMessage({
            type: 'complete',
            scanned,
            found,
            elapsed: (Date.now() - startTime) / 1000
          });
          return;
        }
      } else if (extraMatch && !extraWallets.some(item => item.address?.toLowerCase() === address)) {
        const extraWallet = createVanityWallet(wallet, 'extra', extraMatch);
        const weakest = extraWallets[extraWallets.length - 1];
        if (extraWallets.length < safeExtraLimit || (weakest && compareWalletScore(extraWallet, weakest) < 0)) {
          extraWallets.push(extraWallet);
          extraWallets.sort(compareWalletScore);
          extraWallets.splice(safeExtraLimit);
          postVanityMessage({
            type: 'extras',
            scanned,
            found,
            elapsed: (Date.now() - startTime) / 1000,
            wallets: extraWallets,
          });
        }
      }
    }

    const now = Date.now();
    if (now - lastReport >= 250) {
      lastReport = now;
      postVanityMessage({
        type: 'progress',
        scanned,
        found,
        elapsed: (now - startTime) / 1000,
        candidate: lastCandidate
      });
    }

    setTimeout(runBatch, 0);
  };

  runBatch();
};
