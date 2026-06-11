import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.haivcon.xkey',
  appName: 'xKey',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'none',
    },
  },
};

export default config;
