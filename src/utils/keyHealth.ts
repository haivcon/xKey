import { ethers } from 'ethers';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import type { Wallet } from '../types';

export const DEFAULT_ROTATION_MONTHS = 36;
export const PQ_ONE_TIME_SLOTS = 16;
export const ROTATION_WARNING_MS = 30 * 24 * 60 * 60 * 1000;

export type KeyHealthLevel = 'ok' | 'soon' | 'due' | 'missing' | 'snoozed';
export type KeyHealthRisk = 'ok' | 'warning' | 'danger';
export type DuplicateKind = 'address' | 'privateKey' | 'mnemonic' | 'derivationPath';
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

export type WalletHealthIssue = {
  code:
    | 'missingAddress'
    | 'invalidAddress'
    | 'missingSecret'
    | 'invalidPrivateKey'
    | 'invalidMnemonic'
    | 'weakPrivateKeyEntropy'
    | 'weakMnemonicEntropy'
    | 'duplicateAddress'
    | 'duplicatePrivateKey'
    | 'duplicateMnemonic'
    | 'duplicateDerivationPath'
    | 'missingDerivationPath'
    | 'missingCreatedAt'
    | 'missingBackup'
    | 'outdatedBackup'
    | 'proofFailed'
    | 'rotationDue'
    | 'rotationSoon';
  risk: KeyHealthRisk;
  scoreImpact: number;
};

export type DuplicateGroup = {
  kind: DuplicateKind;
  key: string;
  displayKey: string;
  wallets: Array<Wallet & { _index: number }>;
};

export type WalletHealthDetails = WalletHealth & {
  score: number;
  risk: KeyHealthRisk;
  issues: WalletHealthIssue[];
  backupFresh: boolean;
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

const normalizeAddress = (value?: string) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed.toLowerCase() : '';
};

const normalizePrivateKey = (value?: string) => {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
};

const normalizeMnemonic = (value?: string) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeDerivationPathKey = (wallet: Wallet) => {
  const root = String(wallet.hdRootId || '').trim().toLowerCase();
  const path = String(wallet.derivationPath || '').trim().toLowerCase();
  if (!path) return '';
  return root ? `${root}:${path}` : path;
};

const hasLowHexEntropy = (hex: string) => {
  const normalized = hex.replace(/^0x/i, '').toLowerCase();
  if (normalized.length < 64) return true;
  const uniqueChars = new Set(normalized.split('')).size;
  if (uniqueChars <= 4) return true;
  return /(.)\1{15,}/.test(normalized);
};

const hasLowMnemonicEntropy = (phrase: string) => {
  const words = normalizeMnemonic(phrase).split(' ').filter(Boolean);
  if (words.length < 12) return true;
  return new Set(words).size < Math.ceil(words.length * 0.6);
};

const addIssue = (issues: WalletHealthIssue[], issue: WalletHealthIssue) => {
  if (!issues.some(item => item.code === issue.code)) issues.push(issue);
};

export const getDuplicateGroups = (wallets: Wallet[]): DuplicateGroup[] => {
  const maps: Array<{ kind: DuplicateKind; map: Map<string, Array<Wallet & { _index: number }>> }> = [
    { kind: 'address', map: new Map() },
    { kind: 'privateKey', map: new Map() },
    { kind: 'mnemonic', map: new Map() },
    { kind: 'derivationPath', map: new Map() },
  ];

  wallets.forEach((wallet, index) => {
    const entries: Array<[DuplicateKind, string]> = [
      ['address', normalizeAddress(wallet.address)],
      ['privateKey', normalizePrivateKey(wallet.privateKey)],
      ['mnemonic', normalizeMnemonic(wallet.seedPhrase)],
      ['derivationPath', normalizeDerivationPathKey(wallet)],
    ];

    entries.forEach(([kind, key]) => {
      if (!key) return;
      const target = maps.find(item => item.kind === kind)?.map;
      if (!target) return;
      if (!target.has(key)) target.set(key, []);
      target.get(key)?.push({ ...wallet, _index: index });
    });
  });

  return maps.flatMap(({ kind, map }) => (
    [...map.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => ({
        kind,
        key,
        displayKey: kind === 'mnemonic' || kind === 'privateKey' ? ethers.id(key).slice(0, 18) : key,
        wallets: group,
      }))
  )).sort((a, b) => b.wallets.length - a.wallets.length || a.kind.localeCompare(b.kind));
};

export const isWalletBackupFresh = (wallet: Wallet) => {
  if (!wallet.lastBackupAt) return false;
  const changedAt = wallet.updatedAt || wallet.createdAt || 0;
  if (changedAt > wallet.lastBackupAt) return false;
  return wallet.backupStatus === 'current' || changedAt <= wallet.lastBackupAt;
};

export const markWalletsBackupMissing = (wallets: Wallet[], now = Date.now()): Wallet[] => wallets.map(wallet => ({
  ...wallet,
  updatedAt: wallet.updatedAt || now,
  backupStatus: 'missing' as const,
}));

export const markWalletsBackupOutdated = (wallets: Wallet[], matcher: (wallet: Wallet) => boolean, now = Date.now()): Wallet[] => wallets.map(wallet => {
  if (!matcher(wallet)) return wallet;
  return {
    ...wallet,
    updatedAt: now,
    backupStatus: wallet.lastBackupAt ? 'outdated' as const : 'missing' as const,
  };
});

export const markWalletsBackedUp = async (wallets: Wallet[], backupCreatedAt = Date.now(), backupHash = ''): Promise<Wallet[]> => wallets.map(wallet => ({
  ...wallet,
  lastBackupAt: backupCreatedAt,
  lastBackupHash: backupHash || wallet.lastBackupHash,
  backupStatus: 'current' as const,
}));

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

export const getWalletHealthDetails = (wallet: Wallet, wallets: Wallet[] = [wallet], now = Date.now()): WalletHealthDetails => {
  const base = getWalletHealth(wallet, now);
  const issues: WalletHealthIssue[] = [];
  const address = String(wallet.address || '').trim();
  const privateKey = normalizePrivateKey(wallet.privateKey);
  const mnemonic = normalizeMnemonic(wallet.seedPhrase);
  const duplicateGroups = getDuplicateGroups(wallets);
  const walletIndex = wallets.indexOf(wallet);

  if (!address) {
    addIssue(issues, { code: 'missingAddress', risk: 'warning', scoreImpact: 8 });
  } else if (!ethers.isAddress(address)) {
    addIssue(issues, { code: 'invalidAddress', risk: 'danger', scoreImpact: 18 });
  }

  if (!privateKey && !mnemonic) {
    addIssue(issues, { code: 'missingSecret', risk: 'warning', scoreImpact: 8 });
  }

  if (privateKey) {
    try {
      new ethers.Wallet(privateKey);
      if (hasLowHexEntropy(privateKey)) addIssue(issues, { code: 'weakPrivateKeyEntropy', risk: 'danger', scoreImpact: 25 });
    } catch {
      addIssue(issues, { code: 'invalidPrivateKey', risk: 'danger', scoreImpact: 30 });
    }
  }

  if (mnemonic) {
    if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
      addIssue(issues, { code: 'invalidMnemonic', risk: 'danger', scoreImpact: 30 });
    } else if (hasLowMnemonicEntropy(mnemonic)) {
      addIssue(issues, { code: 'weakMnemonicEntropy', risk: 'danger', scoreImpact: 20 });
    }
  }

  if ((wallet.hdRootId || wallet.hdAccount !== undefined || wallet.hdIndex !== undefined) && !wallet.derivationPath) {
    addIssue(issues, { code: 'missingDerivationPath', risk: 'warning', scoreImpact: 6 });
  }

  if (!wallet.createdAt) addIssue(issues, { code: 'missingCreatedAt', risk: 'warning', scoreImpact: 5 });

  if (!isWalletBackupFresh(wallet)) {
    addIssue(issues, {
      code: wallet.lastBackupAt ? 'outdatedBackup' : 'missingBackup',
      risk: wallet.lastBackupAt ? 'warning' : 'danger',
      scoreImpact: wallet.lastBackupAt ? 12 : 22,
    });
  }

  if (wallet.lastProofOfKeysStatus === 'failed') addIssue(issues, { code: 'proofFailed', risk: 'danger', scoreImpact: 20 });
  if (base.level === 'due') addIssue(issues, { code: 'rotationDue', risk: 'warning', scoreImpact: 10 });
  if (base.level === 'soon') addIssue(issues, { code: 'rotationSoon', risk: 'warning', scoreImpact: 5 });

  duplicateGroups.forEach(group => {
    const hasWallet = group.wallets.some(item => (
      walletIndex >= 0 ? item._index === walletIndex : item._id && wallet._id ? item._id === wallet._id : item.address === wallet.address && item.name === wallet.name
    ));
    if (!hasWallet) return;
    const code = `duplicate${group.kind.charAt(0).toUpperCase()}${group.kind.slice(1)}` as WalletHealthIssue['code'];
    addIssue(issues, {
      code,
      risk: group.kind === 'address' || group.kind === 'derivationPath' ? 'warning' : 'danger',
      scoreImpact: group.kind === 'address' || group.kind === 'derivationPath' ? 12 : 30,
    });
  });

  const score = Math.max(0, Math.min(100, 100 - issues.reduce((total, issue) => total + issue.scoreImpact, 0)));
  const risk: KeyHealthRisk = issues.some(issue => issue.risk === 'danger')
    ? 'danger'
    : issues.some(issue => issue.risk === 'warning')
      ? 'warning'
      : 'ok';

  return {
    ...base,
    score,
    risk,
    issues,
    backupFresh: isWalletBackupFresh(wallet),
  };
};

export const summarizeKeyHealth = (wallets: Wallet[], now = Date.now()) => {
  const items = wallets.map(wallet => ({ wallet, health: getWalletHealthDetails(wallet, wallets, now) }));
  const due = items.filter(item => item.health.level === 'due');
  const soon = items.filter(item => item.health.level === 'soon');
  const missing = items.filter(item => item.health.level === 'missing');
  const pqPrepared = wallets.filter(wallet => wallet.pqPrepared).length;
  const proofPassed = wallets.filter(wallet => wallet.lastProofOfKeysStatus === 'passed').length;
  const proofFailed = wallets.filter(wallet => wallet.lastProofOfKeysStatus === 'failed').length;
  const backupMissing = items.filter(item => item.health.issues.some(issue => issue.code === 'missingBackup' || issue.code === 'outdatedBackup'));
  const duplicateGroups = getDuplicateGroups(wallets);
  const weak = items.filter(item => item.health.risk === 'danger');

  return {
    items,
    due,
    soon,
    missing,
    pqPrepared,
    proofPassed,
    proofFailed,
    backupMissing,
    duplicateGroups,
    weak,
    averageScore: wallets.length ? Math.round(items.reduce((total, item) => total + item.health.score, 0) / wallets.length) : 100,
    attentionCount: due.length + soon.length + missing.length + proofFailed + backupMissing.length + weak.length,
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
    return source.filter(wallet => ['due', 'soon', 'missing'].includes(getWalletHealth(wallet, now).level) || wallet.lastProofOfKeysStatus === 'failed' || !isWalletBackupFresh(wallet));
  }
  if (scope === 'signable') {
    return source.filter(wallet => wallet.privateKey || wallet.seedPhrase);
  }
  return source;
};