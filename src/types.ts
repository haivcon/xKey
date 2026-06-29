/** Core HD Root metadata model. */
export interface HDRoot {
  _id: string;
  name: string;
  encryptedSeed: string;
  wordCount: 12 | 24;
  createdAt: number;
  lastDerivedIndex?: number;
  networks?: string[];
}

/** Core wallet data model used throughout the app. */
export interface Wallet {
  _id?: string;
  name?: string;
  address?: string;
  privateKey?: string;
  seedPhrase?: string;
  balance?: string;
  network?: string;
  groupId?: string;
  notes?: string;
  /**
   * Optional protected note that should be treated like a secret: hidden by
   * default, copied with secret clipboard policy, and revealed intentionally.
   */
  sensitiveNotes?: string;
  pinned?: boolean;
  tags?: string[];
  createdAt?: number;
  hdRootId?: string;
  derivationPath?: string;
  hdAccount?: number;
  hdIndex?: number;
  hdNetwork?: string;
  /**
   * Offline post-quantum preparation metadata.
   * This does not make current ECDSA chains quantum-safe; it stores a local
   * one-time-signature reserve and public commitment for future migration flows.
   */
  pqPrepared?: boolean;
  pqScheme?: 'lamport-sha256-prepare-v1';
  pqCreatedAt?: number;
  pqPublicCommitment?: string;
  pqOneTimeSlots?: number;
  pqUsedSlots?: number;
  pqReserveId?: string;
  /** @deprecated New wallets store PQ reserve material outside the wallet record. */
  pqSecretMaterial?: string[];
  rotationReminderMonths?: number;
  rotationSnoozedUntil?: number;
  keyHealthReviewedAt?: number;
  lastProofOfKeysAt?: number;
  lastProofOfKeysStatus?: 'passed' | 'failed' | 'skipped';
  lastProofOfKeysMessage?: string;
  vanityMatchType?: 'main' | 'extra';
  vanityRepeatSide?: 'head' | 'tail' | 'both';
  vanityRepeatChar?: string;
  vanityRepeatLength?: number;
  vanityScore?: number;
  vanityHeadRun?: string;
  vanityTailRun?: string;
  vanityPatternType?: string;
  /** Raw CSV row data preserved on import */
  _raw?: Record<string, string>;
}

/** QR modal state */
export interface QrModalData {
  isOpen: boolean;
  data: string;
  title: string;
  subtitle: string;
}

/** Network color configuration */
export interface NetworkColor {
  bg: string;
  text: string;
  label: string;
}

/** Sort order options */
export type SortOrder =
  | 'none'
  | 'name-asc'
  | 'name-desc'
  | 'date-desc'
  | 'date-asc'
  | 'balance-desc'
  | 'balance-asc'
  | 'address-asc'
  | 'vanity-score-desc'
  | 'custom';

/** Filter options */
export type FilterKey =
  | 'all'
  | 'hasPk'
  | 'hasSeed'
  | 'hasBalance'
  | 'empty'
  | 'pinned'
  | `net:${string}`
  | `tag:${string}`;
