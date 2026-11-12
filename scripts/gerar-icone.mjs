/**
 * Gera `recursos/icon.png` (1024×1024) a partir de `public/logo.svg`.
 *
 * O SVG é a fonte da verdade da identidade visual. O electron-builder precisa de
 * um bitmap para montar o `.ico` do executável e do instalador — ele converte o
 * PNG sozinho (basta ter 256 px ou mais).
 *
 * Usa o próprio Electron como rasterizador: nenhuma dependência nova, e o
 * resultado é exatamente o SVG que aparece no app.
 *
 * Uso: `npm run icone`
 */

import { app, BrowserWindow } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origem = join(raiz, "public", "logo.svg");
const destino = join(raiz, "recursos", "icon.png");
const LADO = 1024;

async function principal() {
  await mkdir(dirname(destino), { recursive: true });
  await app.whenReady();

  const janela = new BrowserWindow({
    width: LADO,
    height: LADO,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // O SVG tem tamanho intrínseco de 128 px (bom para <img> no cabeçalho).
  // Para o ícone, o SVG é embutido inline no HTML e esticado para 1024 px —
  // SVG escala sem perda, então o bitmap sai nítido. Inline também evita o
  // bloqueio de `file://` dentro de uma página `data:`.
  const svg = await readFile(origem, "utf8");
  const html = `<meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}
svg{display:block;width:${LADO}px;height:${LADO}px}</style>${svg}`;

  await janela.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await janela.webContents.setZoomFactor(1);

  // Deixa o primeiro quadro do SVG ser pintado antes do snapshot.
  await new Promise((resolver) => setTimeout(resolver, 500));

  const captura = await janela.webContents.capturePage({ x: 0, y: 0, width: LADO, height: LADO });
  const tamanho = captura.getSize();
  const imagem = tamanho.width === LADO && tamanho.height === LADO ? captura : captura.resize({ width: LADO, height: LADO });
  const png = imagem.toPNG();

  await writeFile(destino, png);
  console.log(
    `[icone] ${destino} — ${imagem.getSize().width}x${imagem.getSize().height}, ${(png.length / 1024).toFixed(1)} kB`,
  );
  app.exit(0);
}

void principal().catch((falha) => {
  console.error(`[icone] falhou: ${falha && falha.message ? falha.message : falha}`);
  app.exit(1);
});
