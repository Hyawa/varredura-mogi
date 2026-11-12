import { describe, expect, it, vi } from "vitest";

import { chaveProcesso, deduplicar } from "../src/core/dedupe";
import { executarVarredura } from "../src/core/scan";
import { ibam } from "../src/core/sources/ibam";
import { pci } from "../src/core/sources/pci";
import type { FonteAutomatica, Item } from "../src/core/types";
import { criarFetcher, rotasDeFixtures } from "./helpers";

function item(parcial: Partial<Item> & Pick<Item, "id" | "titulo">): Item {
  return {
    fonteId: "teste",
    fonteNome: "Teste",
    situacao: "aberto",
    ...parcial,
  };
}

describe("executarVarredura", () => {
  it("consulta as 6 fontes e diz NÃO quando nada está aberto", async () => {
    const concluidas: string[] = [];
    const varredura = await executarVarredura({
      fetcher: criarFetcher(rotasDeFixtures()),
      hoje: "2026-11-11",
      aoConcluirFonte: (fonte) => concluidas.push(fonte.fonteId),
    });

    expect(varredura.totais.fontes).toBe(6);
    expect(varredura.totais.fontesOk).toBe(6);
    expect(varredura.totais.falhas).toBe(0);
    expect(varredura.totais.abertos).toBe(0);
    expect(varredura.veredito).toBe("NAO");
    expect(concluidas.sort()).toEqual(["cemmil", "ibam", "pci", "prefeitura", "saae", "sigmarh"]);
  });

  it("diz SIM quando a janela de inscrição está aberta", async () => {
    const varredura = await executarVarredura({
      fetcher: criarFetcher(rotasDeFixtures()),
      hoje: "2026-08-20",
    });

    expect(varredura.totais.abertos).toBeGreaterThan(0);
    expect(varredura.veredito).toBe("SIM");
    expect(varredura.abertos.every((aberto) => aberto.inscricaoFim)).toBe(true);
  });

  it("mescla o mesmo processo vindo de fontes diferentes", async () => {
    const varredura = await executarVarredura({
      fetcher: criarFetcher(rotasDeFixtures()),
      hoje: "2026-11-11",
    });

    const comDuasFontes = varredura.encerrados.find(
      (item) =>
        item.tambemEm &&
        item.tambemEm.length > 0 &&
        [item.fonteNome, ...item.tambemEm].includes("Prefeitura de Mogi Mirim") &&
        [item.fonteNome, ...item.tambemEm].includes("IBAM-SP (banca)"),
    );

    expect(comDuasFontes).toBeDefined();
    expect(comDuasFontes?.inscricaoFim).toBe("2026-09-10");
  });

  it("vira INDETERMINADO quando uma fonte falha", async () => {
    const varredura = await executarVarredura({
      fetcher: criarFetcher([
        ...rotasDeFixtures().filter(
          (rota) => !rota.casa("https://www.pciconcursos.com.br/concursos/sp/mogi-mirim"),
        ),
        {
          casa: (url) => url.includes("pciconcursos"),
          responder: () => ({ urlFinal: "https://pciconcursos", status: 500, headers: {}, corpo: new Uint8Array() }),
        },
      ]),
      hoje: "2026-11-11",
      fontes: [ibam, pci],
    });

    expect(varredura.totais.falhas).toBe(1);
    expect(varredura.veredito).toBe("INDETERMINADO");
    expect(varredura.fontes.find((fonte) => fonte.fonteId === "pci")?.erro).toMatch(/HTTP 500/);
  });

  it("respeita o timeout por fonte", async () => {
    const lenta: FonteAutomatica = {
      id: "lenta",
      nome: "Fonte lenta",
      url: "https://exemplo",
      papel: "automatico",
      executar: () => new Promise(() => undefined),
    };

    const varredura = await executarVarredura({
      fetcher: criarFetcher([]),
      hoje: "2026-11-11",
      timeoutMs: 40,
      fontes: [lenta],
    });

    expect(varredura.totais.falhas).toBe(1);
    expect(varredura.veredito).toBe("INDETERMINADO");
    expect(varredura.fontes[0].erro).toMatch(/tempo esgotado/);
  });

  it("não deixa o callback de progresso derrubar a varredura", async () => {
    const aoConcluirFonte = vi.fn();
    await executarVarredura({
      fetcher: criarFetcher(rotasDeFixtures()),
      hoje: "2026-11-11",
      aoConcluirFonte,
    });
    expect(aoConcluirFonte).toHaveBeenCalledTimes(6);
  });
});

describe("deduplicar", () => {
  it("agrupa pelo número, ano e edital do processo", () => {
    expect(
      chaveProcesso(
        item({
          id: "1",
          titulo: "CONCURSO PÚBLICO N° 02/2026 - Edital 02",
          tipo: "Concurso Público",
          numero: "2",
          ano: 2026,
        }),
      ),
    ).toBe("concurso publico|2|2026|2");
  });

  it("prefere a versão com mais informação e guarda a outra fonte", () => {
    const resultado = deduplicar([
      item({
        id: "a",
        titulo: "CONCURSO PÚBLICO N° 02/2026 - Edital 02",
        fonteNome: "Prefeitura de Mogi Mirim",
        tipo: "Concurso Público",
        numero: "2",
        ano: 2026,
        resumo: "Resumo",
      }),
      item({
        id: "b",
        titulo: "MOGI MIRIM - CONCURSO PÚBLICO - 02/2026 - EDITAL 02",
        fonteNome: "IBAM-SP (banca)",
        tipo: "Concurso Público",
        numero: "2",
        ano: 2026,
        inscricaoInicio: "2026-08-13",
        inscricaoFim: "2026-09-10",
        vagas: 12,
      }),
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].fonteNome).toBe("IBAM-SP (banca)");
    expect(resultado[0].tambemEm).toContain("Prefeitura de Mogi Mirim");
    expect(resultado[0].resumo).toBe("Resumo");
  });
});
