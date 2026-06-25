import Papa from 'papaparse';
import type { Wallet } from '../../types';

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

export function parseCsvWallets(rawString: string, folderName: string): Promise<Wallet[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(rawString, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, unknown>>) => {
        const normalizedData: Wallet[] = results.data.map(row => {
          const normalizedRow: Wallet = {
            _raw: Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])),
            groupId: folderName,
            createdAt: Date.now(),
          };

          for (const [key, value] of Object.entries(row)) {
            const lowerKey = key.toLowerCase().trim();
            const stringValue = String(value ?? '');
            if (lowerKey.includes('name')) normalizedRow.name = stringValue;
            else if (lowerKey.includes('address')) normalizedRow.address = stringValue;
            else if (lowerKey.includes('private') || lowerKey === 'pk') normalizedRow.privateKey = stringValue;
            else if (lowerKey.includes('seed') || lowerKey.includes('phrase')) normalizedRow.seedPhrase = stringValue;
            else if (lowerKey.includes('balance') || lowerKey.includes('amount')) normalizedRow.balance = stringValue;
          }

          return normalizedRow;
        });

        resolve(normalizedData);
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