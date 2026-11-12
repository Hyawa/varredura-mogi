/**
 * Prefeitura de Mogi Mirim — página de "Contratações".
 *
 * Três categorias são consultadas: Concurso Público (1), Processo Seletivo (2)
 * e Processo Seletivo Simplificado (3). O HTML lista cada processo em um
 * `div[data-key]` com título, datas e um resumo livre que costuma dizer
 * "as inscrições podem ser realizadas até ...".
 *
 * O certificado TLS desse domínio tem a cadeia incompleta; o fetcher do Node
 * resolve isso com `tls.setDefaultCACertificates` (ver src/fetchers/node-fetch.ts).
 */

import { parse, type HTMLElement } from "node-html-parser";
import { baixarTexto, CABECALHOS_PADRAO } from "../fetcher";
import { intervaloInscricao, parseData } from "../datas";
import { limpar, resumir, urlAbsoluta } from "../texto";
import type { FonteAutomatica, Item } from "../types";
import { dadosDoTitulo, montarItem, situacaoComFallback } from "./comum";

const BASE = "https://www.mogimirim.sp.gov.br";
const CATEGORIAS = [1, 2, 3] as const;

function urlCategoria(categoria: number, pagina = 1): string {
  const parametros = new URLSearchParams();
  parametros.set("ContratacaoSearch[id_contratacao_categoria]", String(categoria));
  parametros.set("ContratacaoSearch[ano]", "");
  parametros.set("ContratacaoSearch[q]", "");
  if (pagina > 1) parametros.set("page", String(pagina));
  return `${BASE}/contratacao?${parametros.toString()}`;
}

function extrairCategoria(texto: string): string | undefined {
  const achado = /Categoria:\s*([A-Za-zÀ-ÿ ]+?)\s+(?:Publicação|Data de Publicação|Realização|Local)/i.exec(
    texto,
  );
  return achado ? limpar(achado[1]) : undefined;
}

function extrairPublicacao(texto: string): string | undefined {
  const achado = /Publicação do Edital:\s*(\d{1,2}\s+de\s+[a-zà-ÿ]+\s+de\s+\d{4})/i.exec(texto);
  return achado ? (parseData(achado[1]) ?? undefined) : undefined;
}

function extrairResumo(caixa: HTMLElement): string {
  const textos = caixa.childNodes
    .filter((no) => no.nodeType === 3)
    .map((no) => limpar(no.text))
    .filter((texto) => texto.length > 80 && !/^(Categoria|Publicação|Realização|Local)\b/i.test(texto));
  return resumir(textos.sort((a, b) => b.length - a.length)[0] ?? "", 320);
}

async function coletarCategoria(
  fetcher: Parameters<FonteAutomatica["executar"]>[0]["fetcher"],
  categoria: number,
  hoje: string,
  timeoutMs: number,
): Promise<Item[]> {
  const primeiro = await baixarTexto(fetcher, urlCategoria(categoria), {
    headers: CABECALHOS_PADRAO,
    timeoutMs,
  });

  const paginas = [primeiro.texto];
  const total = /Exibindo\s+\d+-\d+\s+de\s+(\d+)/i.exec(limpar(primeiro.texto))?.[1];
  if (total && Number(total) > 20) {
    const quantidadePaginas = Math.min(5, Math.ceil(Number(total) / 20));
    for (let pagina = 2; pagina <= quantidadePaginas; pagina += 1) {
      try {
        const extra = await baixarTexto(fetcher, urlCategoria(categoria, pagina), {
          headers: CABECALHOS_PADRAO,
          timeoutMs,
        });
        paginas.push(extra.texto);
      } catch {
        // Página extra é opcional: a primeira já trouxe o essencial.
        break;
      }
    }
  }

  const itens: Item[] = [];
  for (const html of paginas) {
    const documento = parse(html);
    const blocos = documento
      .querySelectorAll("[data-key]")
      .filter((elemento) => elemento.querySelector(".texto"));

    for (const bloco of blocos) {
      const ancora = bloco.querySelector("a[href*='/contratacao/view/']");
      const caixa = bloco.querySelector(".texto");
      if (!caixa) continue;

      const titulo = limpar(ancora?.getAttribute("title")) || limpar(caixa.querySelector("h4")?.text);
      if (!titulo) continue;

      const texto = limpar(caixa.text);
      const publicacao = extrairPublicacao(texto);
      const categoriaTexto = extrairCategoria(texto);
      const { numero, ano, tipo, vagas } = dadosDoTitulo(titulo);
      const intervalo = intervaloInscricao(texto, ano ?? (publicacao ? Number(publicacao.slice(0, 4)) : undefined));

      itens.push(
        montarItem(
          { id: "prefeitura", nome: "Prefeitura de Mogi Mirim" },
          {
            titulo,
            tipo: categoriaTexto ?? tipo,
            numero,
            ano,
            orgao: "Prefeitura Municipal de Mogi Mirim",
            vagas,
            inscricaoInicio: intervalo.inicio,
            inscricaoFim: intervalo.fim,
            publicacao,
            situacao: situacaoComFallback(intervalo.inicio, intervalo.fim, hoje, publicacao),
            link: urlAbsoluta(BASE, ancora?.getAttribute("href")),
            resumo: extrairResumo(caixa),
          },
        ),
      );
    }
  }

  return itens;
}

export const prefeitura: FonteAutomatica = {
  id: "prefeitura",
  nome: "Prefeitura de Mogi Mirim",
  url: urlCategoria(1),
  papel: "automatico",
  async executar({ fetcher, hoje, timeoutMs }) {
    const listas = await Promise.all(
      CATEGORIAS.map((categoria) => coletarCategoria(fetcher, categoria, hoje, timeoutMs)),
    );
    const vistos = new Set<string>();
    return listas.flat().filter((item) => {
      if (vistos.has(item.id)) return false;
      vistos.add(item.id);
      return true;
    });
  },
};
