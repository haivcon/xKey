export type DetectedSecretType = 'privateKey' | 'mnemonic';

const HEX_PRIVATE_KEY_RE = /(?:^|\b)(?:0x)?[a-fA-F0-9]{64}(?:\b|$)/;
const WIF_PRIVATE_KEY_RE = /\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/;
const SOLANA_PRIVATE_KEY_RE = /\[[\s\d,]{120,}\]/;

const MNEMONIC_WORD_RE = /^[a-z]+$/i;
const COMMON_NON_SEED_WORDS = new Set([
  'wallet',
  'address',
  'private',
  'public',
  'balance',
  'network',
  'notes',
  'name',
  'backup',
  'hint',
]);

export const detectSecretInText = (value: string): DetectedSecretType | null => {
  const text = value.trim();
  if (!text) return null;

  if (HEX_PRIVATE_KEY_RE.test(text) || WIF_PRIVATE_KEY_RE.test(text) || SOLANA_PRIVATE_KEY_RE.test(text)) {
    return 'privateKey';
  }

  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if ((words.length === 12 || words.length === 15 || words.length === 18 || words.length === 21 || words.length === 24)
    && words.every(word => MNEMONIC_WORD_RE.test(word))
    && words.filter(word => COMMON_NON_SEED_WORDS.has(word)).length <= 1) {
    return 'mnemonic';
  }

  return null;
};

export const getSecretPlacementWarning = (value: string, targetField: 'name' | 'notes'): string | null => {
  const detected = detectSecretInText(value);
  if (!detected) return null;

  const secretLabel = detected === 'mnemonic' ? 'seed phrase / recovery phrase' : 'private key';
  const targetLabel = targetField === 'name' ? 'wallet name' : 'notes';
  return `Looks like you pasted a ${secretLabel} into ${targetLabel}. Move it to the secret field so xKey can apply stronger protection.`;
};