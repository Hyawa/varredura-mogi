/**
 * CLI: roda a varredura no terminal.
 *
 *   npm run scan
 *   npm run scan -- --json
 *
 * O script `scan` já recompila com esbuild antes de executar.
 */

import { formatarData, formatarIntervalo } from "./core/datas";
import { executarVarredura } from "./core/scan";
import { fontesAutomaticas, fontesManuais } from "./core/sources";
import type { Item, Varredura } from "./core/types";
import { fetchNodeComoFetcher } from "./fetchers/node-fetch";

const CORES = {
  reset: "\u001b[0m",
  fraco: "\u001b[2m",
  negrito: "\u001b[1m",
  verde: "\u001b[32m",
  amarelo: "\u001b[33m",
  vermelho: "\u001b[31m",
  ciano: "\u001b[36m",
} as const;

function colorir(texto: string, cor: keyof typeof CORES): string {
  return `${CORES[cor]}${texto}${CORES.reset}`;
}

function rotuloSituacao(item: Item): string {
  switch (item.situacao) {
    case "aberto":
      return colorir("ABERTO", "verde");
    case "futuro":
      return colorir("EM BREVE", "ciano");
    case "andamento":
      return colorir("ANDAMENTO", "amarelo");
    case "encerrado":
      return colorir("encerrado", "fraco");
    default:
      return colorir("sem data", "fraco");
  }
}

function imprimirItens(titulo: string, itens: Item[]): void {
  if (itens.length === 0) return;
  console.log(`\n${colorir(titulo, "negrito")}`);
  for (const item of itens) {
    const datas = formatarIntervalo(item.inscricaoInicio, item.inscricaoFim);
    const vagas = item.vagas ? ` · ${item.vagas} vaga(s)` : "";
    console.log(`  ${rotuloSituacao(item)}  ${item.titulo}`);
    console.log(
      `           ${item.fonteNome}${item.tambemEm?.length ? ` + ${item.tambemEm.join(", ")}` : ""} · ${datas}${vagas}`,
    );
    if (item.link) console.log(`           ${colorir(item.link, "fraco")}`);
  }
}

function resumoTexto(varredura: Varredura): string {
  const linhas = [
    `Varredura Mogi — ${new Date(varredura.iniciadaEm).toLocaleString("pt-BR")}`,
    `Veredito: ${varredura.veredito}`,
    varredura.motivo,
    "",
  ];
  for (const item of varredura.abertos) {
    linhas.push(`- ${item.titulo} (${formatarIntervalo(item.inscricaoInicio, item.inscricaoFim)})`);
    if (item.link) linhas.push(`  ${item.link}`);
  }
  return linhas.join("\n");
}

function imprimir(varredura: Varredura): void {
  const cor =
    varredura.veredito === "SIM" ? "verde" : varredura.veredito === "NAO" ? "negrito" : "amarelo";

  console.log("");
  console.log(colorir(`  ${varredura.veredito}`, cor));
  console.log(`  ${varredura.motivo}`);
  console.log(
    colorir(
      `  ${varredura.totais.fontesOk}/${varredura.totais.fontes} fontes ok · ` +
        `${varredura.totais.abertos} aberto(s) · ${varredura.totais.andamento} em andamento · ` +
        `${varredura.totais.encerrados} encerrado(s) · ${(varredura.duracaoMs / 1000).toFixed(1)}s`,
      "fraco",
    ),
  );

  imprimirItens("Inscrições abertas", varredura.abertos);
  imprimirItens("Inscrições em breve", varredura.futuros);
  imprimirItens("Em andamento (inscrições não confirmadas)", varredura.andamento);
  imprimirItens("Encerrados recentes", varredura.encerrados.slice(0, 8));

  console.log(`\n${colorir("Fontes", "negrito")}`);
  for (const fonte of varredura.fontes) {
    const marca = fonte.ok ? colorir("ok", "verde") : colorir("falhou", "vermelho");
    const detalhe = fonte.ok
      ? `${fonte.itens.length} item(ns)`
      : (fonte.erro ?? "erro desconhecido");
    console.log(
      `  ${marca.padEnd(16)} ${fonte.fonteNome.padEnd(30)} ${String(fonte.duracaoMs).padStart(6)}ms  ${colorir(detalhe, "fraco")}`,
    );
  }

  if (fontesManuais.length > 0) {
    console.log(`\n${colorir("Conferir manualmente", "negrito")}`);
    for (const fonte of fontesManuais) {
      console.log(`  ${fonte.nome}: ${fonte.url}`);
      console.log(`  ${colorir(fonte.motivo, "fraco")}`);
    }
  }

  console.log(
    `\n${colorir(`Hoje é ${formatarData(varredura.hoje)}. Dados lidos diretamente das fontes oficiais.`, "fraco")}`,
  );
  console.log("");
}

const argumentos = new Set(process.argv.slice(2));

if (argumentos.has("--fontes")) {
  for (const fonte of fontesAutomaticas) console.log(`${fonte.id}\t${fonte.nome}\t${fonte.url}`);
  process.exit(0);
}

const varredura = await executarVarredura({
  fetcher: fetchNodeComoFetcher,
  aoConcluirFonte: (fonte) => {
    if (argumentos.has("--json")) return;
    const estado = fonte.ok ? colorir("ok", "verde") : colorir("falhou", "vermelho");
    console.log(`  ${estado.padEnd(15)} ${fonte.fonteNome} (${fonte.duracaoMs}ms)`);
  },
});

if (argumentos.has("--json")) {
  console.log(JSON.stringify(varredura, null, 2));
} else {
  imprimir(varredura);
  if (argumentos.has("--resumo")) console.log(resumoTexto(varredura));
}
