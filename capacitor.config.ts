import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android: o WebView não pode buscar os sites das fontes por CORS, então o
 * app usa o plugin CapacitorHttp (requisição nativa, sem CORS).
 * Todas as fontes são HTTPS, portanto não há necessidade de cleartext.
 */
const config: CapacitorConfig = {
  appId: "br.com.varreduramogi.app",
  appName: "Varredura Mogi",
  webDir: "dist",
  android: { allowMixedContent: false },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
