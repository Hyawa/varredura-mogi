import { contextBridge, ipcRenderer } from "electron";
import type { Fetcher } from "../src/core/types";

/**
 * Ponte mínima entre o renderer (sandbox do Chromium) e o processo principal
 * (Node). Só existe a função de busca; nada de `require` ou acesso ao disco.
 */
const buscar: Fetcher = async (url, opcoes) => {
  const resposta = (await ipcRenderer.invoke("varredura:fetch", url, opcoes)) as {
    urlFinal: string;
    status: number;
    headers: Record<string, string>;
    corpo: Uint8Array | ArrayBuffer;
  };

  return {
    urlFinal: resposta.urlFinal,
    status: resposta.status,
    headers: resposta.headers,
    corpo:
      resposta.corpo instanceof Uint8Array ? new Uint8Array(resposta.corpo) : new Uint8Array(resposta.corpo),
  };
};

contextBridge.exposeInMainWorld("varredura", { fetch: buscar });
