/**
 * A regra do veredito, isolada para poder ser testada sem rede.
 *
 * SIM            → há pelo menos uma inscrição comprovadamente aberta.
 * INDETERMINADO  → nada aberto, mas alguma fonte falhou (nunca mentir "NÃO").
 * NAO            → todas as fontes responderam e nada está aberto.
 */

import type { Item, Veredito } from "./types";

export interface EntradaVeredito {
  abertos: Item[];
  falhas: number;
  fontesConsultadas: number;
}

export interface SaidaVeredito {
  veredito: Veredito;
  motivo: string;
}

export function decidirVeredito({ abertos, falhas, fontesConsultadas }: EntradaVeredito): SaidaVeredito {
  if (abertos.length > 0) {
    const quantidade = abertos.length === 1 ? "1 oportunidade" : `${abertos.length} oportunidades`;
    return {
      veredito: "SIM",
      motivo: `${quantidade} com inscrições abertas agora.`,
    };
  }

  if (falhas > 0) {
    const total = fontesConsultadas === 1 ? "1 fonte" : `${fontesConsultadas} fontes`;
    const falhou = falhas === 1 ? "1 delas falhou" : `${falhas} delas falharam`;
    return {
      veredito: "INDETERMINADO",
      motivo: `Nenhuma inscrição aberta foi encontrada, mas ${falhou} entre ${total}. Sem essa resposta, não dá para afirmar que não há nada aberto.`,
    };
  }

  return {
    veredito: "NAO",
    motivo:
      fontesConsultadas === 1
        ? "A fonte consultada não tem nenhuma inscrição aberta agora."
        : `As ${fontesConsultadas} fontes consultadas não têm nenhuma inscrição aberta agora.`,
  };
}
