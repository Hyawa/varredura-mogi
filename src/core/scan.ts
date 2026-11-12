/**
 * Orquestra a varredura: roda todas as fontes automáticas em paralelo,
 * aplica timeout individual, filtra o que é relevante, deduplica e decide.
 *
 * Uma fonte que falha nunca derruba a varredura inteira: ela entra em
 * `fontes` com `ok: false` e o veredito vira INDETERMINADO em vez de NÃO.
 */

import { deduplicar } from "./dedupe";
import { diferencaEmDias, hojeLocalIso } from "./datas";
import { fontesAutomaticas, fontesManuais } from "./sources";
import type {
  ContextoFonte,
  Fetcher,
  FonteAutomatica,
  Item,
  ResultadoFonte,
  Situacao,
  Totais,
  Varredura,
} from "./types";
import { decidirVeredito } from "./veredito";

export interface OpcoesVarredura {
  fetcher: Fetcher;
  /** Sobrescreve a data de referência (útil em testes). */
  hoje?: string;
  /** Tempo máximo por fonte. */
  timeoutMs?: number;
  fontes?: readonly FonteAutomatica[];
  /** Notifica a UI assim que cada fonte termina. */
  aoConcluirFonte?: (resultado: ResultadoFonte) => void;
}

const TIMEOUT_PADRAO_MS = 25_000;

class TempoEsgotado extends Error {
  constructor(ms: number) {
    super(`tempo esgotado (${ms} ms)`);
    this.name = "TempoEsgotado";
  }
}

function comPrazo<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    const timer = setTimeout(() => rejeitar(new TempoEsgotado(ms)), ms);
    promessa.then(
      (valor) => {
        clearTimeout(timer);
        resolver(valor);
      },
      (erro) => {
        clearTimeout(timer);
        rejeitar(erro);
      },
    );
  });
}

function descreverErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  return String(erro);
}

const ORDEM_SITUACAO: Record<Situacao, number> = {
  aberto: 0,
  futuro: 1,
  andamento: 2,
  desconhecido: 3,
  encerrado: 4,
};

/** Mantém o que ainda importa para o usuário; descarta histórico antigo. */
function relevante(item: Item, hoje: string): boolean {
  if (item.situacao === "aberto" || item.situacao === "futuro" || item.situacao === "andamento") {
    return true;
  }
  if (item.inscricaoFim) return diferencaEmDias(item.inscricaoFim, hoje) <= 150;
  if (item.publicacao) return diferencaEmDias(item.publicacao, hoje) <= 400;
  // Sem data nenhuma: só interessa se veio marcado como recente pela fonte.
  return item.situacao === "desconhecido" && Boolean(item.statusTexto);
}

function ordenar(itens: Item[]): Item[] {
  return [...itens].sort((a, b) => {
    const porSituacao = ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao];
    if (porSituacao !== 0) return porSituacao;
    const dataA = a.inscricaoFim ?? a.publicacao ?? "9999-12-31";
    const dataB = b.inscricaoFim ?? b.publicacao ?? "9999-12-31";
    if (a.situacao === "encerrado") return dataB.localeCompare(dataA);
    return dataA.localeCompare(dataB);
  });
}

async function executarFonte(fonte: FonteAutomatica, contexto: ContextoFonte): Promise<ResultadoFonte> {
  const inicio = Date.now();
  try {
    const itens = await comPrazo(fonte.executar(contexto), contexto.timeoutMs);
    return {
      fonteId: fonte.id,
      fonteNome: fonte.nome,
      papel: fonte.papel,
      url: fonte.url,
      ok: true,
      duracaoMs: Date.now() - inicio,
      itens,
    };
  } catch (erro) {
    return {
      fonteId: fonte.id,
      fonteNome: fonte.nome,
      papel: fonte.papel,
      url: fonte.url,
      ok: false,
      erro: descreverErro(erro),
      duracaoMs: Date.now() - inicio,
      itens: [],
    };
  }
}

function calcularTotais(fontes: ResultadoFonte[], itens: Item[]): Totais {
  const contar = (situacao: Situacao) => itens.filter((item) => item.situacao === situacao).length;
  return {
    fontes: fontes.length,
    fontesOk: fontes.filter((fonte) => fonte.ok).length,
    falhas: fontes.filter((fonte) => !fonte.ok).length,
    abertos: contar("aberto"),
    encerrados: contar("encerrado"),
    andamento: contar("andamento"),
    futuros: contar("futuro"),
    desconhecidos: contar("desconhecido"),
  };
}

/** Executa uma varredura completa. Nunca lança por falha de fonte. */
export async function executarVarredura(opcoes: OpcoesVarredura): Promise<Varredura> {
  const fetcher: Fetcher = opcoes.fetcher;
  const hoje = opcoes.hoje ?? hojeLocalIso();
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const fontes = opcoes.fontes ?? fontesAutomaticas;
  const iniciadaEm = new Date().toISOString();
  const inicio = Date.now();

  const contexto: ContextoFonte = { fetcher, hoje, timeoutMs };
  const resultados = await Promise.all(
    fontes.map(async (fonte) => {
      const resultado = await executarFonte(fonte, contexto);
      opcoes.aoConcluirFonte?.(resultado);
      return resultado;
    }),
  );

  const itens = resultados.flatMap((resultado) => resultado.itens);
  const mantidos = deduplicar(itens.filter((item) => relevante(item, hoje)));
  const abertos = ordenar(mantidos.filter((item) => item.situacao === "aberto"));
  const futuros = ordenar(mantidos.filter((item) => item.situacao === "futuro"));
  const andamento = ordenar(mantidos.filter((item) => item.situacao === "andamento"));
  const encerrados = ordenar(mantidos.filter((item) => item.situacao === "encerrado"));
  const desconhecidos = ordenar(mantidos.filter((item) => item.situacao === "desconhecido"));

  const totais = calcularTotais(resultados, mantidos);
  const { veredito, motivo } = decidirVeredito({
    abertos,
    falhas: totais.falhas,
    fontesConsultadas: totais.fontes,
  });

  return {
    versao: 1,
    iniciadaEm,
    finalizadaEm: new Date().toISOString(),
    duracaoMs: Date.now() - inicio,
    hoje,
    veredito,
    motivo,
    abertos,
    encerrados,
    andamento,
    futuros,
    desconhecidos,
    fontes: resultados,
    totais,
  };
}

/** Atalho para a UI: lista de fontes manuais exibidas como link. */
export { fontesManuais };
