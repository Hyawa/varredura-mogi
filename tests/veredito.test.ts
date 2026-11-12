import { describe, expect, it } from "vitest";

import { decidirVeredito } from "../src/core/veredito";
import type { Item } from "../src/core/types";

function itemAberto(id: string): Item {
  return {
    id,
    fonteId: "teste",
    fonteNome: "Teste",
    titulo: "Concurso de teste",
    situacao: "aberto",
    inscricaoFim: "2026-12-31",
  };
}

describe("decidirVeredito", () => {
  it("diz SIM quando existe inscrição aberta", () => {
    const saida = decidirVeredito({ abertos: [itemAberto("1")], falhas: 3, fontesConsultadas: 6 });
    expect(saida.veredito).toBe("SIM");
    expect(saida.motivo).toContain("1 oportunidade");
  });

  it("nunca diz NÃO quando alguma fonte falhou", () => {
    const saida = decidirVeredito({ abertos: [], falhas: 1, fontesConsultadas: 6 });
    expect(saida.veredito).toBe("INDETERMINADO");
    expect(saida.motivo).toContain("1 delas falhou");
  });

  it("diz NÃO somente com todas as fontes respondendo", () => {
    const saida = decidirVeredito({ abertos: [], falhas: 0, fontesConsultadas: 6 });
    expect(saida.veredito).toBe("NAO");
    expect(saida.motivo).toContain("6 fontes");
  });

  it("usa plural correto de oportunidades", () => {
    const saida = decidirVeredito({
      abertos: [itemAberto("1"), itemAberto("2")],
      falhas: 0,
      fontesConsultadas: 6,
    });
    expect(saida.motivo).toContain("2 oportunidades");
  });
});
