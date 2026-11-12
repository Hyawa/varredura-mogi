/**
 * Fetcher do navegador em desenvolvimento.
 *
 * Chama `/__fetch?url=...`, servido pelo middleware do Vite (vite.config.ts),
 * que busca a página no Node e devolve os bytes em base64. É o que permite
 * rodar `npm run dev` sem Electron e sem Android.
 */

import type { Fetcher } from "../core/types";

interface RespostaProxy {
  status?: number;
  headers?: Record<string, string>;
  corpoBase64?: string;
  erro?: string;
}

export const fetchProxyDev: Fetcher = async (url, opcoes = {}) => {
  const alvo = `/__fetch?url=${encodeURIComponent(url)}`;
  const resposta = await fetch(alvo, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ headers: opcoes.headers, metodo: opcoes.metodo, corpo: opcoes.corpo }),
    signal: AbortSignal.timeout(opcoes.timeoutMs ?? 25_000),
  });

  const corpo = (await resposta.json()) as RespostaProxy;
  if (!resposta.ok || corpo.erro) {
    throw new Error(corpo.erro ?? `proxy respondeu HTTP ${resposta.status}`);
  }

  const base64 = corpo.corpoBase64 ?? "";
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }

  return {
    urlFinal: url,
    status: corpo.status ?? 200,
    headers: corpo.headers ?? {},
    corpo: bytes,
  };
};
