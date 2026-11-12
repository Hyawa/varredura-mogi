/**
 * Contratos do núcleo do Varredura Mogi.
 *
 * Tudo aqui é TypeScript puro: o núcleo não sabe se está rodando no Node,
 * no Electron ou no WebView do Android. A única dependência externa é um
 * `Fetcher` injetado (fetch do Node, CapacitorHttp ou o proxy do Vite).
 */

/** Resposta mínima de uma requisição HTTP, independente da plataforma. */
export interface RespostaBruta {
  /** URL final, depois de redirecionamentos. */
  urlFinal: string;
  status: number;
  headers: Record<string, string>;
  /** Corpo cru: o charset só pode ser descoberto depois de ler os bytes. */
  corpo: Uint8Array;
}

export interface OpcoesRequisicao {
  timeoutMs?: number;
  headers?: Record<string, string>;
  metodo?: "GET" | "POST";
  corpo?: string;
}

/** Assinatura única de acesso à rede usada por todas as fontes. */
export type Fetcher = (url: string, opcoes?: OpcoesRequisicao) => Promise<RespostaBruta>;

/** Situação de uma oportunidade em relação às inscrições. */
export type Situacao =
  /** Inscrições comprovadamente abertas hoje. */
  | "aberto"
  /** Inscrições comprovadamente encerradas. */
  | "encerrado"
  /** Processo em andamento, mas sem confirmação de que dá para se inscrever. */
  | "andamento"
  /** Janela de inscrição já divulgada, mas começa no futuro. */
  | "futuro"
  /** A fonte não informou datas suficientes. */
  | "desconhecido";

export type Veredito = "SIM" | "NAO" | "INDETERMINADO";

export type PapelFonte = "automatico" | "manual";

export interface Item {
  /** Identificador estável usado para deduplicar e comparar varreduras. */
  id: string;
  fonteId: string;
  fonteNome: string;
  titulo: string;
  tipo?: string;
  numero?: string;
  ano?: number;
  orgao?: string;
  vagas?: number;
  /** Datas ISO (YYYY-MM-DD). */
  inscricaoInicio?: string;
  inscricaoFim?: string;
  publicacao?: string;
  statusTexto?: string;
  situacao: Situacao;
  link?: string;
  resumo?: string;
  /** Outras fontes que apontaram para o mesmo processo. */
  tambemEm?: string[];
}

export interface ResultadoFonte {
  fonteId: string;
  fonteNome: string;
  papel: PapelFonte;
  url: string;
  ok: boolean;
  erro?: string;
  statusHttp?: number;
  duracaoMs: number;
  itens: Item[];
}

export interface Totais {
  fontes: number;
  fontesOk: number;
  falhas: number;
  abertos: number;
  encerrados: number;
  andamento: number;
  futuros: number;
  desconhecidos: number;
}

export interface Varredura {
  versao: 1;
  iniciadaEm: string;
  finalizadaEm: string;
  duracaoMs: number;
  /** Data usada como "hoje" no cálculo (ISO). */
  hoje: string;
  veredito: Veredito;
  motivo: string;
  abertos: Item[];
  encerrados: Item[];
  andamento: Item[];
  futuros: Item[];
  desconhecidos: Item[];
  fontes: ResultadoFonte[];
  totais: Totais;
}

export interface ContextoFonte {
  fetcher: Fetcher;
  /** Hoje em ISO (YYYY-MM-DD), no fuso local. */
  hoje: string;
  timeoutMs: number;
}

/** Contrato de uma fonte raspável automaticamente. */
export interface FonteAutomatica {
  id: string;
  nome: string;
  url: string;
  papel: "automatico";
  executar(contexto: ContextoFonte): Promise<Item[]>;
}

/** Fonte que só pode ser conferida no navegador (bloqueio anti-bot). */
export interface FonteManual {
  id: string;
  nome: string;
  url: string;
  papel: "manual";
  motivo: string;
}
