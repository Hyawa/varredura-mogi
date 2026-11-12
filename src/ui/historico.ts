/**
 * Histórico local (localStorage): permite mostrar "novos desde a última
 * varredura" e um pequeno gráfico. Nada sai do aparelho.
 */

import type { Item, Veredito, Varredura } from "../core/types";

export interface RegistroHistorico {
  em: string;
  veredito: Veredito;
  abertos: number;
  falhas: number;
  fontes: number;
  duracaoMs: number;
  ids: string[];
}

const CHAVE = "varredura-mogi:historico:v1";
const LIMITE = 40;

function ehRegistro(valor: unknown): valor is RegistroHistorico {
  if (!valor || typeof valor !== "object") return false;
  const registro = valor as Partial<RegistroHistorico>;
  return (
    typeof registro.em === "string" &&
    typeof registro.veredito === "string" &&
    typeof registro.abertos === "number" &&
    Array.isArray(registro.ids)
  );
}

export function carregarHistorico(): RegistroHistorico[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto) as unknown;
    if (!Array.isArray(dados)) return [];
    return dados.filter(ehRegistro).slice(0, LIMITE);
  } catch {
    return [];
  }
}

export interface ResultadoRegistro {
  registros: RegistroHistorico[];
  novos: Item[];
}

export function registrarVarredura(varredura: Varredura): ResultadoRegistro {
  const registros = carregarHistorico();
  const anterior = registros[0];
  const atuais = [...varredura.abertos, ...varredura.futuros];
  const novos = anterior
    ? atuais.filter((item) => !anterior.ids.includes(item.id))
    : [];

  const registro: RegistroHistorico = {
    em: varredura.iniciadaEm,
    veredito: varredura.veredito,
    abertos: varredura.totais.abertos,
    falhas: varredura.totais.falhas,
    fontes: varredura.totais.fontes,
    duracaoMs: varredura.duracaoMs,
    ids: atuais.map((item) => item.id),
  };

  const atualizados = [registro, ...registros].slice(0, LIMITE);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atualizados));
  } catch {
    // Modo privado / cota cheia: o histórico é conveniência, não requisito.
  }

  return { registros: atualizados, novos };
}

export function apagarHistorico(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
}
