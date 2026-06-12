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
  pinned?: boolean;
  tags?: string[];
  createdAt?: number;
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
