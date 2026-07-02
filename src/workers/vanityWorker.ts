import { ethers } from 'ethers';
import { assertEntropyQuality } from '../utils/crypto/entropyUtils';
import type { Wallet } from '../types';
import { compareVanityExtraMatches, detectExtraVanityMatch, normalizeVanityExtraFilters, type VanityExtraFilterConfig, type VanityExtraFilterRule, type VanityExtraMatch, type VanityExtraPatternKey, type VanityExtraPatternType, type VanityRepeatSide } from '../utils/vanity/vanityMatch';

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
  extraFilters?: Partial<Record<VanityExtraPatternKey, Partial<VanityExtraFilterRule>>>;
  initialExtraCandidates?: VanityExtraCandidate[];
  generationMode?: 'privateKey' | 'mnemonic';
  mnemonicWords?: 12 | 24;
};

type VanityWallet = Wallet & {
  mnemonic?: string;
  vanityMatchType?: 'main' | 'extra';
  vanityRepeatSide?: VanityRepeatSide;
  vanityRepeatChar?: string;
  vanityRepeatLength?: number;
  vanityScore?: number;
  vanityHeadRun?: string;
  vanityTailRun?: string;
  vanityPatternType?: VanityExtraPatternType;
};

type VanityExtraCandidate = Pick<VanityWallet,
  'address' | 'vanityMatchType' | 'vanityRepeatSide' | 'vanityRepeatChar' |
  'vanityRepeatLength' | 'vanityScore' | 'vanityHeadRun' | 'vanityTailRun' | 'vanityPatternType'
>;

type RankedVanityWallet = VanityWallet | VanityExtraCandidate;

type VanityWorkerResponse =
  | {
      type: 'found';
      scanned: number;
      found: number;
      elapsed: number;
      wallet: VanityWallet;
      matchType: 'main' | 'extra';
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
    }
  | {
      type: 'error';
      code: 'entropy-verification-failed';
      details: string[];
    };

const postVanityMessage = (message: VanityWorkerResponse): void => {
  self.postMessage(message);
};

const deriveAddressFromPrivateKey = (privateKey: string): string => {
  const publicKey = ethers.SigningKey.computePublicKey(privateKey, false);
  return `0x${ethers.keccak256(`0x${publicKey.slice(4)}`).slice(-40)}`;
};

const wipePrivateKeyBytes = (bytes: Uint8Array): void => {
  bytes.fill(0);
};

const createVanityWallet = (
  privateKey: string,
  address: string,
  matchType: 'main' | 'extra',
  extra?: VanityExtraMatch | null,
  mnemonic?: string,
  primaryPrefix = '',
  primarySuffix = '',
): VanityWallet => ({
  name: 'Vanity Wallet',
  address: ethers.getAddress(address),
  privateKey,
  mnemonic: mnemonic || '',
  seedPhrase: mnemonic || '',
  balance: '0.00',
  network: 'XLAYER',
  vanityMatchType: matchType,
  vanityRepeatSide: extra?.side,
  vanityRepeatChar: extra?.char,
  vanityRepeatLength: extra?.length,
  vanityScore: extra?.score,
  vanityHeadRun: extra?.headRun || (matchType === 'main' && primaryPrefix ? address.slice(2, 2 + primaryPrefix.length) : undefined),
  vanityTailRun: extra?.tailRun || (matchType === 'main' && primarySuffix ? address.slice(-primarySuffix.length) : undefined),
  vanityPatternType: extra?.patternType,
});

const compareWalletScore = (left: RankedVanityWallet, right: RankedVanityWallet): number => compareVanityExtraMatches({
  side: left.vanityRepeatSide || 'head',
  char: left.vanityRepeatChar || '',
  length: left.vanityRepeatLength || 0,
  score: left.vanityScore || 0,
  headRun: left.vanityHeadRun,
  tailRun: left.vanityTailRun,
  patternType: left.vanityPatternType,
}, {
  side: right.vanityRepeatSide || 'head',
  char: right.vanityRepeatChar || '',
  length: right.vanityRepeatLength || 0,
  score: right.vanityScore || 0,
  headRun: right.vanityHeadRun,
  tailRun: right.vanityTailRun,
  patternType: right.vanityPatternType,
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
    extraFilters,
    initialExtraCandidates = [],
    generationMode = 'privateKey',
    mnemonicWords = 12,
  } = event.data || {};

  if (type === 'stop') {
    running = false;
    return;
  }

  if (type !== 'start') return;

  const entropyVerification = assertEntropyQuality();
  if (!entropyVerification.ok) {
    running = false;
    postVanityMessage({
      type: 'error',
      code: 'entropy-verification-failed',
      details: entropyVerification.details,
    });
    return;
  }

  running = true;
  const startTime = Date.now() - Math.max(0, Number(elapsedOffset) || 0) * 1000;
  let scanned = Math.max(0, Number(initialScanned) || 0);
  let found = 0;
  let lastReport = 0;
  let lastCandidate = '';
  const safeTargetCount = Math.max(1, Math.floor(Number(targetCount) || 1));
  const safeExtraMinRun = Math.max(3, Math.min(6, Number(extraMinRun) || 4));
  const safeExtraLimit = Math.max(0, Math.floor(Number(extraLimit) || 0));
  const safeExtraFilters: VanityExtraFilterConfig = normalizeVanityExtraFilters(extraFilters, safeExtraMinRun);
  const extraWallets = initialExtraCandidates
    .filter(wallet => !!wallet.address)
    .sort(compareWalletScore)
    .slice(0, safeExtraLimit);

  const safeBatchSize = Math.max(1, Math.min(20000, Number(batchSize) || 1024));

  const reportProgress = (now = Date.now()): void => {
    lastReport = now;
    postVanityMessage({
      type: 'progress',
      scanned,
      found,
      elapsed: (now - startTime) / 1000,
      candidate: lastCandidate,
    });
  };

  reportProgress();

  const runBatch = (): void => {
    if (!running) return;

    for (let i = 0; i < safeBatchSize; i += 1) {
      let privateKeyBytes: Uint8Array | null = null;
      let privateKey: string;
      let address: string;
      let mnemonic = '';

      if (generationMode === 'mnemonic') {
        if (mnemonicWords === 24) {
          const m = ethers.Mnemonic.fromEntropy(ethers.randomBytes(32));
          const wallet = ethers.HDNodeWallet.fromMnemonic(m);
          privateKey = wallet.privateKey;
          address = wallet.address.toLowerCase();
          mnemonic = wallet.mnemonic?.phrase || '';
        } else {
          const wallet = ethers.Wallet.createRandom();
          privateKey = wallet.privateKey;
          address = wallet.address.toLowerCase();
          mnemonic = wallet.mnemonic?.phrase || '';
        }
      } else {
        privateKeyBytes = ethers.randomBytes(32);
        privateKey = ethers.hexlify(privateKeyBytes);
        address = deriveAddressFromPrivateKey(privateKey).toLowerCase();
      }

      lastCandidate = address;
      scanned += 1;

      const primaryMatch = (!prefix || address.startsWith(`0x${prefix}`)) && (!suffix || address.endsWith(suffix));
      const extraMatch = captureExtras && safeExtraLimit > 0 ? detectExtraVanityMatch(address, safeExtraFilters) : null;

      if (primaryMatch) {
        found += 1;
        postVanityMessage({
          type: 'found',
          scanned,
          found,
          elapsed: (Date.now() - startTime) / 1000,
          wallet: createVanityWallet(privateKey, address, 'main', extraMatch, mnemonic, prefix, suffix),
          matchType: 'main',
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
        const extraWallet = createVanityWallet(privateKey, address, 'extra', extraMatch, mnemonic);
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
        } else {
          if (privateKeyBytes) wipePrivateKeyBytes(privateKeyBytes);
        }
      } else {
        if (privateKeyBytes) wipePrivateKeyBytes(privateKeyBytes);
      }

      const now = Date.now();
      if (now - lastReport >= 250) {
        reportProgress(now);
      }
    }

    const batchEnd = Date.now();
    if (batchEnd - lastReport >= 250) {
      reportProgress(batchEnd);
    }

    setTimeout(runBatch, 0);
  };

  runBatch();
};
