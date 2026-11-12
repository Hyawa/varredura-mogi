import { describe, expect, it } from "vitest";

import { cemmil } from "../src/core/sources/cemmil";
import { ibam } from "../src/core/sources/ibam";
import { pci } from "../src/core/sources/pci";
import { prefeitura } from "../src/core/sources/prefeitura";
import { saae } from "../src/core/sources/saae";
import { sigmarh, statusSigmaRh } from "../src/core/sources/sigmarh";
import {
  criarFetcher,
  htmlDeArquivo,
  jsonDe,
  MOGI_MIRIM_TERMO,
  rotasDeFixtures,
  textoDe,
} from "./helpers";

const HOJE = "2026-11-11";
const contexto = (rotas = rotasDeFixtures()) => ({
  fetcher: criarFetcher(rotas),
  hoje: HOJE,
  timeoutMs: 5000,
});

describe("Prefeitura", () => {
  it("lê concurso e processo seletivo das categorias certas", async () => {
    const itens = await prefeitura.executar(contexto());
    expect(itens).toHaveLength(25);

    const guarda = itens.find((item) => item.titulo.includes("Edital 02"));
    expect(guarda).toBeDefined();
    expect(guarda?.tipo).toBe("Concurso Público");
    expect(guarda?.numero).toBe("2");
    expect(guarda?.ano).toBe(2026);
    expect(guarda?.inscricaoFim).toBe("2026-09-10");
    expect(guarda?.situacao).toBe("encerrado");
    expect(guarda?.link).toMatch(/^https:\/\/www\.mogimirim\.sp\.gov\.br\/contratacao\/view\//);

    const processo = itens.find((item) => item.titulo === "PROCESSO SELETIVO - 01/2026");
    expect(processo?.tipo).toBe("Processo Seletivo");
    expect(processo?.situacao).toBe("encerrado");
  });

  it("marca como aberto quando a data final ainda não passou", async () => {
    const itens = await prefeitura.executar({ ...contexto(), hoje: "2026-09-01" });
    const guarda = itens.find((item) => item.titulo.includes("Edital 02"));
    expect(guarda?.situacao).toBe("aberto");
  });
});

describe("IBAM", () => {
  it("decodifica ISO-8859-1 e lê a janela de inscrição", async () => {
    const itens = await ibam.executar(contexto());
    expect(itens).toHaveLength(13);

    const primeiro = itens[0];
    expect(primeiro.titulo).toContain("PÚBLICO");
    expect(primeiro.titulo).not.toContain("�");
    expect(primeiro.inscricaoInicio).toBe("2026-08-13");
    expect(primeiro.inscricaoFim).toBe("2026-09-10");
    expect(primeiro.vagas).toBe(9);
    expect(primeiro.situacao).toBe("encerrado");
  });

  it("fica aberto dentro da janela", async () => {
    const itens = await ibam.executar({ ...contexto(), hoje: "2026-08-20" });
    expect(itens[0].situacao).toBe("aberto");
  });
});

describe("SAAE", () => {
  it("usa a publicação antiga como sinal de encerramento", async () => {
    const itens = await saae.executar(contexto());
    expect(itens).toHaveLength(3);
    expect(itens[0].titulo).toContain("002/2026");
    expect(itens[0].situacao).toBe("encerrado");
    expect(itens[0].publicacao).toBe("2026-02-11");
  });

  it("lê o detalhe quando o processo é recente", async () => {
    const recente = { ...contexto(), hoje: "2026-03-01" };
    const itens = await saae.executar(recente);
    expect(itens[0].situacao).toBe("encerrado");
    expect(itens[0].statusTexto).toMatch(/encerrad|resultado/i);
  });
});

describe("SigmaRH", () => {
  it("reconhece o status do botão", () => {
    expect(statusSigmaRh("Inscrições Abertas")).toBe("aberto");
    expect(statusSigmaRh("Inscrições Encerradas")).toBe("encerrado");
    expect(statusSigmaRh("sem botão")).toBeUndefined();
  });

  it("filtra Mogi Mirim e consulta o detalhe dos recentes", async () => {
    const itens = await sigmarh.executar(contexto());
    expect(itens).toHaveLength(12);
    expect(itens.every((item) => item.titulo.includes("MOGI MIRIM"))).toBe(true);

    const ceMMil = itens.find((item) => item.link?.includes("id=292"));
    expect(ceMMil?.situacao).toBe("encerrado");
    expect(ceMMil?.numero).toBe("6");
    expect(ceMMil?.ano).toBe(2026);
  });
});

describe("CEMMIL", () => {
  it("usa a REST API e lê o status na página do processo", async () => {
    const itens = await cemmil.executar(contexto());
    expect(itens).toHaveLength(3);
    expect(itens[0].titulo).toContain("006.2026");
    expect(itens[0].situacao).toBe("encerrado");
    expect(itens[0].link).toBe("https://cemmil.com.br/processos-seletivos/006-2026/");
  });

  it("devolve vazio quando o município não tem processos", async () => {
    const fetcher = criarFetcher([
      { casa: (url) => url.includes("ps_municipios?slug="), responder: () => jsonDe(MOGI_MIRIM_TERMO) },
      { casa: (url) => url.includes("processos-seletivos?"), responder: () => jsonDe([]) },
    ]);
    const itens = await cemmil.executar({ fetcher, hoje: HOJE, timeoutMs: 5000 });
    expect(itens).toHaveLength(0);
  });
});

describe("PCI", () => {
  it("lê a data final de cada oportunidade", async () => {
    const itens = await pci.executar(contexto());
    expect(itens.length).toBeGreaterThan(100);

    const prefeitura2026 = itens.find((item) => item.inscricaoFim === "2026-09-10");
    expect(prefeitura2026).toBeDefined();
    expect(prefeitura2026?.situacao).toBe("encerrado");
    expect(prefeitura2026?.orgao).toMatch(/Mogi Mirim/);
  });

  it("considera aberto enquanto a data final não passou", async () => {
    const itens = await pci.executar({ ...contexto(), hoje: "2026-09-01" });
    const aberto = itens.filter((item) => item.inscricaoFim === "2026-09-10");
    expect(aberto.length).toBeGreaterThan(0);
    expect(aberto.every((item) => item.situacao === "aberto")).toBe(true);
  });
});

describe("detalhes de robustez", () => {
  it("propaga erro HTTP para a varredura tratar como falha", async () => {
    const fetcher = criarFetcher([
      {
        casa: () => true,
        responder: () => ({
          urlFinal: "https://exemplo",
          status: 503,
          headers: {},
          corpo: new Uint8Array(),
        }),
      },
    ]);
    await expect(ibam.executar({ fetcher, hoje: HOJE, timeoutMs: 1000 })).rejects.toThrow(/HTTP 503/);
  });

  it("aceita página vazia do SAAE sem quebrar", async () => {
    const fetcher = criarFetcher([
      { casa: () => true, responder: () => textoDe("<html><body>nada</body></html>") },
    ]);
    const itens = await saae.executar({ fetcher, hoje: HOJE, timeoutMs: 1000 });
    expect(itens).toEqual([]);
  });

  it("mantém o parser de fixture do IBAM independente de rede", async () => {
    const resposta = htmlDeArquivo("ibam.html", "iso-8859-1");
    expect(new TextDecoder("windows-1252").decode(resposta.corpo)).toContain("Público");
  });
});
