import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.omnirush.voidrunner',
  appName: 'VoidRunner',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: { allowMixedContent: false },
  plugins: {
    // Native immersive mode owns the system bars. Keeping the WebView below a
    // transient bar prevents it from jumping over essential HUD controls.
    StatusBar: { overlaysWebView: false, style: 'DARK' },
    Keyboard: { resize: 'none' }
  }
};

export default config;
