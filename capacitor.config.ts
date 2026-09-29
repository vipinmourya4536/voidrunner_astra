import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.omnirush.voidrunner',
  appName: 'VoidRunner',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: { allowMixedContent: false },
  plugins: {
    StatusBar: { overlaysWebView: true, style: 'DARK' },
    Keyboard: { resize: 'none' }
  }
};

export default config;
