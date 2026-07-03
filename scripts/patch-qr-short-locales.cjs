const fs = require('fs');
const path = require('path');

const translations = {
  ar: 'QR',
  de: 'QR',
  en: 'QR',
  es: 'QR',
  fr: 'QR',
  hi: 'QR',
  id: 'QR',
  ja: 'QR',
  ko: 'QR',
  pt: 'QR',
  ru: 'QR',
  th: 'QR',
  tr: 'QR',
  vi: 'QR',
  zh: 'QR',
};

const fullLabels = {
  en: 'Transfer via QR',
  ko: 'QR로 전송',
};

const localesDir = path.join(process.cwd(), 'src', 'locales');

for (const [lang, qrShort] of Object.entries(translations)) {
  const filePath = path.join(localesDir, `${lang}.ts`);
  let source = fs.readFileSync(filePath, 'utf8');

  if (fullLabels[lang]) {
    source = source.replace(
      /"qrTransferWallet":\s*"[^"]*"/,
      `"qrTransferWallet": "${fullLabels[lang]}"`
    );
  }

  if (!source.includes('"qrShort"')) {
    source = source.replace(
      /("qrTransferWallet":\s*"[^"]*")(\r?\n\s*[},])/,
      `$1,\n    "qrShort": "${qrShort}"$2`
    );
  }

  fs.writeFileSync(filePath, source);
}