import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchNode } from "../src/fetchers/node-fetch";
import type { OpcoesRequisicao } from "../src/core/types";

const raiz = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const tela = join(raiz, "dist", "index.html");
const servidorDev = process.env.VITE_DEV_SERVER_URL ?? "";

function criarJanela(): void {
  const janela = new BrowserWindow({
    width: 1240,
    height: 900,
    minWidth: 380,
    minHeight: 620,
    backgroundColor: "#0b1220",
    title: "Varredura Mogi",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(raiz, "build", "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  janela.once("ready-to-show", () => janela.show());

  janela.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  janela.webContents.on("will-navigate", (evento, url) => {
    const destino = new URL(url);
    const local = new URL(servidorDev || `file://${tela.replace(/\\/g, "/")}`);
    if (destino.origin !== local.origin) {
      evento.preventDefault();
      void shell.openExternal(url);
    }
  });

  if (servidorDev) {
    void janela.loadURL(servidorDev);
  } else {
    void janela.loadFile(tela);
  }
}

ipcMain.handle("varredura:fetch", async (_evento, url: string, opcoes?: OpcoesRequisicao) => {
  const resposta = await fetchNode(url, opcoes);
  return {
    urlFinal: resposta.urlFinal,
    status: resposta.status,
    headers: resposta.headers,
    corpo: resposta.corpo,
  };
});

void app.whenReady().then(() => {
  app.setAppUserModelId("br.com.varreduramogi.app");
  criarJanela();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
