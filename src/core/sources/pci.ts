/**
 * PCI Concursos — agregador nacional.
 *
 * A página da cidade lista cada oportunidade em `div.ea`, com data final de
 * inscrição em `.ce span`. É a fonte mais direta para "dá para se inscrever
 * hoje?", embora os itens apontem para notícias/resumos do PCI.
 */

import { parse } from "node-html-parser";
import { baixarTexto, CABECALHOS_PADRAO } from "../fetcher";
import { parseData } from "../datas";
import { classificarTipo, extrairVagas, limpar, resumir } from "../texto";
import type { FonteAutomatica, Item } from "../types";
import { dadosDoTitulo, montarItem, situacaoComFallback } from "./comum";

const URL_CIDADE = "https://www.pciconcursos.com.br/concursos/sp/mogi-mirim";

function dataFinal(texto: string): string | undefined {
  const achado = /(\d{2}\/\d{2}\/\d{4})/.exec(texto);
  return achado ? (parseData(achado[1]) ?? undefined) : undefined;
}

export const pci: FonteAutomatica = {
  id: "pci",
  nome: "PCI Concursos",
  url: URL_CIDADE,
  papel: "automatico",
  async executar({ fetcher, hoje, timeoutMs }) {
    const { texto } = await baixarTexto(fetcher, URL_CIDADE, {
      headers: CABECALHOS_PADRAO,
      timeoutMs,
    });
    const documento = parse(texto);
    const itens: Item[] = [];

    for (const bloco of documento.querySelectorAll("#concursos div.ea")) {
      const linkTag = bloco.querySelector("a[title]");
      const titulo = limpar(linkTag?.getAttribute("title"));
      if (!titulo) continue;

      const detalhes = limpar(bloco.querySelector(".cd")?.text);
      const fim = dataFinal(limpar(bloco.querySelector(".ce")?.text));
      const orgao = limpar(bloco.querySelector(".ca a")?.text);
      const { numero, ano, tipo } = dadosDoTitulo(titulo);
      const link = bloco.getAttribute("data-url") ?? linkTag?.getAttribute("href") ?? undefined;

      itens.push(
        montarItem(
          { id: "pci", nome: "PCI Concursos" },
          {
            titulo,
            tipo: classificarTipo(titulo) ?? tipo,
            numero,
            ano,
            orgao: orgao || undefined,
            vagas: extrairVagas(detalhes),
            inscricaoFim: fim,
            situacao: situacaoComFallback(undefined, fim, hoje),
            link,
            resumo: resumir(detalhes, 200),
          },
        ),
      );
    }

    return itens;
  },
};
