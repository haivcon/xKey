import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.join(__dirname, '../src/locales');

async function syncLocales() {
  const enModule = await import(`file://${path.join(localesDir, 'en.ts').replace(/\\/g, '/')}`);
  const enObj = enModule.default;

  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'en.ts' && f !== 'index.ts');

  for (const file of files) {
    const filePath = path.join(localesDir, file);

    // Read the file as text to preserve structure? Or just stringify it?
    // Stringifying it will lose comments and formatting.
    // Instead of losing formatting, maybe we can just read, parse as JS, merge, and stringify?
    // Actually, `locale-audit.mjs` probably exists. Let's see what it does or just rewrite the file with JSON.stringify formatting.
    // Let's check how the current files are formatted. They seem to be standard JS objects.

    const localeModule = await import(`file://${filePath.replace(/\\/g, '/')}`);
    const localeObj = localeModule.default;

    const finalObj = syncObjects(enObj, localeObj);

    // Write back
    const fileContent = `export default ${JSON.stringify(finalObj, null, 2)};\n`;
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`Synced ${file}`);
  }
}

function syncObjects(base, target) {
  if (Array.isArray(base)) {
    if (!Array.isArray(target) || target.length !== base.length) {
      // If target is not a matching array, fallback entirely to base
      return base.map(item => {
        if (typeof item === 'object' && item !== null) {
          return syncObjects(item, {});
        }
        return item;
      });
    }
    return base.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return syncObjects(item, target[index]);
      }
      return target[index] !== undefined ? target[index] : item;
    });
  }

  const result = {};
  for (const key in base) {
    if (typeof base[key] === 'object' && base[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(base[key]) !== Array.isArray(target[key])) {
        result[key] = Array.isArray(base[key]) ? syncObjects(base[key], []) : syncObjects(base[key], {});
      } else {
        result[key] = syncObjects(base[key], target[key]);
      }
    } else {
      if (target[key] !== undefined) {
        result[key] = target[key];
      } else {
        result[key] = base[key]; // fallback to English
      }
    }
  }
  return result;
}

syncLocales().catch(console.error);