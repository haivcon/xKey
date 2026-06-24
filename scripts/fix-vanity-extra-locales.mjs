import fs from 'node:fs';
import path from 'node:path';

const localeDir = path.join('src', 'locales');

const labels = {
  en: ['Mirror {pattern}', 'Bracket {pattern}', 'Palindrome {pattern}', 'Lucky {pattern}', 'Alternating {pattern}'],
  vi: ['Gương {pattern}', 'Kẹp hai đầu {pattern}', 'Đối xứng {pattern}', 'May mắn {pattern}', 'Luân phiên {pattern}'],
  zh: ['镜像 {pattern}', '首尾成组 {pattern}', '回文 {pattern}', '幸运 {pattern}', '交替 {pattern}'],
};

const fallback = labels.en;

for (const fileName of fs.readdirSync(localeDir).filter((file) => file.endsWith('.ts') && file !== 'index.ts')) {
  const filePath = path.join(localeDir, fileName);
  const lang = fileName.replace(/\.ts$/, '');
  const values = labels[lang] ?? fallback;
  let source = fs.readFileSync(filePath, 'utf8');

  if (source.includes('"vanityExtraMirror"')) {
    continue;
  }

  const insert = [
    `    "vanityExtraMirror": "${values[0]}",`,
    `    "vanityExtraBracket": "${values[1]}",`,
    `    "vanityExtraPalindrome": "${values[2]}",`,
    `    "vanityExtraLucky": "${values[3]}",`,
    `    "vanityExtraAlternating": "${values[4]}",`,
  ].join('\n');

  const anchor = /(    "vanityExtraSequenceDown": [^\n]+,\r?\n)/;
  if (!anchor.test(source)) {
    throw new Error(`Missing vanityExtraSequenceDown anchor in ${filePath}`);
  }

  source = source.replace(anchor, `$1${insert}\n`);
  fs.writeFileSync(filePath, source);
}