import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { constants, createHash, createSign } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const collectFiles = async (dir, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath, relative));
    } else {
      files.push(relative);
    }
  }
  return files;
};

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const parsePemEnv = (value) => {
  let pem = (value || '').trim();
  if ((pem.startsWith('"') && pem.endsWith('"')) || (pem.startsWith("'") && pem.endsWith("'"))) {
    try {
      pem = JSON.parse(pem);
    } catch {
      pem = pem.slice(1, -1);
    }
  }
  return pem.replace(/\\n/g, '\n').trim();
};

const shouldIncludeIntegrityAsset = (file) => {
  if (file === 'index.html') return true;
  if (!file.startsWith('assets/') || file.endsWith('.map')) return false;
  return /\.(?:js|css)$/i.test(file) && (
    file.includes('/index-')
    || file.includes('/App-')
    || file.includes('/storage-')
    || file.includes('/wallet-')
    || file.includes('/crypto.worker-')
  );
};

const integrityManifestPlugin = ({ privateKeyPem, publicKeyPem }) => ({
  name: 'xkey-integrity-manifest',
  apply: 'build',
  closeBundle: async () => {
    if (!privateKeyPem || !publicKeyPem) {
      throw new Error('Missing XKEY_INTEGRITY_PUBLIC_KEY_PEM or XKEY_INTEGRITY_PRIVATE_KEY_PEM for signed integrity manifest.');
    }

    const outDir = path.resolve('dist');
    const files = (await collectFiles(outDir))
      .filter(shouldIncludeIntegrityAsset)
      .sort();
    const assets = [];
    for (const file of files) {
      const bytes = await readFile(path.join(outDir, file));
      assets.push({
        path: file.replaceAll(path.sep, '/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
    const manifest = {
      app: 'xKey',
      version: pkg.version || '0.0.0',
      generatedAt: new Date().toISOString(),
      algorithm: 'sha256',
      source: 'github.com/haivcon/xKey',
      assets,
    };
    const payload = stableStringify(manifest);
    const signature = createSign('sha256')
      .update(payload)
      .end()
      .sign({
        key: privateKeyPem,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      }, 'base64');
    manifest.signature = {
      algorithm: 'RSA-PSS-SHA256',
      key: createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16),
      value: signature,
    };
    await writeFile(path.join(outDir, 'xkey-integrity-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const publicKeyPem = parsePemEnv(env.XKEY_INTEGRITY_PUBLIC_KEY_PEM);
  const privateKeyPem = parsePemEnv(env.XKEY_INTEGRITY_PRIVATE_KEY_PEM);

  return {
    base: './',
    define: {
      __XKEY_APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
      __XKEY_INTEGRITY_PUBLIC_KEY__: JSON.stringify(publicKeyPem),
    },
    plugins: [
      tailwindcss(),
      react(),
      integrityManifestPlugin({ privateKeyPem, publicKeyPem })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'react';
            if (id.includes('/@capacitor/') || id.includes('/@capawesome/') || id.includes('/@capgo/')) return 'capacitor';
            if (id.includes('/ethers/') || id.includes('/crypto-js/')) return 'wallet';
            if (id.includes('/html5-qrcode/') || id.includes('/qrcode.react/')) return 'scan';
            if (id.includes('/lucide-react/')) return 'ui';
            if (id.includes('/papaparse/')) return 'data';
            return 'vendor';
          },
        },
      },
    },
  };
});
