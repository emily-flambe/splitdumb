import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emilycogsdill.splitdumb',
  appName: 'Splitdumb',
  webDir: 'dist',
  server: {
    url: 'https://splitdumb.emilycogsdill.com',
    cleartext: false
  }
};

export default config;
