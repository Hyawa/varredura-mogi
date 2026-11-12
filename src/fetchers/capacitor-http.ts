/**
 * Fetcher do Android via CapacitorHttp.
 *
 * O WebView aplica CORS e vários sites das fontes não liberam origem. O
 * CapacitorHttp faz a requisição no lado nativo, sem CORS, e devolve os
 * bytes em base64 (responseType "arraybuffer"), preservando o charset
 * original para a nossa decodificação.
 */

import { CapacitorHttp } from "@capacitor/core";
import { CABECALHOS_PADRAO } from "../core/fetcher";
import type { Fetcher } from "../core/types";

function base64ParaBytes(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

function paraBytes(dados: unknown): Uint8Array {
  if (typeof dados === "string") return base64ParaBytes(dados);
  if (dados instanceof ArrayBuffer) return new Uint8Array(dados);
  if (ArrayBuffer.isView(dados)) {
    return new Uint8Array(dados.buffer, dados.byteOffset, dados.byteLength);
  }
  return new TextEncoder().encode(dados == null ? "" : String(dados));
}

export const fetchCapacitor: Fetcher = async (url, opcoes = {}) => {
  const timeoutMs = opcoes.timeoutMs ?? 25_000;
  const resposta = await CapacitorHttp.request({
    url,
    method: opcoes.metodo ?? "GET",
    headers: { ...CABECALHOS_PADRAO, ...opcoes.headers },
    data: opcoes.corpo,
    responseType: "arraybuffer",
    connectTimeout: timeoutMs,
    readTimeout: timeoutMs,
  });

  const headers: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(resposta.headers ?? {})) {
    headers[chave] = String(valor);
  }

  return {
    urlFinal: resposta.url || url,
    status: resposta.status,
    headers,
    corpo: paraBytes(resposta.data),
  };
};
