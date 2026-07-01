import Papa from 'papaparse';
import type { Wallet } from '../../types';

export type CsvWalletColumnKey = keyof Pick<Wallet, 'name' | 'address' | 'balance' | 'groupId' | 'network' | 'privateKey' | 'seedPhrase'>;
export type CsvImportColumnKey = CsvWalletColumnKey | 'ignore';
export type CsvImportMapping = Partial<Record<CsvWalletColumnKey, string>>;
export type CsvImportIssue = { row: number; field: 'address' | 'network' | 'privateKey' | 'seedPhrase' | 'duplicate'; message: string };
export type CsvImportPreview = {
  fileName: string;
  folderName: string;
  headers: string[];
  rowCount: number;
  parsedWallets: Wallet[];
  uniqueWallets: Wallet[];
  skippedDuplicates: number;
  missingAddress: number;
  invalidAddress: number;
  sensitiveCount: number;
  includesSensitive: boolean;
  issues: CsvImportIssue[];
  mapping: CsvImportMapping;
};

const CSV_FORMULA_PREFIX = /^\s*[=+\-@]/;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const SOL_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function normalizeCsvHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function sanitizeCsvCell(value: unknown): string {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').replace(/\r/g, ' ');
  return CSV_FORMULA_PREFIX.test(normalized) ? `'${normalized}` : normalized;
}

export function buildWalletCsv(
  wallets: Wallet[],
  columns: Array<{ key: CsvWalletColumnKey; label: string }>,
): string {
  return Papa.unparse(
    {
      fields: columns.map(column => column.label),
      data: wallets.map(wallet => columns.map(column => sanitizeCsvCell(wallet[column.key]))),
    },
    {
      quotes: true,
      newline: '\n',
    },
  );
}

export function decodeBase64Text(fileData: string): string {
  const binString = atob(fileData);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i += 1) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function getImportFolderName(fileName: string, targetFolderName = ''): string {
  const preferredFolder = String(targetFolderName || '').trim();
  return preferredFolder || fileName.replace(/\.(csv|json|txt)$/i, '');
}

export function parseJsonWallets(rawString: string, folderName: string): Wallet[] {
  const jsonData = JSON.parse(rawString.trim()) as Array<Record<string, unknown>>;
  if (!Array.isArray(jsonData)) throw new Error('Expected JSON array');

  return jsonData.map(row => ({
    name: String(row.name || row.Name || ''),
    address: String(row.address || row.Address || row.wallet || ''),
    privateKey: String(row.privateKey || row.private_key || row.pk || ''),
    seedPhrase: String(row.seedPhrase || row.seed_phrase || row.seed || row.mnemonic || ''),
    balance: String(row.balance || row.Balance || ''),
    network: String(row.network || row.Network || 'ETH'),
    notes: String(row.notes || row.Notes || ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    groupId: folderName,
    createdAt: Number(row.createdAt || Date.now()),
  }));
}

export function parseTextWallets(rawString: string, folderName: string): Wallet[] {
  return rawString
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, i) => ({
      name: `Wallet ${i + 1}`,
      address: line,
      groupId: folderName,
      createdAt: Date.now(),
      network: 'ETH',
    }));
}

function guessCsvColumn(headers: string[], key: CsvWalletColumnKey): string {
  const matchers: Record<CsvWalletColumnKey, (normalized: string) => boolean> = {
    name: lowerKey => lowerKey.includes('name') || lowerKey === 'wallet' || lowerKey.includes('ten vi'),
    address: lowerKey => lowerKey.includes('address') || lowerKey === 'addr' || lowerKey.includes('dia chi'),
    privateKey: lowerKey => lowerKey.includes('private') || lowerKey.includes('secret') || lowerKey === 'pk' || lowerKey.includes('khoa rieng'),
    seedPhrase: lowerKey => lowerKey.includes('seed') || lowerKey.includes('phrase') || lowerKey.includes('mnemonic') || lowerKey.includes('cum tu'),
    balance: lowerKey => lowerKey.includes('balance') || lowerKey.includes('amount') || lowerKey.includes('so du'),
    network: lowerKey => lowerKey.includes('network') || lowerKey.includes('chain') || lowerKey === 'mang',
    groupId: lowerKey => lowerKey.includes('folder') || lowerKey.includes('group') || lowerKey.includes('thu muc'),
  };
  return headers.find(header => matchers[key](normalizeCsvHeader(header))) || '';
}

export function guessCsvImportMapping(headers: string[]): CsvImportMapping {
  return {
    name: guessCsvColumn(headers, 'name'),
    address: guessCsvColumn(headers, 'address'),
    privateKey: guessCsvColumn(headers, 'privateKey'),
    seedPhrase: guessCsvColumn(headers, 'seedPhrase'),
    balance: guessCsvColumn(headers, 'balance'),
    network: guessCsvColumn(headers, 'network'),
    groupId: guessCsvColumn(headers, 'groupId'),
  };
}

function parseCsvRows(rawString: string): Promise<{ headers: string[]; rows: Array<Record<string, unknown>> }> {
  return new Promise((resolve, reject) => {
    Papa.parse(rawString.replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0]?.message || 'Invalid CSV'));
          return;
        }

        resolve({
          headers: results.meta.fields || [],
          rows: results.data,
        });
      },
      error: reject,
    });
  });
}

export function mapCsvRowsToWallets(
  rows: Array<Record<string, unknown>>,
  folderName: string,
  mapping: CsvImportMapping,
): Wallet[] {
  return rows.map(row => {
    const normalizedRow: Wallet = {
      _raw: Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])),
      groupId: folderName,
      createdAt: Date.now(),
    };

    for (const key of Object.keys(mapping) as CsvWalletColumnKey[]) {
      const header = mapping[key];
      if (!header) continue;
      const stringValue = String(row[header] ?? '').trim();
      if (key === 'groupId') normalizedRow.groupId = stringValue || folderName;
      else normalizedRow[key] = stringValue;
    }

    if (!normalizedRow.network) normalizedRow.network = 'ETH';
    if (!normalizedRow.groupId) normalizedRow.groupId = folderName;

    return normalizedRow;
  });
}

export function validateCsvWallets(wallets: Wallet[], existingWallets: Wallet[] = []): CsvImportIssue[] {
  const issues: CsvImportIssue[] = [];
  const seen = new Set(existingWallets.map(wallet => wallet.address?.toLowerCase()).filter(Boolean));

  wallets.forEach((wallet, index) => {
    const row = index + 2;
    const address = String(wallet.address || '').trim();
    const network = String(wallet.network || 'ETH').trim().toUpperCase();

    if (!address) {
      issues.push({ row, field: 'address', message: 'Missing address' });
      return;
    }

    if (seen.has(address.toLowerCase())) {
      issues.push({ row, field: 'duplicate', message: 'Duplicate address' });
    }
    seen.add(address.toLowerCase());

    if (['ETH', 'EVM', 'BSC', 'BNB', 'POLYGON', 'MATIC', 'BASE', 'ARBITRUM', 'OPTIMISM', 'AVAX', 'XDC'].includes(network) && !EVM_ADDRESS.test(address)) {
      issues.push({ row, field: 'address', message: 'Address does not match EVM format' });
    } else if (['SOL', 'SOLANA'].includes(network) && !SOL_ADDRESS.test(address)) {
      issues.push({ row, field: 'address', message: 'Address does not match Solana format' });
    }
  });

  return issues;
}

export async function buildCsvImportPreview(
  rawString: string,
  fileName: string,
  folderName: string,
  existingWallets: Wallet[] = [],
  mapping?: CsvImportMapping,
): Promise<CsvImportPreview> {
  const { headers, rows } = await parseCsvRows(rawString);
  const effectiveMapping = mapping || guessCsvImportMapping(headers);
  const parsedWallets = mapCsvRowsToWallets(rows, folderName, effectiveMapping);
  const { uniqueWallets, skippedCount } = dedupeWallets(existingWallets, parsedWallets);
  const issues = validateCsvWallets(parsedWallets, existingWallets);
  const sensitiveCount = parsedWallets.filter(wallet => Boolean(wallet.privateKey || wallet.seedPhrase)).length;

  return {
    fileName,
    folderName,
    headers,
    rowCount: rows.length,
    parsedWallets,
    uniqueWallets,
    skippedDuplicates: skippedCount,
    missingAddress: parsedWallets.filter(wallet => !wallet.address).length,
    invalidAddress: issues.filter(issue => issue.field === 'address' && issue.message !== 'Missing address').length,
    sensitiveCount,
    includesSensitive: sensitiveCount > 0,
    issues,
    mapping: effectiveMapping,
  };
}

export function buildCsvImportReport(preview: CsvImportPreview, importedCount: number): string {
  const lines = [
    'xKey CSV Import Report',
    `File: ${preview.fileName}`,
    `Folder: ${preview.folderName}`,
    `Rows: ${preview.rowCount}`,
    `Parsed wallets: ${preview.parsedWallets.length}`,
    `Imported wallets: ${importedCount}`,
    `Skipped duplicates: ${preview.skippedDuplicates}`,
    `Missing address: ${preview.missingAddress}`,
    `Invalid address warnings: ${preview.invalidAddress}`,
    `Sensitive rows: ${preview.sensitiveCount}`,
    '',
    'Column mapping:',
    ...Object.entries(preview.mapping).map(([key, value]) => `- ${key}: ${value || '(not mapped)'}`),
  ];

  if (preview.issues.length > 0) {
    lines.push('', 'Issues:');
    preview.issues.slice(0, 200).forEach(issue => lines.push(`- Row ${issue.row}: ${issue.message}`));
  }

  return lines.join('\n');
}

export function parseCsvWallets(rawString: string, folderName: string): Promise<Wallet[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(rawString.replace(/^\uFEFF/, ''), {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0]?.message || 'Invalid CSV'));
          return;
        }

        const headers = results.meta.fields || [];
        resolve(mapCsvRowsToWallets(results.data, folderName, guessCsvImportMapping(headers)));
      },
      error: reject,
    });
  });
}

export function detectImportFormat(fileName: string, rawString: string): 'json' | 'text' | 'csv' {
  const trimmed = rawString.trim();
  const lowerName = fileName.toLowerCase();

  if ((lowerName.endsWith('.json') || trimmed.startsWith('[')) && trimmed.startsWith('[')) return 'json';
  if (lowerName.endsWith('.txt') || (!trimmed.includes(',') && trimmed.split('\n').length > 1)) return 'text';
  return 'csv';
}

export function dedupeWallets(existingWallets: Wallet[], incomingWallets: Wallet[]) {
  const existingAddrs = new Set(existingWallets.map(w => w.address?.toLowerCase()).filter(Boolean));
  const uniqueWallets = incomingWallets.filter(w => {
    if (!w.address) return true;
    const lower = w.address.toLowerCase();
    if (existingAddrs.has(lower)) return false;
    existingAddrs.add(lower);
    return true;
  });

  return {
    uniqueWallets,
    skippedCount: incomingWallets.length - uniqueWallets.length,
  };
}