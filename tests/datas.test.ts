import { describe, expect, it } from "vitest";

import {
  adicionarDias,
  diferencaEmDias,
  formatarIntervalo,
  intervaloInscricao,
  parseData,
  situacaoPorInscricao,
} from "../src/core/datas";

describe("parseData", () => {
  it("lê datas numéricas completas", () => {
    expect(parseData("13/08/2026")).toBe("2026-08-13");
    expect(parseData("1/9/2026")).toBe("2026-09-01");
    expect(parseData("10/09/26")).toBe("2026-09-10");
  });

  it("lê datas por extenso, com e sem ano", () => {
    expect(parseData("12 de agosto de 2026")).toBe("2026-08-12");
    expect(parseData("10 de setembro", 2026)).toBe("2026-09-10");
    expect(parseData("1 de março de 2025")).toBe("2025-03-01");
  });

  it("rejeita datas impossíveis", () => {
    expect(parseData("31/02/2026")).toBeNull();
    expect(parseData("2026-13-01")).toBeNull();
    expect(parseData("sem data")).toBeNull();
  });
});

describe("intervaloInscricao", () => {
  it("lê o formato do IBAM", () => {
    const intervalo = intervaloInscricao("Inscrições de 13/08/2026 a 10/09/2026");
    expect(intervalo).toEqual({ inicio: "2026-08-13", fim: "2026-09-10" });
  });

  it("lê o formato do resumo da Prefeitura", () => {
    const intervalo = intervaloInscricao(
      "As inscrições podem ser realizadas até 10 de setembro, exclusivamente pelo site do IBAM.",
      2026,
    );
    expect(intervalo).toEqual({ fim: "2026-09-10" });
  });

  it("não confunde datas de resultado com inscrição", () => {
    const intervalo = intervaloInscricao(
      "Resultado das inscrições em 20/10/2026. Inscrições até 10/09/2026.",
      2026,
    );
    expect(intervalo.fim).toBe("2026-09-10");
  });

  it("devolve vazio quando não há inscrição no texto", () => {
    expect(intervaloInscricao("Publicação do edital em 12 de agosto de 2026", 2026)).toEqual({});
  });
});

describe("situacaoPorInscricao", () => {
  const hoje = "2026-11-11";

  it("encerra depois da data final", () => {
    expect(situacaoPorInscricao("2026-08-13", "2026-09-10", hoje)).toBe("encerrado");
  });

  it("considera aberto no último dia", () => {
    expect(situacaoPorInscricao(undefined, "2026-11-11", hoje)).toBe("aberto");
    expect(situacaoPorInscricao(undefined, "2026-11-12", hoje)).toBe("aberto");
  });

  it("marca como futuro quando começa depois de hoje", () => {
    expect(situacaoPorInscricao("2026-12-01", "2026-12-20", hoje)).toBe("futuro");
  });
});

describe("aritmética de datas", () => {
  it("soma dias e calcula diferença", () => {
    expect(adicionarDias("2026-08-31", 10)).toBe("2026-09-10");
    expect(diferencaEmDias("2026-09-10", "2026-11-11")).toBe(62);
    expect(formatarIntervalo("2026-08-13", "2026-09-10")).toBe("13/08/2026 a 10/09/2026");
    expect(formatarIntervalo(undefined, "2026-09-10")).toBe("até 10/09/2026");
  });
});
