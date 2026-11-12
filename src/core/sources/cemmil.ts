/**
 * CEMMIL — Consórcio Intermunicipal de Saúde (CIS 8 de Abril).
 *
 * A listagem visual é paginada por JavaScript, mas o WordPress expõe a REST
 * API do tipo `processos-seletivos`, filtrável pela taxonomia de município.
 * O status ("Em Andamento" / "Homologado") não vem na API: é lido na página
 * de cada processo, apenas para os anos recentes.
 */

import { baixarTexto, CABECALHOS_PADRAO } from "../fetcher";
import { limpar, normalizar } from "../texto";
import type { Fetcher, FonteAutomatica, Item } from "../types";
import { dadosDoTitulo, montarItem } from "./comum";

const BASE = "https://cemmil.com.br";
const API = `${BASE}/wp-json/wp/v2`;

interface TermoMunicipio {
  id: number;
  name: string;
  slug: string;
}

interface ProcessoApi {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
}

/** Lê "Em Andamento" / "Homologado" da página do processo. */
export function statusCemmil(texto: string): "andamento" | "encerrado" | undefined {
  const textos = [...texto.matchAll(/elementor-icon-list-text[^>]*>([^<]{1,60})</g)].map((achado) =>
    normalizar(achado[1]),
  );
  const status = textos.find((valor) =>
    /em andamento|homologado|encerrado|suspenso|cancelado|convocacao/.test(valor),
  );
  if (!status) return undefined;
  if (/em andamento/.test(status)) return "andamento";
  return "encerrado";
}

async function localizarMunicipio(fetcher: Fetcher, timeoutMs: number): Promise<TermoMunicipio> {
  const { texto } = await baixarTexto(fetcher, `${API}/ps_municipios?slug=mogi-mirim`, {
    headers: { ...CABECALHOS_PADRAO, accept: "application/json" },
    timeoutMs,
  });
  const termos = JSON.parse(texto) as TermoMunicipio[];
  const termo = termos[0];
  if (!termo) throw new Error("município Mogi Mirim não encontrado na taxonomia do CEMMIL");
  return termo;
}

async function listarProcessos(
  fetcher: Fetcher,
  termo: TermoMunicipio,
  timeoutMs: number,
): Promise<ProcessoApi[]> {
  const url = `${API}/processos-seletivos?ps_municipios=${termo.id}&per_page=100`;
  const { texto } = await baixarTexto(fetcher, url, {
    headers: { ...CABECALHOS_PADRAO, accept: "application/json" },
    timeoutMs,
  });
  return JSON.parse(texto) as ProcessoApi[];
}

async function statusDoProcesso(
  fetcher: Fetcher,
  link: string,
  timeoutMs: number,
): Promise<"andamento" | "encerrado" | undefined> {
  const { texto } = await baixarTexto(fetcher, link, { headers: CABECALHOS_PADRAO, timeoutMs });
  return statusCemmil(texto);
}

export const cemmil: FonteAutomatica = {
  id: "cemmil",
  nome: "CEMMIL (consórcio)",
  url: `${BASE}/processo-seletivo/`,
  papel: "automatico",
  async executar({ fetcher, hoje, timeoutMs }) {
    const termo = await localizarMunicipio(fetcher, timeoutMs);
    const processos = await listarProcessos(fetcher, termo, timeoutMs);
    const anoAtual = Number(hoje.slice(0, 4));
    const itens: Item[] = [];

    for (const processo of processos) {
      const titulo = limpar(processo.title.rendered.replace(/<[^>]+>/g, ""));
      const { numero, ano } = dadosDoTitulo(titulo);
      const anoDoProcesso = ano ?? Number(processo.date.slice(0, 4));
      const recente = anoDoProcesso >= anoAtual - 2;

      let situacao: Item["situacao"] = "encerrado";
      let statusTexto = "Processo homologado";

      if (recente) {
        try {
          const status = await statusDoProcesso(fetcher, processo.link, timeoutMs);
          if (status === "andamento") {
            situacao = "andamento";
            statusTexto = "Em Andamento";
          } else if (status === "encerrado") {
            situacao = "encerrado";
            statusTexto = "Homologado";
          } else {
            situacao = "desconhecido";
            statusTexto = "Status não informado";
          }
        } catch {
          situacao = "desconhecido";
          statusTexto = "Não foi possível abrir o processo";
        }
      }

      itens.push(
        montarItem(
          { id: "cemmil", nome: "CEMMIL (consórcio)" },
          {
            titulo: `Processo Seletivo CEMMIL ${titulo}`,
            tipo: "Processo Seletivo",
            numero,
            ano: anoDoProcesso,
            orgao: "Consórcio Intermunicipal CEMMIL",
            publicacao: processo.date.slice(0, 10),
            statusTexto,
            situacao,
            link: processo.link,
          },
        ),
      );
    }

    return itens;
  },
};
