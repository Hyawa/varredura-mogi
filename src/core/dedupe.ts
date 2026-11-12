/**
 * Deduplicação entre fontes.
 *
 * O mesmo concurso aparece na Prefeitura, no IBAM e no PCI. A chave forte é
 * tipo + número + ano + edital; quando isso não existe, cai para o título
 * normalizado. O item vencedor é o que traz mais dados úteis.
 */

import type { Item } from "./types";
import { normalizar } from "./texto";

/** Extrai "Edital 03" de um título, quando houver. */
export function extrairEdital(titulo: string): string | undefined {
  const achado = /edital\s*n?[°ºo.]*\s*0*(\d{1,3})/i.exec(titulo);
  return achado ? String(Number(achado[1])) : undefined;
}

/** Chave lógica do processo, usada para agrupar duplicatas. */
export function chaveProcesso(item: Item): string {
  const tipo = normalizar(item.tipo ?? item.titulo.split(/\s+[-–—]\s+/)[0] ?? "");
  if (item.numero && item.ano) {
    const edital = extrairEdital(item.titulo) ?? "";
    return `${tipo}|${item.numero}|${item.ano}|${edital}`;
  }
  return `${tipo}|${normalizar(item.titulo)}`;
}

function pontuacao(item: Item): number {
  let pontos = 0;
  if (item.inscricaoFim) pontos += 4;
  if (item.inscricaoInicio) pontos += 2;
  if (item.vagas) pontos += 2;
  if (item.link) pontos += 1;
  if (item.resumo) pontos += 1;
  if (item.situacao === "aberto") pontos += 1;
  return pontos;
}

function mesclar(a: Item, b: Item): Item {
  const [melhor, outro] = pontuacao(a) >= pontuacao(b) ? [a, b] : [b, a];
  const fontes = new Set<string>([
    ...(melhor.tambemEm ?? []),
    melhor.fonteNome,
    outro.fonteNome,
    ...(outro.tambemEm ?? []),
  ]);
  fontes.delete(melhor.fonteNome);
  return {
    ...melhor,
    inscricaoInicio: melhor.inscricaoInicio ?? outro.inscricaoInicio,
    inscricaoFim: melhor.inscricaoFim ?? outro.inscricaoFim,
    publicacao: melhor.publicacao ?? outro.publicacao,
    vagas: melhor.vagas ?? outro.vagas,
    link: melhor.link ?? outro.link,
    numero: melhor.numero ?? outro.numero,
    ano: melhor.ano ?? outro.ano,
    tipo: melhor.tipo ?? outro.tipo,
    orgao: melhor.orgao ?? outro.orgao,
    statusTexto: melhor.statusTexto ?? outro.statusTexto,
    resumo: melhor.resumo ?? outro.resumo,
    tambemEm: [...fontes],
  };
}

/** Remove duplicatas mantendo a versão mais informativa de cada processo. */
export function deduplicar(itens: Item[]): Item[] {
  const mapa = new Map<string, Item>();
  for (const item of itens) {
    const chave = chaveProcesso(item);
    const existente = mapa.get(chave);
    mapa.set(chave, existente ? mesclar(existente, item) : { ...item });
  }
  return [...mapa.values()];
}
