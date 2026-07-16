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
const allowedIdenticalEnglishValues = new Set([
  ...allowedEnglish,
  'AES-256-GCM',
  'AES-GCM',
  'PBKDF2',
  'PBKDF2-SHA256',
  'Argon2id',
  'Base',
  'Bitcoin',
  'Ethereum',
  'Polygon',
  'Solana',
  'USDC',
  'USDT',
]);

const shouldWarnIdenticalEnglish = (value) => (
  typeof value === 'string'
  && value.trim().length >= 3
  && /[A-Za-z]/.test(value)
  && !allowedIdenticalEnglishValues.has(value.trim())
);

const requiredLocalizedKeys = [
  'createWallet.vanityExtraCaptureTitle',
  'createWallet.vanityExtraCaptureDesc',
  'createWallet.vanityExtraExample',
  'createWallet.vanityExtraMinRun',
  'createWallet.vanityExtraMinRun_3',
  'createWallet.vanityExtraMinRun_4',
  'createWallet.vanityExtraMinRun_5',
  'createWallet.vanityExtraMinRun_6',
  'createWallet.vanityExtraLimit',
  'createWallet.vanityExtraFolder',
  'createWallet.vanityPrimaryMatches',
  'createWallet.vanityExtraKept',
  'createWallet.vanityExtraEmpty',
  'createWallet.vanityExtraHead',
  'createWallet.vanityExtraTail',
  'createWallet.vanityExtraBoth',
  'createWallet.vanityExtraScore',
  'createWallet.vanityExtraWalletName',
  'createWallet.vanityResultSummary',
];

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
let qualityWarningCount = 0;

for (const [code, tree] of Object.entries(locales)) {
  if (code === 'en') continue;
  const flat = flatten(tree);
  const missing = Object.keys(base).filter(key => !(key in flat));
  const extra = Object.keys(flat).filter(key => !(key in base));
  const leaked = Object.entries(flat)
    .filter(([, value]) => typeof value === 'string')
    .filter(([, value]) => englishLeakPattern.test(value) && !allowedEnglish.has(value));
  const untranslated = requiredLocalizedKeys.filter(key => flat[key] === base[key]);
  const identicalEnglish = Object.entries(flat)
    .filter(([key, value]) => value === base[key] && shouldWarnIdenticalEnglish(value))
    .filter(([key]) => !requiredLocalizedKeys.includes(key));

  if (missing.length || extra.length || leaked.length || untranslated.length) {
    failed = true;
    console.error(`Locale ${code} failed audit.`);
    if (missing.length) console.error(`  Missing keys: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' ...' : ''}`);
    if (extra.length) console.error(`  Extra keys: ${extra.slice(0, 20).join(', ')}${extra.length > 20 ? ' ...' : ''}`);
    if (leaked.length) console.error(`  English leaks: ${leaked.slice(0, 20).map(([key, value]) => `${key}="${value}"`).join(', ')}`);
    if (untranslated.length) console.error(`  Required translations still use English: ${untranslated.join(', ')}`);
  }

  if (identicalEnglish.length) {
    qualityWarningCount += identicalEnglish.length;
    console.warn(
      `Locale ${code} quality warning: ${identicalEnglish.length} value(s) are identical to English. `
      + `${identicalEnglish.slice(0, 20).map(([key]) => key).join(', ')}`
      + `${identicalEnglish.length > 20 ? ' ...' : ''}`,
    );
  }
}

if (failed) process.exit(1);
console.log(
  `Locale audit passed for ${files.length} locale files.`
  + (qualityWarningCount ? ` Translation-quality warnings: ${qualityWarningCount}.` : ''),
);
