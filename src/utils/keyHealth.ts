import { ethers } from 'ethers';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import type { Wallet } from '../types';

export const DEFAULT_ROTATION_MONTHS = 36;
export const PQ_ONE_TIME_SLOTS = 16;
export const ROTATION_WARNING_MS = 30 * 24 * 60 * 60 * 1000;

export type KeyHealthLevel = 'ok' | 'soon' | 'due' | 'missing' | 'snoozed';
export type ProofScope = 'all' | 'visible' | 'attention' | 'signable';
export type ProofCheckReport = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  checkedAt: number;
  scope: ProofScope;
  results: Array<{
    name: string;
    address: string;
    status: 'passed' | 'failed' | 'skipped';
    message: string;
  }>;
};

export type WalletHealth = {
  level: KeyHealthLevel;
  ageMs: number;
  dueAt: number | null;
  daysUntilDue: number | null;
};

const toHex = (bytes: Uint8Array) => ethers.hexlify(bytes);
const PQ_RESERVE_KEY = 'xkey_pq_reserves_v1';

type PostQuantumReserveRecord = {
  id: string;
  scheme: 'lamport-sha256-prepare-v1';
  createdAt: number;
  oneTimeSlots: number;
  publicCommitment: string;
  secretMaterial: string[];
};

const encryptReserveSetting = (value: string, key: string | null): string => (
  key ? CryptoJS.AES.encrypt(value, key).toString() : value
);

const decryptReserveSetting = (cipher: string | null, key: string | null): string => {
  if (!cipher || !key) return cipher || '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, key);
    return bytes.toString(CryptoJS.enc.Utf8) || cipher;
  } catch {
    return cipher;
  }
};

const readPostQuantumReserves = async (aesKey: string | null): Promise<Record<string, PostQuantumReserveRecord>> => {
  const { value } = await Preferences.get({ key: PQ_RESERVE_KEY });
  if (!value) return {};
  const decoded = decryptReserveSetting(value, aesKey);
  const parsed = JSON.parse(decoded || '{}');
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const writePostQuantumReserves = async (aesKey: string | null, reserves: Record<string, PostQuantumReserveRecord>) => {
  await Preferences.set({ key: PQ_RESERVE_KEY, value: encryptReserveSetting(JSON.stringify(reserves), aesKey) });
};

export const createPostQuantumEnvelope = async (aesKey: string | null, slots = PQ_ONE_TIME_SLOTS) => {
  const secrets = Array.from({ length: slots }, () => ethers.randomBytes(32));
  const publicLeaves = secrets.map(secret => ethers.keccak256(secret));
  const commitment = ethers.keccak256(ethers.concat(publicLeaves));
  const reserveId = ethers.hexlify(ethers.randomBytes(16));
  const createdAt = Date.now();
  const reserves = await readPostQuantumReserves(aesKey).catch((): Record<string, PostQuantumReserveRecord> => ({}));
  reserves[reserveId] = {
    id: reserveId,
    scheme: 'lamport-sha256-prepare-v1',
    createdAt,
    oneTimeSlots: slots,
    publicCommitment: commitment,
    secretMaterial: secrets.map(toHex),
  };
  await writePostQuantumReserves(aesKey, reserves);

  return {
    pqPrepared: true,
    pqScheme: 'lamport-sha256-prepare-v1' as const,
    pqCreatedAt: createdAt,
    pqPublicCommitment: commitment,
    pqOneTimeSlots: slots,
    pqUsedSlots: 0,
    pqReserveId: reserveId,
  };
};

export const getWalletHealth = (wallet: Wallet, now = Date.now()): WalletHealth => {
  if (wallet.rotationSnoozedUntil && wallet.rotationSnoozedUntil > now) {
    return {
      level: 'snoozed',
      ageMs: wallet.createdAt ? Math.max(0, now - wallet.createdAt) : 0,
      dueAt: wallet.rotationSnoozedUntil,
      daysUntilDue: Math.ceil((wallet.rotationSnoozedUntil - now) / (24 * 60 * 60 * 1000)),
    };
  }

  if (!wallet.createdAt && !wallet.keyHealthReviewedAt) {
    return { level: 'missing', ageMs: 0, dueAt: null, daysUntilDue: null };
  }

  const months = wallet.rotationReminderMonths || DEFAULT_ROTATION_MONTHS;
  const createdAt = wallet.createdAt || wallet.keyHealthReviewedAt || now;
  const baseAt = wallet.keyHealthReviewedAt && wallet.keyHealthReviewedAt > createdAt ? wallet.keyHealthReviewedAt : createdAt;
  const dueAt = baseAt + months * 30 * 24 * 60 * 60 * 1000;
  const ageMs = Math.max(0, now - createdAt);
  const msUntilDue = dueAt - now;
  const daysUntilDue = Math.ceil(msUntilDue / (24 * 60 * 60 * 1000));

  if (msUntilDue <= 0) return { level: 'due', ageMs, dueAt, daysUntilDue };
  if (msUntilDue <= ROTATION_WARNING_MS) return { level: 'soon', ageMs, dueAt, daysUntilDue };
  return { level: 'ok', ageMs, dueAt, daysUntilDue };
};

export const summarizeKeyHealth = (wallets: Wallet[], now = Date.now()) => {
  const items = wallets.map(wallet => ({ wallet, health: getWalletHealth(wallet, now) }));
  const due = items.filter(item => item.health.level === 'due');
  const soon = items.filter(item => item.health.level === 'soon');
  const missing = items.filter(item => item.health.level === 'missing');
  const pqPrepared = wallets.filter(wallet => wallet.pqPrepared).length;
  const proofPassed = wallets.filter(wallet => wallet.lastProofOfKeysStatus === 'passed').length;
  const proofFailed = wallets.filter(wallet => wallet.lastProofOfKeysStatus === 'failed').length;

  return {
    items,
    due,
    soon,
    missing,
    pqPrepared,
    proofPassed,
    proofFailed,
    attentionCount: due.length + soon.length + missing.length + proofFailed,
  };
};

export const shouldShowProofOfKeysReminder = (now = new Date()) => (
  now.getMonth() === 0 && now.getDate() === 3
);

export const formatKeyAge = (createdAt?: number, now = Date.now()) => {
  if (!createdAt) return 'Unknown';
  const days = Math.max(0, Math.floor((now - createdAt) / (24 * 60 * 60 * 1000)));
  if (days < 45) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years}y ${rest}mo` : `${years}y`;
};

export const runWalletProofCheck = async (wallet: Wallet, nonce: string, now = Date.now()) => {
  const label = wallet.name || wallet.address || 'wallet';
  const message = `xKey Proof-of-Keys check\nWallet: ${label}\nAddress: ${wallet.address || 'unknown'}\nDate: ${new Date(now).toISOString()}\nNonce: ${nonce}`;

  try {
    let signer: ethers.Wallet | ethers.HDNodeWallet | null = null;
    if (wallet.privateKey) {
      signer = new ethers.Wallet(wallet.privateKey.trim());
    } else if (wallet.seedPhrase) {
      signer = ethers.Wallet.fromPhrase(wallet.seedPhrase.trim());
    }

    if (!signer) {
      return {
        ...wallet,
        lastProofOfKeysAt: now,
        lastProofOfKeysStatus: 'skipped' as const,
        lastProofOfKeysMessage: 'No private key or seed phrase available for draft signing.',
      };
    }

    const signature = await signer.signMessage(message);
    const recovered = ethers.verifyMessage(message, signature);
    const expected = wallet.address || signer.address;
    const passed = recovered.toLowerCase() === expected.toLowerCase();

    return {
      ...wallet,
      lastProofOfKeysAt: now,
      lastProofOfKeysStatus: passed ? 'passed' as const : 'failed' as const,
      lastProofOfKeysMessage: passed ? 'Draft signature verified locally.' : 'Draft signature did not recover the expected address.',
    };
  } catch (error) {
    return {
      ...wallet,
      lastProofOfKeysAt: now,
      lastProofOfKeysStatus: 'failed' as const,
      lastProofOfKeysMessage: error instanceof Error ? error.message : 'Draft signing failed.',
    };
  }
};

export const selectProofWallets = (wallets: Wallet[], scope: ProofScope, visibleWallets: Wallet[] = wallets, now = Date.now()) => {
  const source = scope === 'visible' ? visibleWallets : wallets;
  if (scope === 'attention') {
    return source.filter(wallet => ['due', 'soon', 'missing'].includes(getWalletHealth(wallet, now).level) || wallet.lastProofOfKeysStatus === 'failed');
  }
  if (scope === 'signable') {
    return source.filter(wallet => wallet.privateKey || wallet.seedPhrase);
  }
  return source;
};
