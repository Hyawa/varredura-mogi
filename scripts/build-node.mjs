/**
 * Compila os pontos de entrada que rodam fora do Vite (CLI e Electron) com
 * esbuild. O renderer continua sendo o build normal do Vite em `dist/`.
 */

import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("build", { recursive: true });

const comum = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  logLevel: "info",
  external: ["electron"],
  define: { "process.env.NODE_ENV": '"production"' },
};

await build({ ...comum, entryPoints: ["src/cli.ts"], outfile: "build/cli.mjs" });
await build({ ...comum, entryPoints: ["electron/main.ts"], outfile: "build/main.mjs" });
await build({ ...comum, entryPoints: ["electron/preload.ts"], outfile: "build/preload.mjs" });
