import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sagespark.app',
  appName: 'SageSpark',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
