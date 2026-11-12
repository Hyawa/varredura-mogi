/**
 * Peças comuns aos parsers de fonte.
 */

import { diferencaEmDias, situacaoPorInscricao } from "../datas";
import { classificarTipo, extrairNumeroAno, extrairVagas, hashId } from "../texto";
import type { Item, Situacao } from "../types";

export interface DadosItem {
  titulo: string;
  tipo?: string;
  numero?: string;
  ano?: number;
  orgao?: string;
  vagas?: number;
  inscricaoInicio?: string;
  inscricaoFim?: string;
  publicacao?: string;
  statusTexto?: string;
  situacao: Situacao;
  link?: string;
  resumo?: string;
}

export interface IdentidadeFonte {
  id: string;
  nome: string;
}

/** Cria o item já com id estável (fonte + link + data final). */
export function montarItem(fonte: IdentidadeFonte, dados: DadosItem): Item {
  return {
    id: hashId(`${fonte.id}|${dados.link ?? dados.titulo}|${dados.inscricaoFim ?? ""}`),
    fonteId: fonte.id,
    fonteNome: fonte.nome,
    ...dados,
  };
}

/**
 * Situação a partir das datas de inscrição com um plano B:
 * se a fonte só divulgou a publicação, considera encerrado quando ela é
 * antiga o bastante (inscrições duram semanas, não meses).
 */
export function situacaoComFallback(
  inicio: string | undefined,
  fim: string | undefined,
  hoje: string,
  publicacao?: string,
): Situacao {
  const porDatas = situacaoPorInscricao(inicio, fim, hoje);
  if (porDatas !== "desconhecido") return porDatas;
  if (publicacao && diferencaEmDias(publicacao, hoje) > 120) return "encerrado";
  return "desconhecido";
}

/** Preenche número, ano, tipo e vagas a partir do título. */
export function dadosDoTitulo(titulo: string): {
  numero?: string;
  ano?: number;
  tipo?: string;
  vagas?: number;
} {
  const { numero, ano } = extrairNumeroAno(titulo);
  return {
    numero,
    ano,
    tipo: classificarTipo(titulo),
    vagas: extrairVagas(titulo),
  };
}
