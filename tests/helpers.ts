import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Fetcher, RespostaBruta } from "../src/core/types";

const FIXTURES = resolve(process.cwd(), "tests", "fixtures");

export function htmlDeArquivo(arquivo: string, charset = "utf-8"): RespostaBruta {
  const corpo = new Uint8Array(readFileSync(resolve(FIXTURES, arquivo)));
  return {
    urlFinal: `https://fixture.local/${arquivo}`,
    status: 200,
    headers: { "content-type": `text/html; charset=${charset}` },
    corpo,
  };
}

export function jsonDe(valor: unknown): RespostaBruta {
  return {
    urlFinal: "https://fixture.local/json",
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    corpo: new TextEncoder().encode(JSON.stringify(valor)),
  };
}

export function textoDe(texto: string, charset = "utf-8"): RespostaBruta {
  return {
    urlFinal: "https://fixture.local/texto",
    status: 200,
    headers: { "content-type": `text/html; charset=${charset}` },
    corpo: new TextEncoder().encode(texto),
  };
}

export interface Rota {
  casa: (url: string) => boolean;
  responder: (url: string) => RespostaBruta;
}

export function criarFetcher(rotas: Rota[]): Fetcher {
  return async (url) => {
    for (const rota of rotas) {
      if (rota.casa(url)) return rota.responder(url);
    }
    throw new Error(`rota não mapeada no teste: ${url}`);
  };
}

export const MOGI_MIRIM_TERMO = [{ id: 20, name: "Mogi Mirim", slug: "mogi-mirim" }];

export const PROCESSOS_CEMMIL = [
  {
    id: 5541,
    date: "2026-03-20T09:59:36",
    link: "https://cemmil.com.br/processos-seletivos/006-2026/",
    title: { rendered: "006.2026" },
  },
  {
    id: 4209,
    date: "2025-05-23T06:45:36",
    link: "https://cemmil.com.br/processos-seletivos/09-2025/",
    title: { rendered: "09.2025" },
  },
  {
    id: 3293,
    date: "2024-09-11T07:02:16",
    link: "https://cemmil.com.br/processos-seletivos/09-2024/",
    title: { rendered: "09.2024" },
  },
];

export function permalinkCemmil(status: string): string {
  return `<html><body><ul><li><span class="elementor-icon-list-text">${status}</span></li></ul></body></html>`;
}

/** Rotas de todas as fontes automáticas, usando apenas fixtures locais. */
export function rotasDeFixtures(hoje = "2026-11-11"): Rota[] {
  void hoje;
  return [
    {
      casa: (url) => url.includes("/contratacao?") && url.includes("categoria%5D=1"),
      responder: () => htmlDeArquivo("prefeitura-c1.html"),
    },
    {
      casa: (url) => url.includes("/contratacao?") && url.includes("categoria%5D=2"),
      responder: () => htmlDeArquivo("prefeitura-c2.html"),
    },
    {
      casa: (url) => url.includes("/contratacao?") && url.includes("categoria%5D=3"),
      responder: () => textoDe("<html><body>Nenhum item</body></html>"),
    },
    {
      casa: (url) => url.includes("ibamsp-concursos.org.br"),
      responder: () => htmlDeArquivo("ibam.html", "iso-8859-1"),
    },
    {
      casa: (url) => url.endsWith("/concurso"),
      responder: () => htmlDeArquivo("saae.html"),
    },
    {
      casa: (url) => url.includes("saaemogimirim.sp.gov.br/concurso/view/"),
      responder: () => htmlDeArquivo("saae-detalhe.html"),
    },
    {
      casa: (url) => url.includes("sigmarh.com.br/concursos/pesquisar.asp"),
      responder: () => htmlDeArquivo("sigmarh-lista.html"),
    },
    {
      casa: (url) => url.includes("sigmarh.com.br/concursos/?id="),
      responder: () => htmlDeArquivo("sigmarh-detalhe.html"),
    },
    {
      casa: (url) => url.includes("ps_municipios?slug=mogi-mirim"),
      responder: () => jsonDe(MOGI_MIRIM_TERMO),
    },
    {
      casa: (url) => url.includes("processos-seletivos?ps_municipios=20"),
      responder: () => jsonDe(PROCESSOS_CEMMIL),
    },
    {
      casa: (url) => url.includes("processos-seletivos/") && url.endsWith("/"),
      responder: () => textoDe(permalinkCemmil("Homologado")),
    },
    {
      casa: (url) => url.includes("pciconcursos.com.br/concursos/sp/mogi-mirim"),
      responder: () => htmlDeArquivo("pci-mogimirim.html"),
    },
  ];
}
