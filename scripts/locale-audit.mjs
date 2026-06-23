import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const localeDir = path.join(process.cwd(), 'src', 'locales');
const allowedEnglish = new Set([
  'xKey',
  'NOT YOUR KEY, NOT YOUR CRYPTO',
  'GitHub',
  'OKX',
  'Web3',
  'XLAYER',
  'ETH',
  'BSC',
  'CSV',
  'QR',
  'PIN',
  'RAM',
  'Android',
  'Keystore',
  'Shamir',
]);

const englishLeakPattern = /\b(Wrong password|Portable Backups|Enter master password|Change network|Copied!|Backup is valid|Pick backup file)\b/;

const extractDefaultObject = (source) => {
  const cleaned = source
    .replace(/^\s*import\s+.*$/gm, '')
    .replace(/^\s*export\s+default\s+/, '')
    .trim()
    .replace(/;\s*$/, '');
  return Function(`"use strict"; return (${cleaned});`)();
};

const flatten = (value, prefix = '') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { [prefix]: value };
  return Object.entries(value).reduce((acc, [key, child]) => ({
    ...acc,
    ...flatten(child, prefix ? `${prefix}.${key}` : key),
  }), {});
};

const files = (await readdir(localeDir)).filter(file => file.endsWith('.ts') && file !== 'index.ts').sort();
const locales = {};
for (const file of files) {
  locales[file.replace(/\.ts$/, '')] = extractDefaultObject(await readFile(path.join(localeDir, file), 'utf8'));
}

const base = flatten(locales.en);
let failed = false;

for (const [code, tree] of Object.entries(locales)) {
  if (code === 'en') continue;
  const flat = flatten(tree);
  const missing = Object.keys(base).filter(key => !(key in flat));
  const extra = Object.keys(flat).filter(key => !(key in base));
  const leaked = Object.entries(flat)
    .filter(([, value]) => typeof value === 'string')
    .filter(([, value]) => englishLeakPattern.test(value) && !allowedEnglish.has(value));

  if (missing.length || extra.length || leaked.length) {
    failed = true;
    console.error(`Locale ${code} failed audit.`);
    if (missing.length) console.error(`  Missing keys: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' ...' : ''}`);
    if (extra.length) console.error(`  Extra keys: ${extra.slice(0, 20).join(', ')}${extra.length > 20 ? ' ...' : ''}`);
    if (leaked.length) console.error(`  English leaks: ${leaked.slice(0, 20).map(([key, value]) => `${key}="${value}"`).join(', ')}`);
  }
}

if (failed) process.exit(1);
console.log(`Locale audit passed for ${files.length} locale files.`);
