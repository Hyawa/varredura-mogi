/**
 * IBAM-SP — banca que organiza os concursos de Mogi Mirim.
 *
 * É a fonte mais confiável para janela de inscrição: cada `li.item` traz
 * "Inscrições de 13/08/2026 a 10/09/2026". A página é ISO-8859-1; o
 * `baixarTexto` cuida da decodificação.
 */

import { parse } from "node-html-parser";
import { baixarTexto, CABECALHOS_PADRAO } from "../fetcher";
import { intervaloInscricao } from "../datas";
import { limpar, normalizar, resumir, urlAbsoluta } from "../texto";
import type { FonteAutomatica, Item } from "../types";
import { dadosDoTitulo, montarItem, situacaoComFallback } from "./comum";

const BASE = "https://www.ibamsp-concursos.org.br";
const URL_BUSCA = `${BASE}/index/todos/?busca=MOGI+MIRIM`;

export const ibam: FonteAutomatica = {
  id: "ibam",
  nome: "IBAM-SP (banca)",
  url: URL_BUSCA,
  papel: "automatico",
  async executar({ fetcher, hoje, timeoutMs }) {
    const { texto } = await baixarTexto(fetcher, URL_BUSCA, {
      headers: CABECALHOS_PADRAO,
      timeoutMs,
    });
    const documento = parse(texto);
    const itens: Item[] = [];

    for (const bloco of documento.querySelectorAll("li.item")) {
      const ancora = bloco.querySelector("h3 a");
      const titulo = limpar(ancora?.text);
      if (!titulo || !normalizar(titulo).includes("mogi mirim")) continue;

      const edital = limpar(bloco.querySelector(".edital")?.text);
      const inscricoes = limpar(bloco.querySelector(".inscricoes-info-mobile-only")?.text);
      const tipo = limpar(bloco.querySelector(".tipo")?.text);
      const vagasTexto = limpar(bloco.querySelector(".qtde b")?.text);
      const { numero, ano, tipo: tipoTitulo } = dadosDoTitulo(titulo);
      const intervalo = intervaloInscricao(inscricoes, ano);

      itens.push(
        montarItem(
          { id: "ibam", nome: "IBAM-SP (banca)" },
          {
            titulo,
            tipo: tipo || tipoTitulo,
            numero,
            ano,
            orgao: "Prefeitura Municipal de Mogi Mirim",
            vagas: vagasTexto ? Number(vagasTexto) || undefined : undefined,
            inscricaoInicio: intervalo.inicio,
            inscricaoFim: intervalo.fim,
            statusTexto: inscricoes || edital,
            situacao: situacaoComFallback(intervalo.inicio, intervalo.fim, hoje),
            link: urlAbsoluta(BASE, ancora?.getAttribute("href")),
            resumo: resumir([edital, inscricoes].filter(Boolean).join(" · "), 240),
          },
        ),
      );
    }

    return itens;
  },
};
