/**
 * Escolhe o transporte HTTP conforme a plataforma:
 *  - Electron → ponte IPC exposta pelo preload (sem CORS, com CAs do sistema)
 *  - Android/iOS → CapacitorHttp (nativo)
 *  - navegador (npm run dev) → proxy /__fetch do Vite
 */

import { Capacitor } from "@capacitor/core";
import type { Fetcher } from "../core/types";
import { fetchCapacitor } from "./capacitor-http";
import { fetchProxyDev } from "./dev-proxy";

interface PonteVarredura {
  fetch: Fetcher;
}

declare global {
  interface Window {
    varredura?: PonteVarredura;
  }
}

export function criarFetcher(): Fetcher {
  if (typeof window !== "undefined") {
    if (window.varredura?.fetch) return window.varredura.fetch;
    if (Capacitor.isNativePlatform()) return fetchCapacitor;
  }
  return fetchProxyDev;
}
