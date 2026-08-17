import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jema.moneyflow',
  appName: 'Money Flow',
  webDir: 'out',
  backgroundColor: '#0A0A0A',
  android: {
    backgroundColor: '#0A0A0A',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
