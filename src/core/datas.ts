/**
 * Datas em português, sem biblioteca externa.
 *
 * Regra de ouro: tudo é convertido para ISO (YYYY-MM-DD) e comparado como
 * texto, evitando armadilhas de fuso horário.
 */

import { normalizar } from "./texto";

const MESES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const MESES_CURTOS: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

function montarIso(ano: number, mes: number, dia: number): string | null {
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/**
 * Converte uma data em texto para ISO.
 * Aceita 13/08/2026, 13/08/26, 2026-08-13, "13 de agosto de 2026" e
 * "13 de agosto" (usando `anoReferencia` quando o ano não aparece).
 */
export function parseData(valor: string, anoReferencia?: number): string | null {
  const texto = normalizar(valor);
  if (!texto) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (iso) return montarIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numerica = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(texto);
  if (numerica) {
    const dia = Number(numerica[1]);
    const mes = Number(numerica[2]);
    let ano = numerica[3] ? Number(numerica[3]) : anoReferencia;
    if (ano === undefined) return null;
    if (ano < 100) ano += ano >= 50 ? 1900 : 2000;
    return montarIso(ano, mes, dia);
  }

  const extensa = /^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/.exec(texto);
  if (extensa) {
    const dia = Number(extensa[1]);
    const mes = MESES[extensa[2]] ?? MESES_CURTOS[extensa[2].slice(0, 3)];
    const ano = extensa[3] ? Number(extensa[3]) : anoReferencia;
    if (!mes || ano === undefined) return null;
    return montarIso(ano, mes, dia);
  }

  return null;
}

export interface DataEncontrada {
  iso: string;
  /** Posição no texto normalizado. */
  indice: number;
  /** Posição final (exclusiva). */
  fim: number;
}

const FORMATO_DATA =
  "(\\d{1,2}(?:\\s*[/.-]\\s*\\d{1,2}(?:\\s*[/.-]\\s*\\d{2,4})?|\\s+de\\s+[a-z]+(?:\\s+de\\s+\\d{4})?))";

/** Lista todas as datas de um texto, na ordem em que aparecem. */
export function encontrarDatas(texto: string, anoReferencia?: number): DataEncontrada[] {
  const normalizado = normalizar(texto);
  const padrao = new RegExp(FORMATO_DATA, "g");
  const encontradas: DataEncontrada[] = [];

  for (const achado of normalizado.matchAll(padrao)) {
    const iso = parseData(achado[1], anoReferencia);
    if (!iso) continue;
    encontradas.push({ iso, indice: achado.index ?? 0, fim: (achado.index ?? 0) + achado[0].length });
  }

  return encontradas;
}

export interface Intervalo {
  inicio?: string;
  fim?: string;
}

const DATA = FORMATO_DATA;

/**
 * Lê o período de inscrições de um texto corrido.
 * Exemplos: "Inscrições de 13/08/2026 a 10/09/2026",
 * "inscrições até 10 de setembro", "inscrições a partir de 1º de setembro".
 */
export function intervaloInscricao(texto: string, anoReferencia?: number): Intervalo {
  const normalizado = normalizar(texto);
  const chave = normalizado.indexOf("inscri");
  if (chave < 0) return {};

  // Trabalha só no trecho relevante para não capturar datas de outras fases.
  let trecho = normalizado.slice(chave, chave + 220);
  const cortes = ["resultado", "homologa", "convoca", "gabarito", "prova"];
  for (const corte of cortes) {
    const posicao = trecho.indexOf(corte);
    if (posicao > 8) trecho = trecho.slice(0, posicao);
  }

  const deAte = new RegExp(`(?:de\\s+)?${DATA}\\s+(?:a|ate)\\s+${DATA}`, "i").exec(trecho);
  if (deAte) {
    const inicio = parseData(deAte[1], anoReferencia);
    const fim = parseData(deAte[2], anoReferencia ?? (inicio ? Number(inicio.slice(0, 4)) : undefined));
    if (fim) return { inicio: inicio ?? undefined, fim };
  }

  const ate = new RegExp(`ate\\s+${DATA}`, "i").exec(trecho);
  if (ate) {
    const fim = parseData(ate[1], anoReferencia);
    if (fim) return { fim };
  }

  const aPartir = new RegExp(`a\\s+partir\\s+de\\s+${DATA}`, "i").exec(trecho);
  if (aPartir) {
    const inicio = parseData(aPartir[1], anoReferencia);
    if (inicio) return { inicio };
  }

  const datas = encontrarDatas(trecho, anoReferencia);
  if (datas.length >= 2) {
    return { inicio: datas[0].iso, fim: datas[1].iso };
  }

  return {};
}

/** Hoje no fuso local, em ISO. */
export function hojeLocalIso(data = new Date()): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** Soma dias a uma data ISO. */
export function adicionarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return `${data.getUTCFullYear()}-${doisDigitos(data.getUTCMonth() + 1)}-${doisDigitos(data.getUTCDate())}`;
}

/** Quantos dias de `inicio` até `fim` (positivo se o fim é depois). */
export function diferencaEmDias(inicio: string, fim: string): number {
  const [a1, m1, d1] = inicio.split("-").map(Number);
  const [a2, m2, d2] = fim.split("-").map(Number);
  const inicioMs = Date.UTC(a1, m1 - 1, d1);
  const fimMs = Date.UTC(a2, m2 - 1, d2);
  return Math.round((fimMs - inicioMs) / 86_400_000);
}

/** Formata ISO como dd/mm/aaaa (para exibição). */
export function formatarData(iso: string | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/** Formata um período de inscrição legível. */
export function formatarIntervalo(inicio?: string, fim?: string): string {
  if (inicio && fim) return `${formatarData(inicio)} a ${formatarData(fim)}`;
  if (fim) return `até ${formatarData(fim)}`;
  if (inicio) return `a partir de ${formatarData(inicio)}`;
  return "sem data divulgada";
}

/**
 * Converte datas de inscrição em situação.
 * Se só houver o fim, considera aberto até o fim inclusive.
 * Se só houver o início, considera aberto a partir dele.
 */
export function situacaoPorInscricao(
  inicio: string | undefined,
  fim: string | undefined,
  hoje: string,
): "aberto" | "encerrado" | "futuro" | "desconhecido" {
  if (fim && hoje > fim) return "encerrado";
  if (inicio && hoje < inicio) return "futuro";
  if (fim || inicio) return "aberto";
  return "desconhecido";
}
