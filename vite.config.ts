import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fetchRawNode } from "./src/fetchers/node-fetch";

/**
 * Proxy de desenvolvimento: no navegador as páginas das fontes são bloqueadas
 * por CORS. Este middleware roda no servidor do Vite e devolve os bytes crus,
 * para que `npm run dev` funcione sem Electron e sem Android.
 */
function proxyDeDesenvolvimento(): Plugin {
  return {
    name: "varredura-proxy-dev",
    configureServer(servidor) {
      servidor.middlewares.use("/__fetch", async (req, res) => {
        const alvo = new URL(req.url ?? "", "http://localhost").searchParams.get("url");
        res.setHeader("content-type", "application/json; charset=utf-8");
        if (!alvo) {
          res.statusCode = 400;
          res.end(JSON.stringify({ erro: "parâmetro url ausente" }));
          return;
        }
        try {
          const r = await fetchRawNode(alvo, 20_000);
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              status: r.status,
              headers: r.headers,
              corpoBase64: Buffer.from(r.body).toString("base64"),
            }),
          );
        } catch (erro) {
          res.statusCode = 502;
          res.end(JSON.stringify({ erro: String(erro) }));
        }
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), proxyDeDesenvolvimento()],
  // No build os caminhos ficam relativos ("./assets/..."): é o que permite ao
  // Electron carregar dist/index.html via file:// (com base absoluta o Chromium
  // buscava os arquivos em file:///assets e a página ficava em branco). No dev
  // e no Capacitor o servidor continua servindo em "/".
  base: command === "build" ? "./" : "/",
  build: { outDir: "dist", target: "es2022" },
  server: { port: 5199 },
}));
