/** Formatação para a interface. */

import type { Situacao, Varredura, Veredito } from "../../core/types";

export function hora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function dataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dataCurta(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function duracao(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
}

export function plural(valor: number, singular: string, pluralForma: string): string {
  return `${valor} ${valor === 1 ? singular : pluralForma}`;
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  aberto: "Inscrições abertas",
  futuro: "Inscrições em breve",
  andamento: "Em andamento",
  encerrado: "Encerrado",
  desconhecido: "Sem data",
};

export const ROTULO_VEREDITO: Record<Veredito, string> = {
  SIM: "SIM",
  NAO: "NÃO",
  INDETERMINADO: "INDETERMINADO",
};

/** Frase principal, no tom direto que o usuário pediu. */
export function fraseVeredito(varredura: Varredura): string {
  if (varredura.veredito === "SIM") {
    return "Existem concursos ou processos seletivos com inscrições abertas em Mogi Mirim agora.";
  }
  if (varredura.veredito === "NAO") {
    return "Não existem concursos ou processos seletivos com inscrições abertas em Mogi Mirim agora.";
  }
  return "Não foi possível confirmar todas as fontes. Pode haver algo aberto que não apareceu.";
}

/** Texto para copiar/colar (WhatsApp, bloco de notas). */
export function resumoParaCopiar(varredura: Varredura): string {
  const linhas = [
    `${ROTULO_VEREDITO[varredura.veredito]} — ${fraseVeredito(varredura)}`,
    `Varredura em ${dataHora(varredura.iniciadaEm)} · ${varredura.totais.fontesOk}/${varredura.totais.fontes} fontes responderam`,
    "",
  ];

  if (varredura.abertos.length > 0) {
    linhas.push("Com inscrições abertas:");
    for (const item of varredura.abertos) {
      const periodo =
        item.inscricaoFim && item.inscricaoInicio
          ? `${item.inscricaoInicio} a ${item.inscricaoFim}`
          : item.inscricaoFim
            ? `até ${item.inscricaoFim}`
            : "sem data divulgada";
      linhas.push(`• ${item.titulo} (${periodo})`);
      if (item.link) linhas.push(`  ${item.link}`);
    }
    linhas.push("");
  }

  if (varredura.totais.falhas > 0) {
    linhas.push("Fontes que falharam:");
    for (const fonte of varredura.fontes.filter((f) => !f.ok)) {
      linhas.push(`• ${fonte.fonteNome}: ${fonte.erro ?? "erro"}`);
    }
    linhas.push("");
  }

  linhas.push("Confirme sempre no edital oficial.");
  return linhas.join("\n");
}
