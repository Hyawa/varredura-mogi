/**
 * Desenvolvimento do app desktop: Vite (HMR) + Electron na mesma sessão.
 *
 * `npm run dev` sobe só o navegador, e `npm run electron:dev` faz um build de
 * produção e abre o `file://` — nenhum dos dois dá recarga automática no
 * Electron. Este script fecha essa lacuna:
 *
 *   1. garante `build/main.mjs` e `build/preload.mjs` (esbuild, ~1 s);
 *   2. sobe o Vite na porta 5199 com `--strictPort`;
 *   3. espera o servidor responder;
 *   4. abre o Electron apontando para `http://localhost:5199`
 *      (`electron/main.ts` já lê `VITE_DEV_SERVER_URL`).
 *
 * Como no Electron o preload está ativo, `criarFetcher()` usa a ponte IPC —
 * o mesmo caminho de rede do app empacotado, e não o proxy `/__fetch` do
 * navegador.
 *
 * Encerrar o Electron (fechar a janela) derruba o Vite, e Ctrl+C derruba ambos.
 *
 * Uso: `npm run dev:desktop`
 * Variável opcional: `VARREDURA_DEV_PORT` (padrão 5199).
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const exigir = createRequire(import.meta.url);

const porta = Number(process.env.VARREDURA_DEV_PORT ?? 5199);
const urlDev = `http://localhost:${porta}`;
const entrada = join(raiz, "build", "main.mjs");
const preload = join(raiz, "build", "preload.mjs");

/** Filhos vivos, para derrubar tudo junto em qualquer saída. */
const filhos = new Set();
let saindo = false;

function texto(erro) {
  return erro instanceof Error ? erro.message : String(erro);
}

/**
 * Mata o filho e a árvore dele. No Windows o Electron abre processos
 * auxiliares (GPU, renderer) e `child.kill()` só alcança o principal.
 */
function derrubar(filho) {
  if (!filho || filho.exitCode !== null || filho.signalCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(filho.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    filho.kill("SIGTERM");
  } catch {
    /* já morreu */
  }
}

function encerrarTudo(codigo) {
  if (saindo) return;
  saindo = true;
  for (const filho of filhos) derrubar(filho);
  filhos.clear();
  process.exit(codigo);
}

process.on("SIGINT", () => encerrarTudo(0));
process.on("SIGTERM", () => encerrarTudo(0));

/** O Electron não entende TypeScript: `build/` precisa existir antes. */
function garantirBuildNode() {
  if (existsSync(entrada) && existsSync(preload)) return;
  console.log("[dev] build/ ausente — rodando build:node…");
  const resultado = spawnSync(process.execPath, [join(raiz, "scripts", "build-node.mjs")], {
    cwd: raiz,
    stdio: "inherit",
  });
  if (resultado.status !== 0) throw new Error("build:node falhou; veja a saída acima.");
}

function subirVite() {
  // Vite 8 não exporta `./bin/vite.js` no package.json, mas exporta
  // `./package.json`: chegamos no CLI pelo diretório do pacote.
  const pacote = exigir.resolve("vite/package.json");
  const binario = join(dirname(pacote), "bin", "vite.js");
  if (!existsSync(binario)) throw new Error(`CLI do Vite não encontrado em ${binario}`);
  const filho = spawn(process.execPath, [binario, "--port", String(porta), "--strictPort"], {
    cwd: raiz,
    stdio: "inherit",
    env: process.env,
  });
  filhos.add(filho);
  filho.on("error", (falha) => {
    console.error(`[dev] Vite não subiu: ${texto(falha)}`);
    encerrarTudo(1);
  });
  filho.on("exit", (codigo) => {
    if (!saindo) console.error(`[dev] Vite encerrou (código ${codigo}); fechando.`);
    encerrarTudo(codigo ?? 1);
  });
  return filho;
}

/** Polling curto até o dev server aceitar conexões. */
async function esperarServidor(limiteMs = 40_000) {
  const limite = Date.now() + limiteMs;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(urlDev, { signal: AbortSignal.timeout(1500) });
      if (resposta.ok || resposta.status === 404) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  throw new Error(`o Vite não respondeu em ${urlDev} dentro de ${limiteMs} ms`);
}

function subirElectron() {
  const binario = exigir("electron");
  const filho = spawn(binario, [entrada], {
    cwd: raiz,
    stdio: "inherit",
    env: { ...process.env, VITE_DEV_SERVER_URL: urlDev, ELECTRON_ENABLE_LOGGING: "1" },
  });
  filhos.add(filho);
  filho.on("error", (falha) => {
    console.error(`[dev] Electron não abriu: ${texto(falha)}`);
    encerrarTudo(1);
  });
  filho.on("exit", (codigo) => {
    if (!saindo) console.log(`[dev] Electron fechou (código ${codigo ?? 0}); encerrando o Vite.`);
    encerrarTudo(codigo ?? 0);
  });
  return filho;
}

function principal() {
  garantirBuildNode();
  console.log(`[dev] subindo Vite em ${urlDev}`);
  subirVite();

  esperarServidor()
    .then(() => {
      console.log(`[dev] Vite pronto. Abrindo Electron (ponte IPC ativa)…`);
      subirElectron();
    })
    .catch((falha) => {
      console.error(`[dev] ${texto(falha)}`);
      encerrarTudo(1);
    });
}

principal();
