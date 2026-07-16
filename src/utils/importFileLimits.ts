import type { Wallet } from '../types';

export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_IMPORT_WALLETS = 10_000;
export const MAX_IMPORT_HEADERS = 64;
export const MAX_IMPORT_TAGS_PER_WALLET = 100;
export const MAX_IMPORT_FIELD_LENGTHS = {
  name: 512,
  address: 256,
  privateKey: 512,
  seedPhrase: 2_048,
  balance: 128,
  network: 128,
  notes: 16_384,
  sensitiveNotes: 16_384,
  groupId: 512,
  tag: 256,
} as const;

const BASE64_DATA_URL_PREFIX = /^data:[^,]*;base64,/i;

export const estimateBase64DecodedBytes = (value: string): number => {
  const base64 = value.replace(BASE64_DATA_URL_PREFIX, '').replace(/\s/g, '');
  if (!base64) return 0;

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

export const isImportFileWithinLimit = (
  size: number | null | undefined,
  base64Data?: string | null,
  maxBytes = MAX_IMPORT_FILE_BYTES,
): boolean => {
  if (typeof size === 'number' && Number.isFinite(size) && size > maxBytes) {
    return false;
  }

  if (base64Data && estimateBase64DecodedBytes(base64Data) > maxBytes) {
    return false;
  }

  return true;
};

const assertStringLength = (
  value: unknown,
  maxLength: number,
  field: string,
  row: number,
): void => {
  if (value == null) return;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`Invalid ${field} at import row ${row}.`);
  }
  if (String(value).length > maxLength) {
    throw new Error(`Import ${field} exceeds the allowed length at row ${row}.`);
  }
};

export const assertImportWalletsWithinLimits = (
  wallets: Array<Wallet | Record<string, unknown>>,
): void => {
  if (!Array.isArray(wallets)) throw new Error('Expected wallet array.');
  if (wallets.length > MAX_IMPORT_WALLETS) {
    throw new Error(`Import exceeds the ${MAX_IMPORT_WALLETS} wallet limit.`);
  }

  wallets.forEach((wallet, index) => {
    if (!wallet || typeof wallet !== 'object' || Array.isArray(wallet)) {
      throw new Error(`Invalid wallet at import row ${index + 1}.`);
    }
    const row = index + 1;
    assertStringLength(wallet.name, MAX_IMPORT_FIELD_LENGTHS.name, 'name', row);
    assertStringLength(wallet.address, MAX_IMPORT_FIELD_LENGTHS.address, 'address', row);
    assertStringLength(wallet.privateKey, MAX_IMPORT_FIELD_LENGTHS.privateKey, 'private key', row);
    assertStringLength(wallet.seedPhrase, MAX_IMPORT_FIELD_LENGTHS.seedPhrase, 'seed phrase', row);
    assertStringLength(wallet.balance, MAX_IMPORT_FIELD_LENGTHS.balance, 'balance', row);
    assertStringLength(wallet.network, MAX_IMPORT_FIELD_LENGTHS.network, 'network', row);
    assertStringLength(wallet.notes, MAX_IMPORT_FIELD_LENGTHS.notes, 'notes', row);
    assertStringLength(wallet.sensitiveNotes, MAX_IMPORT_FIELD_LENGTHS.sensitiveNotes, 'sensitive notes', row);
    assertStringLength(wallet.groupId, MAX_IMPORT_FIELD_LENGTHS.groupId, 'folder', row);

    if (wallet.tags != null) {
      if (!Array.isArray(wallet.tags) || wallet.tags.length > MAX_IMPORT_TAGS_PER_WALLET) {
        throw new Error(`Invalid tags at import row ${row}.`);
      }
      wallet.tags.forEach(tag => assertStringLength(
        tag,
        MAX_IMPORT_FIELD_LENGTHS.tag,
        'tag',
        row,
      ));
    }
  });
};

export const assertImportHeadersWithinLimits = (headers: string[]): void => {
  if (headers.length > MAX_IMPORT_HEADERS) {
    throw new Error(`Import exceeds the ${MAX_IMPORT_HEADERS} column limit.`);
  }
  headers.forEach((header, index) => {
    assertStringLength(
      header,
      MAX_IMPORT_FIELD_LENGTHS.name,
      'column name',
      index + 1,
    );
  });
};
