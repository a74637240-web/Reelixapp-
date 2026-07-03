import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reelix.app',
  appName: 'Reelix',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
