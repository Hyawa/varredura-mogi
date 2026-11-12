/**
 * SAAE Mogi Mirim — página de concursos.
 *
 * A listagem informa categoria, publicação e data de abertura, mas não o fim
 * das inscrições. Para processos recentes, o parser abre a página de detalhe
 * (no máximo 4) e procura o estado das inscrições ou documentos que só são
 * publicados depois do encerramento.
 */

import { parse } from "node-html-parser";
import { baixarTexto, CABECALHOS_PADRAO } from "../fetcher";
import { intervaloInscricao, parseData } from "../datas";
import { classificarTipo, limpar, resumir, urlAbsoluta } from "../texto";
import type { Fetcher, FonteAutomatica, Item } from "../types";
import { dadosDoTitulo, montarItem, situacaoComFallback } from "./comum";

const BASE = "https://www.saaemogimirim.sp.gov.br";
const URL_LISTA = `${BASE}/concurso`;
const MAXIMO_DETALHES = 4;

function dataPorRotulo(texto: string, rotulo: string): string | undefined {
  const padrao = new RegExp(`${rotulo}:\\s*(\\d{1,2}\\s+de\\s+[a-zà-ÿ]+\\s+de\\s+\\d{4})`, "i");
  const achado = padrao.exec(texto);
  return achado ? (parseData(achado[1]) ?? undefined) : undefined;
}

async function detalhar(
  fetcher: Fetcher,
  item: Item,
  hoje: string,
  timeoutMs: number,
): Promise<Item> {
  if (!item.link) return item;

  const { texto } = await baixarTexto(fetcher, item.link, {
    headers: CABECALHOS_PADRAO,
    timeoutMs,
  });
  const pagina = limpar(texto);

  if (/Inscri[cç][õo]es\s+Abertas/i.test(pagina)) {
    return { ...item, situacao: "aberto", statusTexto: "Inscrições Abertas" };
  }
  if (/Inscri[cç][õo]es\s+Encerradas/i.test(pagina)) {
    return { ...item, situacao: "encerrado", statusTexto: "Inscrições Encerradas" };
  }

  // Documentos de fases posteriores (gabarito, convocação para prova,
  // resultado final, homologação) provam que as inscrições já fecharam.
  if (
    /gabarito|homologa[cç][aã]o|convoca[cç][aã]o|resultado\s+final|resultado\s+p[oó]s-recurso/i.test(
      pagina,
    )
  ) {
    return { ...item, situacao: "encerrado", statusTexto: "Fase de provas/resultados" };
  }

  const intervalo = intervaloInscricao(pagina, item.ano);
  if (intervalo.inicio || intervalo.fim) {
    return {
      ...item,
      inscricaoInicio: intervalo.inicio,
      inscricaoFim: intervalo.fim,
      situacao: situacaoComFallback(intervalo.inicio, intervalo.fim, hoje, item.publicacao),
    };
  }

  return item;
}

export const saae: FonteAutomatica = {
  id: "saae",
  nome: "SAAE Mogi Mirim",
  url: URL_LISTA,
  papel: "automatico",
  async executar({ fetcher, hoje, timeoutMs }) {
    const { texto } = await baixarTexto(fetcher, URL_LISTA, {
      headers: CABECALHOS_PADRAO,
      timeoutMs,
    });
    const documento = parse(texto);
    const itens: Item[] = [];

    for (const bloco of documento.querySelectorAll("#lista-edital div[data-key]")) {
      const titulo = limpar(bloco.querySelector("h5 strong")?.text) || limpar(bloco.querySelector("h5")?.text);
      if (!titulo) continue;

      const pagina = limpar(bloco.text);
      const categoria = /Categoria:\s*([A-Za-zÀ-ÿ ]+?)\s+(?:Publicação|Data de abertura|$)/i.exec(pagina)?.[1];
      const publicacao = dataPorRotulo(pagina, "Publicação");
      const abertura = dataPorRotulo(pagina, "Data de abertura");
      const { numero, ano, tipo, vagas } = dadosDoTitulo(titulo);
      const resumo = limpar(bloco.querySelectorAll("p")[1]?.text ?? "");

      itens.push(
        montarItem(
          { id: "saae", nome: "SAAE Mogi Mirim" },
          {
            titulo,
            tipo: classificarTipo(titulo) ?? (categoria ? limpar(categoria) : tipo),
            numero,
            ano,
            orgao: "SAAE de Mogi Mirim",
            vagas,
            publicacao: publicacao ?? abertura,
            situacao: situacaoComFallback(undefined, undefined, hoje, publicacao ?? abertura),
            link: urlAbsoluta(BASE, bloco.querySelector("a[title='Saiba mais']")?.getAttribute("href")),
            resumo: resumir(resumo, 280),
          },
        ),
      );
    }

    // Só vale gastar requisição com quem ainda pode estar aberto.
    const candidatos = itens.filter((item) => item.situacao === "desconhecido").slice(0, MAXIMO_DETALHES);
    const detalhados = new Map<string, Item>();
    for (const candidato of candidatos) {
      try {
        detalhados.set(candidato.id, await detalhar(fetcher, candidato, hoje, timeoutMs));
      } catch {
        // Detalhe é opcional; mantém o item como desconhecido.
      }
    }

    return itens.map((item) => detalhados.get(item.id) ?? item);
  },
};
