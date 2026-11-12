/**
 * Smoke test end-to-end do app Electron.
 *
 * Prova, de ponta a ponta, que:
 *   1. o preload expõe `window.varredura.fetch` no renderer (ponte IPC);
 *   2. a ponte busca de verdade uma página real no processo Node (TLS da
 *      Prefeitura de Mogi Mirim, com as CAs do sistema);
 *   3. a varredura completa das 6 fontes roda dentro do renderer e publica o
 *      veredito (SIM / NÃO / INDETERMINADO) no painel.
 *
 * Uso: `npm run smoke:electron`
 *
 * Atenção (Electron 45): um `await app.whenReady()` no nível do módulo trava a
 * inicialização — o evento `ready` só dispara depois que o módulo de entrada
 * termina de avaliar. Por isso todo o fluxo roda dentro de uma IIFE.
 *
 * Outro detalhe: este script não importa `electron/main.ts`, então ele mesmo
 * registra o handler `varredura:fetch` (mesmo contrato de main.ts), compilando
 * `src/fetchers/node-fetch.ts` com esbuild antes de criar a janela.
 */

import { app, BrowserWindow, ipcMain } from "electron";
import { writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Raiz do projeto, derivada da localização deste arquivo. */
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const tela = join(raiz, "dist", "index.html");
const preload = join(raiz, "build", "preload.mjs");

const URL_PREFEITURA = "https://www.mogimirim.sp.gov.br/contratacao";
const VEREDITOS = ["SIM", "NÃO", "INDETERMINADO"];

const LIMITES = {
  compilacao: 30_000,
  carga: 60_000,
  ponte: 15_000,
  ipc: 45_000,
  varredura: 120_000,
  intervaloVarredura: 500,
  geral: 180_000,
};

/** Checagem 3: procura o veredito no primeiro <h2> que o mostre. */
const EXPR_VEREDITO = `
  (() => {
    const alvos = ${JSON.stringify(VEREDITOS)}.map((a) => a.normalize("NFC"));
    for (const h of document.querySelectorAll("h2")) {
      const bruto = h.innerText || h.textContent || "";
      const t = bruto.trim().normalize("NFC");
      if (alvos.includes(t)) return t;
    }
    return null;
  })()
`;

/** Checagem 2: busca real pela ponte IPC, devolvendo { status, bytes }. */
const EXPR_IPC = [
  "(async () => {",
  "  try {",
  `    const r = await window.varredura.fetch(${JSON.stringify(URL_PREFEITURA)});`,
  "    const corpo = r.corpo;",
  "    const bytes = corpo && typeof corpo.byteLength === 'number' ? corpo.byteLength : -1;",
  "    return { status: r.status, bytes };",
  "  } catch (erro) {",
  "    return { erro: String((erro && erro.message) || erro) };",
  "  }",
  "})()",
].join("\n");

const inicio = Date.now();
const errosConsole = [];
const estado = {
  cargaOk: false,
  bridge: false,
  ipc: { erro: "não executado" },
  veredito: null,
};

let vigia = null;
let encerrado = false;

function dormir(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function textoDe(erro) {
  return erro instanceof Error ? erro.message : String(erro);
}

/** Resolve com o valor da promessa ou rejeita se `ms` passar primeiro. */
async function comTimeout(promessa, ms, rotulo) {
  let temporizador = null;
  const guardiao = new Promise((_ok, rejeitar) => {
    temporizador = setTimeout(() => rejeitar(new Error(`${rotulo}: limite de ${ms} ms atingido`)), ms);
  });
  promessa.catch(() => {}); // a perdedora da corrida não pode virar unhandled rejection
  try {
    return await Promise.race([promessa, guardiao]);
  } finally {
    clearTimeout(temporizador);
  }
}

/** Monta o relatório, imprime a linha JSON final e encerra o Electron. */
function finalizar(codigo) {
  if (encerrado) return;
  encerrado = true;
  if (vigia) clearTimeout(vigia);

  const relatorio = {
    bridge: estado.bridge === true,
    ipc: estado.ipc,
    veredito: estado.veredito,
    duracaoMs: Date.now() - inicio,
    errosConsole,
  };
  const linha = `${JSON.stringify(relatorio)}\n`;
  try {
    // Escrita síncrona: app.exit corta escritas ainda pendentes em pipe.
    writeSync(1, linha);
  } catch {
    process.stdout.write(linha);
  }
  app.exit(codigo);
}

/**
 * Registra `ipcMain.handle("varredura:fetch")` com o fetchNode de produção.
 * Compila o TS para um arquivo temporário e o importa (o processo principal do
 * Electron não entende TypeScript).
 */
async function registrarBuscaDaPonte() {
  try {
    const { build } = await import("esbuild");
    const destino = join(tmpdir(), "varredura-smoke-node-fetch.mjs");
    await comTimeout(
      build({
        entryPoints: [join(raiz, "src", "fetchers", "node-fetch.ts")],
        outfile: destino,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node22",
        logLevel: "silent",
      }),
      LIMITES.compilacao,
      "compilação de fetchNode",
    );
    const { fetchNode } = await import(pathToFileURL(destino).href);

    // Mesmo contrato de electron/main.ts: quem chama é o preload via ipcRenderer.invoke.
    ipcMain.handle("varredura:fetch", async (_evento, url, opcoes) => {
      const resposta = await fetchNode(url, opcoes);
      return {
        urlFinal: resposta.urlFinal,
        status: resposta.status,
        headers: resposta.headers,
        corpo: resposta.corpo,
      };
    });
    console.log("[smoke] handler 'varredura:fetch' registrado (fetchNode real)");
  } catch (falha) {
    const motivo = textoDe(falha);
    errosConsole.push(`compilação de fetchNode: ${motivo}`);
    ipcMain.handle("varredura:fetch", async () => {
      throw new Error(`fetchNode indisponível: ${motivo}`);
    });
    console.log(`[smoke] AVISO: fetchNode não compilou: ${motivo}`);
  }
}

/** Guarda no relatório as mensagens de console com nível de erro (0..3 = verbose..error). */
function capturarConsole(...argumentos) {
  const segundo = argumentos[1];
  const detalhe =
    segundo && typeof segundo === "object"
      ? {
          nivel: segundo.level,
          mensagem: segundo.message,
          linha: segundo.line ?? segundo.lineNumber,
          origem: segundo.sourceId,
        }
      : { nivel: segundo, mensagem: argumentos[2], linha: argumentos[3], origem: argumentos[4] };

  if (typeof detalhe.mensagem !== "string" || detalhe.mensagem.trim() === "") return;
  const ehErro = detalhe.nivel === 3 || detalhe.nivel === "error";
  if (!ehErro || errosConsole.length >= 100) return;

  const local = detalhe.origem ? ` (${detalhe.origem}:${detalhe.linha ?? "?"})` : "";
  errosConsole.push(`${detalhe.mensagem.replace(/\s+/g, " ").trim()}${local}`);
}

/** Checagem 3: faz polling até o veredito aparecer no painel (ou estourar o prazo). */
async function esperarVeredito(janela) {
  const limite = Date.now() + LIMITES.varredura;
  let falhasSeguidas = 0;

  while (Date.now() < limite) {
    try {
      const achado = await janela.webContents.executeJavaScript(EXPR_VEREDITO, false);
      falhasSeguidas = 0;
      if (achado) return achado;
    } catch (falha) {
      falhasSeguidas += 1;
      if (falhasSeguidas === 1) errosConsole.push(`polling do veredito: ${textoDe(falha)}`);
    }
    await dormir(LIMITES.intervaloVarredura);
  }
  return null;
}

async function principal() {
  vigia = setTimeout(() => {
    errosConsole.push(`watchdog: limite geral de ${LIMITES.geral} ms atingido`);
    finalizar(1);
  }, LIMITES.geral);

  await registrarBuscaDaPonte();
  await app.whenReady();

  const janela = new BrowserWindow({
    show: false,
    width: 1240,
    height: 900,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  janela.webContents.on("console-message", capturarConsole);
  janela.webContents.on("render-process-gone", (_evento, detalhes) => {
    errosConsole.push(`render-process-gone: ${JSON.stringify(detalhes)}`);
  });
  const anotarPreload = (_evento, caminho, erro) => {
    errosConsole.push(`preload-error (${caminho}): ${textoDe(erro)}`);
  };
  janela.webContents.on("preload-error", anotarPreload);
  app.on("preload-error", anotarPreload);
  // A saída é controlada por este script; o Electron não pode encerrar sozinho.
  app.on("window-all-closed", () => {});

  console.log(`[smoke] carregando ${tela}`);
  // SMOKE_URL permite apontar o smoke para o dev server (npm run dev:desktop),
  // em vez do dist/ carregado por file://.
  const urlDev = process.env.SMOKE_URL ?? "";
  try {
    if (urlDev) {
      console.log(`[smoke] origem: ${urlDev}`);
      await comTimeout(janela.loadURL(urlDev), LIMITES.carga, "carga do dev server");
    } else {
      await comTimeout(janela.loadFile(tela), LIMITES.carga, "carga de dist/index.html");
    }
    estado.cargaOk = true;
  } catch (falha) {
    errosConsole.push(`carga: ${textoDe(falha)}`);
  }

  // Checagem 1: a ponte existe no renderer?
  try {
    estado.bridge =
      (await comTimeout(
        janela.webContents.executeJavaScript('typeof window.varredura?.fetch === "function"', false),
        LIMITES.ponte,
        "checagem 1 (ponte)",
      )) === true;
  } catch (falha) {
    errosConsole.push(`checagem 1 (ponte): ${textoDe(falha)}`);
  }
  console.log(`[smoke] checagem 1 — ponte: ${estado.bridge}`);

  // Checagem 3 inicia em paralelo (a varredura já correu no primeiro render).
  const promessaVeredito = esperarVeredito(janela);

  // Checagem 2: busca real pela ponte IPC (TLS da Prefeitura incluso).
  try {
    estado.ipc = await comTimeout(
      janela.webContents.executeJavaScript(EXPR_IPC, false),
      LIMITES.ipc,
      "checagem 2 (IPC)",
    );
  } catch (falha) {
    estado.ipc = { erro: textoDe(falha) };
  }
  console.log(`[smoke] checagem 2 — ipc: ${JSON.stringify(estado.ipc)}`);

  estado.veredito = await promessaVeredito;
  if (!estado.veredito) {
    errosConsole.push(`varredura: nenhum veredito em ${LIMITES.varredura} ms`);
  }
  console.log(`[smoke] checagem 3 — veredito: ${estado.veredito ?? "(sem veredito)"}`);

  const sucesso = estado.cargaOk && estado.bridge && VEREDITOS.includes(estado.veredito);
  finalizar(sucesso ? 0 : 1);
}

void principal().catch((falha) => {
  errosConsole.push(`falha inesperada: ${falha && falha.stack ? falha.stack : textoDe(falha)}`);
  finalizar(1);
});
