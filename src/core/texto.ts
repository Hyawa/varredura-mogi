/**
 * Utilitários de texto: normalização, limpeza e extração de número/ano/vagas.
 * Tudo em português e sem dependências.
 */

/** Remove acentos, baixa a caixa e colapsa espaços. */
export function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Limpa espaços, quebras de linha e caracteres invisíveis. */
export function limpar(valor: string | undefined | null): string {
  return (valor ?? "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Corta um texto em `limite` caracteres, sem quebrar palavras no meio. */
export function resumir(valor: string, limite = 240): string {
  const texto = limpar(valor);
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${corte.slice(0, ultimoEspaco > limite * 0.6 ? ultimoEspaco : limite)}…`;
}

/** Hash FNV-1a de 32 bits, estável entre execuções e plataformas. */
export function hashId(valor: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < valor.length; i += 1) {
    hash ^= valor.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export interface NumeroAno {
  numero?: string;
  ano?: number;
}

/**
 * Extrai número e ano de títulos como:
 * "CONCURSO PÚBLICO Nº 02/2026 - Edital 03", "PROCESSO SELETIVO - 01/2026",
 * "CONSÓRCIO ... Nº 016/2026" e "PROCESSO SELETIVO 009.2026".
 */
export function extrairNumeroAno(titulo: string): NumeroAno {
  const padroes = [
    /n[°ºo.]*\s*0*(\d{1,4})\s*[/.]\s*(\d{4})/i,
    /[-–—]\s*0*(\d{1,4})\s*[/.]\s*(\d{4})/i,
    /\b0*(\d{1,4})\s*[/.]\s*(\d{4})\b/,
  ];
  for (const padrao of padroes) {
    const encontrado = padrao.exec(titulo);
    if (encontrado) {
      const numero = String(Number(encontrado[1]));
      const ano = Number(encontrado[2]);
      if (ano >= 1990 && ano <= 2100) return { numero, ano };
    }
  }
  return {};
}

/** Extrai a quantidade de vagas de textos como "12 vagas", "56 vagas + CR". */
export function extrairVagas(texto: string): number | undefined {
  const encontrado = /(\d{1,4})\s*(?:vagas?|postos?)\b/i.exec(texto);
  if (!encontrado) return undefined;
  const vagas = Number(encontrado[1]);
  return Number.isFinite(vagas) && vagas > 0 ? vagas : undefined;
}

/** Classifica o tipo do processo a partir do título/categoria. */
export function classificarTipo(valor: string): string | undefined {
  const texto = normalizar(valor);
  if (/processo seletivo simplificado/.test(texto)) return "Processo Seletivo Simplificado";
  if (/processo seletivo/.test(texto)) return "Processo Seletivo";
  if (/concurso publico/.test(texto)) return "Concurso Público";
  if (/selecao publica/.test(texto)) return "Seleção Pública";
  return undefined;
}

/** Junta URL base + caminho relativo sem depender do construtor URL no proxy. */
export function urlAbsoluta(base: string, caminho: string | undefined): string | undefined {
  if (!caminho) return undefined;
  if (/^https?:\/\//i.test(caminho)) return caminho;
  try {
    return new URL(caminho, base).toString();
  } catch {
    return undefined;
  }
}
