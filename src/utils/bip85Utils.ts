import { ethers } from 'ethers';

/**
 * BIP85 Deterministic Entropy Derivation
 *
 * Derives entropy from a BIP32 HD wallet according to BIP-0085.
 * This allows a single master seed to deterministically generate
 * standard BIP39 mnemonics for other wallets.
 */

const BIP85_ROOT_PURPOSE = 83696968;
const BIP85_HARDENED_ROOT_PATH = `m/${BIP85_ROOT_PURPOSE}'`;
const HMAC_KEY = ethers.toUtf8Bytes('bip-entropy-from-k');
const MAX_HARDENED_INDEX = 0x7fffffff;

export interface BIP85DerivationOptions {
  words?: 12 | 24; // Default 12
  language?: 0; // 0 = English
  index?: number; // Default 0
}

export interface BIP85DerivationResult {
  entropy: Uint8Array;
  mnemonic: string;
  path: string;
}

/**
 * Validates whether the provided seed phrase or private key is a valid HDNode.
 */
export function isValidMasterNode(mnemonicOrPk: string): boolean {
  try {
    const trimmed = mnemonicOrPk.trim();
    if (trimmed.includes(' ')) {
      ethers.Mnemonic.fromPhrase(trimmed);
      return true;
    }

    if (/^[xt]prv/.test(trimmed)) {
      const node = ethers.HDNodeWallet.fromExtendedKey(trimmed);
      return 'privateKey' in node;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Derives BIP39 entropy (and corresponding mnemonic) using BIP85 from a master mnemonic.
 *
 * Path format for BIP39: m/83696968'/39'/language'/words'/index'
 */
export function deriveBIP39Mnemonic(
  masterPhraseOrXprv: string,
  options: BIP85DerivationOptions = {},
): BIP85DerivationResult {
  const { words = 12, language = 0, index = 0 } = options;

  if (words !== 12 && words !== 24) {
    throw new Error('BIP85 BIP39 derivation supports only 12 or 24 words.');
  }

  if (language !== 0) {
    throw new Error('Only the English BIP39 wordlist is currently supported.');
  }

  if (!Number.isSafeInteger(index) || index < 0 || index > MAX_HARDENED_INDEX) {
    throw new Error(`Index must be an integer from 0 to ${MAX_HARDENED_INDEX}.`);
  }

  const entropyLength = words === 24 ? 32 : 16;
  const trimmedMaster = masterPhraseOrXprv.trim();

  let masterNode: ethers.HDNodeWallet;
  if (trimmedMaster.includes(' ')) {
    const mnemonic = ethers.Mnemonic.fromPhrase(trimmedMaster);
    masterNode = ethers.HDNodeWallet.fromSeed(mnemonic.computeSeed());
  } else {
    const node = ethers.HDNodeWallet.fromExtendedKey(trimmedMaster);
    if (!('privateKey' in node)) {
      throw new Error('Provided extended key must contain a private key (xprv/tprv) to derive entropy.');
    }
    masterNode = node;
  }

  // Ethers HDNodeWallet.fromPhrase() defaults to m/44'/60'/0'/0/0. BIP85
  // must derive from the BIP32 master/root node instead.
  const path = `m/${BIP85_ROOT_PURPOSE}'/39'/${language}'/${words}'/${index}'`;
  const childPath = `39'/${language}'/${words}'/${index}'`;
  const childNode = masterNode.derivePath(BIP85_HARDENED_ROOT_PATH).derivePath(childPath);

  const pkBytes = ethers.getBytes(childNode.privateKey);

  // HMAC-SHA512(Key="bip-entropy-from-k", Data=child_pk)
  const hmacHex = ethers.computeHmac('sha512', HMAC_KEY, pkBytes);
  const hmacBytes = ethers.getBytes(hmacHex);

  const entropy = hmacBytes.slice(0, entropyLength);
  const mnemonicObj = ethers.Mnemonic.fromEntropy(entropy);

  return {
    entropy,
    mnemonic: mnemonicObj.phrase,
    path,
  };
}