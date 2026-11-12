/**
 * Fetcher do Node (CLI e processo principal do Electron).
 *
 * O site da Prefeitura de Mogi Mirim serve uma cadeia TLS incompleta. Em vez
 * de exigir `--use-system-ca` em todo comando, copiamos as CAs do sistema
 * para o Node na primeira chamada (Node 24+). Se a API não existir, seguimos
 * com o comportamento padrão.
 */

import { getCACertificates, setDefaultCACertificates } from "node:tls";
import { CABECALHOS_PADRAO } from "../core/fetcher";
import type { Fetcher, OpcoesRequisicao, RespostaBruta } from "../core/types";

let certificadosConfigurados = false;

/** Confia nas CAs instaladas no Windows/macOS/Linux, além das embutidas. */
export function confiarEmCertificadosDoSistema(): void {
  if (certificadosConfigurados) return;
  certificadosConfigurados = true;
  try {
    const sistema = getCACertificates("system");
    const embutidos = getCACertificates("bundled") ?? [];
    if (sistema && sistema.length > 0) {
      setDefaultCACertificates([...sistema, ...embutidos]);
    }
  } catch {
    // Node < 24: mantém o comportamento padrão.
  }
}

/** Requisição crua, com timeout, cabeçalhos padrão e redirecionamentos. */
export async function fetchNode(url: string, opcoes: OpcoesRequisicao = {}): Promise<RespostaBruta> {
  confiarEmCertificadosDoSistema();

  const timeoutMs = opcoes.timeoutMs ?? 25_000;
  const resposta = await fetch(url, {
    method: opcoes.metodo ?? "GET",
    headers: { ...CABECALHOS_PADRAO, ...opcoes.headers },
    body: opcoes.corpo,
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const corpo = new Uint8Array(await resposta.arrayBuffer());
  const headers: Record<string, string> = {};
  resposta.headers.forEach((valor, chave) => {
    headers[chave] = valor;
  });

  return {
    urlFinal: resposta.url || url,
    status: resposta.status,
    headers,
    corpo,
  };
}

export const fetchNodeComoFetcher: Fetcher = (url, opcoes) => fetchNode(url, opcoes);

/** Usado pelo proxy de desenvolvimento do Vite. */
export async function fetchRawNode(
  url: string,
  timeoutMs = 20_000,
): Promise<{ status: number; headers: Record<string, string>; body: Uint8Array }> {
  const resposta = await fetchNode(url, { timeoutMs });
  return { status: resposta.status, headers: resposta.headers, body: resposta.corpo };
}
