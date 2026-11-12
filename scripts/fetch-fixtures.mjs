// Baixa um HTML real de cada fonte para tests/fixtures.
// Uso: node scripts/fetch-fixtures.mjs
// Serve para (a) escrever testes sem rede e (b) reprovar rápido quando um layout muda.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../tests/fixtures");
const UA = "VarreduraMogi/0.1 (verificador pessoal de concursos publicos)";

const ALVOS = {
  "prefeitura-c1.html":
    "https://www.mogimirim.sp.gov.br/contratacao?ContratacaoSearch%5Bid_contratacao_categoria%5D=1&ContratacaoSearch%5Bano%5D=&ContratacaoSearch%5Bq%5D=",
  "prefeitura-c2.html":
    "https://www.mogimirim.sp.gov.br/contratacao?ContratacaoSearch%5Bid_contratacao_categoria%5D=2&ContratacaoSearch%5Bano%5D=&ContratacaoSearch%5Bq%5D=",
  "prefeitura-detalhe.html":
    "https://www.mogimirim.sp.gov.br/contratacao/view/36/concurso-publico-n-022026-edital-02",
  "ibam.html": "https://www.ibamsp-concursos.org.br/index/todos/?busca=MOGI+MIRIM",
  "saae.html": "https://www.saaemogimirim.sp.gov.br/concurso",
  "sigmarh-lista.html": "https://web.sigmarh.com.br/concursos/pesquisar.asp?s=Mogi+Mirim",
  "sigmarh-detalhe.html": "https://web.sigmarh.com.br/concursos/?id=292",
  "cemmil-p1.html": "https://cemmil.com.br/processo-seletivo/",
  "cemmil-p2.html": "https://cemmil.com.br/processo-seletivo/?jet_paged=2",
  "pci-mogimirim.html": "https://www.pciconcursos.com.br/concursos/sp/mogi-mirim",
};

function charsetDe(buf, contentType = "") {
  const head = Buffer.from(buf.slice(0, 2048)).toString("latin1");
  const m =
    /charset=["']?([\w-]+)/i.exec(contentType) ||
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
  return (m?.[1] || "utf-8").toLowerCase();
}

await mkdir(OUT, { recursive: true });

for (const [arquivo, url] of Object.entries(ALVOS)) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(resolve(OUT, arquivo), buf);
    const cs = charsetDe(buf, res.headers.get("content-type") || "");
    console.log(`${res.status}  ${arquivo}  ${buf.length}b  (${cs})`);
  } catch (e) {
    console.log(`ERRO ${arquivo}: ${e.message}`);
  }
}
