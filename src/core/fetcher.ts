/**
 * Camada HTTP comum: detecta charset, decodifica e padroniza erros.
 * O transporte em si vem de fora (Node, Capacitor ou proxy do Vite).
 */

import type { Fetcher, OpcoesRequisicao, RespostaBruta } from "./types";

export class ErroHttp extends Error {
  readonly status: number;
  readonly url: string;

  constructor(url: string, status: number) {
    super(`HTTP ${status} em ${url}`);
    this.name = "ErroHttp";
    this.status = status;
    this.url = url;
  }
}

function cabecalho(resposta: RespostaBruta, nome: string): string {
  const alvo = nome.toLowerCase();
  for (const [chave, valor] of Object.entries(resposta.headers)) {
    if (chave.toLowerCase() === alvo) return valor;
  }
  return "";
}

function normalizarCharset(charset: string): string {
  const valor = charset.trim().toLowerCase();
  if (valor === "iso-8859-1" || valor === "latin1" || valor === "latin-1") {
    // iso-8859-1 em páginas web quase sempre significa windows-1252 na prática.
    return "windows-1252";
  }
  return valor;
}

/**
 * Descobre o charset pelo header e, se preciso, pela meta tag.
 * Lê os primeiros bytes como latin1 porque é a única forma de enxergar o
 * `<meta charset>` antes de saber o charset.
 */
export function detectarCharset(resposta: RespostaBruta): string {
  const doCabecalho = /charset=["']?([\w-]+)/i.exec(cabecalho(resposta, "content-type"));
  if (doCabecalho) return normalizarCharset(doCabecalho[1]);

  const inicio = new TextDecoder("windows-1252").decode(resposta.corpo.slice(0, 4096));
  const doMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(inicio);
  return normalizarCharset(doMeta?.[1] ?? "utf-8");
}

/** Decodifica o corpo cru respeitando o charset anunciado. */
export function decodificar(resposta: RespostaBruta): string {
  const charset = detectarCharset(resposta);
  try {
    return new TextDecoder(charset).decode(resposta.corpo);
  } catch {
    return new TextDecoder("utf-8").decode(resposta.corpo);
  }
}

export interface RespostaTexto {
  texto: string;
  status: number;
  urlFinal: string;
}

/** Baixa e decodifica uma página, lançando `ErroHttp` fora da faixa 2xx/3xx. */
export async function baixarTexto(
  fetcher: Fetcher,
  url: string,
  opcoes: OpcoesRequisicao = {},
): Promise<RespostaTexto> {
  const resposta = await fetcher(url, opcoes);
  if (resposta.status >= 400) throw new ErroHttp(resposta.urlFinal || url, resposta.status);
  return {
    texto: decodificar(resposta),
    status: resposta.status,
    urlFinal: resposta.urlFinal || url,
  };
}

/** Cabeçalhos padrão de um navegador comum (alguns sites rejeitam UA vazio). */
export const CABECALHOS_PADRAO: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
};
