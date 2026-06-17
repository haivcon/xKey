import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __XKEY_APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
  },
  plugins: [
    tailwindcss(),
    react()
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
});
