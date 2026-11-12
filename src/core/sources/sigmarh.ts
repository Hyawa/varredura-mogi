/**
 * SigmaRH — plataforma usada pelo Consórcio Intermunicipal CEMMIL e pelo SAAE.
 *
 * A busca devolve vários municípios; filtramos por "MOGI MIRIM" no título.
 * O estado das inscrições só aparece na página de detalhe, como um botão
 * "Inscrições Abertas" ou "Inscrições Encerradas". Para processos antigos
 * (ano anterior ao anterior) nem vale a requisição: já estão encerrados.
 */

import { parse } from "node-html-parser";
import { baixarTexto, CABECALHOS_PADRAO } from "../fetcher";
import { limpar, normalizar, urlAbsoluta } from "../texto";
import type { FonteAutomatica, Item } from "../types";
import { dadosDoTitulo, montarItem } from "./comum";

const BASE = "https://web.sigmarh.com.br";
const URL_BUSCA = `${BASE}/concursos/pesquisar.asp?s=Mogi+Mirim`;

/** Status a partir do botão do detalhe. */
export function statusSigmaRh(texto: string): "aberto" | "encerrado" | undefined {
  const achado = /Inscri[cç][õo]es\s+(Abertas|Encerradas)/i.exec(normalizar(texto));
  if (!achado) return undefined;
  return achado[1] === "abertas" ? "aberto" : "encerrado";
}

export const sigmarh: FonteAutomatica = {
  id: "sigmarh",
  nome: "SigmaRH / CEMMIL",
  url: URL_BUSCA,
  papel: "automatico",
  async executar({ fetcher, hoje, timeoutMs }) {
    const { texto } = await baixarTexto(fetcher, URL_BUSCA, {
      headers: CABECALHOS_PADRAO,
      timeoutMs,
    });
    const documento = parse(texto);
    const anoAtual = Number(hoje.slice(0, 4));
    const itens: Item[] = [];

    for (const bloco of documento.querySelectorAll(".wpb_content_element")) {
      const titulo = limpar(bloco.querySelector("h1")?.text);
      const ancora = bloco.querySelector("a[href*='concursos/?id=']");
      if (!titulo || !ancora || !normalizar(titulo).includes("mogi mirim")) continue;

      const link = urlAbsoluta(URL_BUSCA, ancora.getAttribute("href"));
      if (!link) continue;

      const { numero, ano } = dadosDoTitulo(titulo);
      const recente = ano !== undefined && ano >= anoAtual - 1;
      const tipo = normalizar(titulo).includes("saae") ? "Concurso Público" : "Processo Seletivo";

      let situacao: Item["situacao"] = "encerrado";
      let statusTexto = "Processo de ano anterior";

      if (recente) {
        try {
          const detalhe = await baixarTexto(fetcher, link, {
            headers: CABECALHOS_PADRAO,
            timeoutMs,
          });
          const status = statusSigmaRh(detalhe.texto);
          if (status === "aberto") {
            situacao = "aberto";
            statusTexto = "Inscrições Abertas";
          } else if (status === "encerrado") {
            situacao = "encerrado";
            statusTexto = "Inscrições Encerradas";
          } else {
            situacao = "andamento";
            statusTexto = "Em andamento";
          }
        } catch {
          situacao = "desconhecido";
          statusTexto = "Não foi possível abrir o detalhe";
        }
      }

      itens.push(
        montarItem(
          { id: "sigmarh", nome: "SigmaRH / CEMMIL" },
          {
            titulo,
            tipo,
            numero,
            ano,
            orgao: normalizar(titulo).includes("saae")
              ? "SAAE de Mogi Mirim"
              : "Consórcio Intermunicipal CEMMIL",
            publicacao: undefined,
            statusTexto,
            situacao,
            link,
          },
        ),
      );
    }

    return itens;
  },
};
