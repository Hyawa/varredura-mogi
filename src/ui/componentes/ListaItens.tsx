import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Inbox,
  Layers,
  Search,
  Users,
} from "lucide-react";

import { formatarIntervalo } from "../../core/datas";
import type { Item, Situacao, Varredura } from "../../core/types";
import { normalizar } from "../../core/texto";
import { ROTULO_SITUACAO } from "../util/formato";

interface Props {
  varredura: Varredura | null;
  executando: boolean;
  novosIds: Set<string>;
}

type Filtro = "abertos" | "andamento" | "encerrados" | "todos";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "abertos", rotulo: "Abertos" },
  { id: "andamento", rotulo: "Em andamento" },
  { id: "encerrados", rotulo: "Encerrados" },
  { id: "todos", rotulo: "Tudo" },
];

const CORES_SITUACAO: Record<Situacao, { borda: string; texto: string; fundo: string; pontos: string }> = {
  aberto: {
    borda: "border-l-emerald-500/60",
    texto: "text-emerald-300",
    fundo: "border-emerald-500/25 bg-emerald-500/10",
    pontos: "bg-emerald-400",
  },
  futuro: {
    borda: "border-l-sky-500/50",
    texto: "text-sky-300",
    fundo: "border-sky-500/25 bg-sky-500/10",
    pontos: "bg-sky-400",
  },
  andamento: {
    borda: "border-l-amber-500/50",
    texto: "text-amber-300",
    fundo: "border-amber-500/25 bg-amber-500/10",
    pontos: "bg-amber-400",
  },
  encerrado: {
    borda: "border-l-transparent",
    texto: "text-slate-400",
    fundo: "border-white/10 bg-white/[0.03]",
    pontos: "bg-slate-600",
  },
  desconhecido: {
    borda: "border-l-slate-600",
    texto: "text-slate-400",
    fundo: "border-white/10 bg-white/[0.03]",
    pontos: "bg-slate-500",
  },
};

function pertenceAoFiltro(item: Item, filtro: Filtro): boolean {
  if (filtro === "abertos") return item.situacao === "aberto";
  if (filtro === "andamento") return item.situacao === "andamento" || item.situacao === "futuro";
  if (filtro === "encerrados") return item.situacao === "encerrado" || item.situacao === "desconhecido";
  return true;
}

function categoriaDoTipo(item: Item): "concurso" | "processo" | "outro" {
  const texto = normalizar(item.tipo ?? item.titulo);
  if (texto.includes("concurso")) return "concurso";
  if (texto.includes("processo") || texto.includes("selecao")) return "processo";
  return "outro";
}

export function ListaItens({ varredura, executando, novosIds }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("abertos");
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"todos" | "concurso" | "processo">("todos");

  const todos = useMemo<Item[]>(() => {
    if (!varredura) return [];
    return [
      ...varredura.abertos,
      ...varredura.futuros,
      ...varredura.andamento,
      ...varredura.encerrados,
      ...varredura.desconhecidos,
    ];
  }, [varredura]);

  const contagens: Record<Filtro, number> = {
    abertos: varredura?.abertos.length ?? 0,
    andamento: (varredura?.andamento.length ?? 0) + (varredura?.futuros.length ?? 0),
    encerrados: (varredura?.encerrados.length ?? 0) + (varredura?.desconhecidos.length ?? 0),
    todos: todos.length,
  };

  const itens = useMemo(() => {
    const termo = normalizar(busca);
    return todos.filter((item) => {
      if (!pertenceAoFiltro(item, filtro)) return false;
      if (tipo !== "todos" && categoriaDoTipo(item) !== tipo) return false;
      if (!termo) return true;
      const alvo = normalizar(
        [item.titulo, item.orgao, item.fonteNome, item.tipo, ...(item.tambemEm ?? [])]
          .filter(Boolean)
          .join(" "),
      );
      return alvo.includes(termo);
    });
  }, [todos, filtro, tipo, busca]);

  return (
    <section className="cartao p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-100">Oportunidades</h2>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            {varredura
              ? `${itens.length} de ${contagens[filtro]} ${contagens[filtro] === 1 ? "resultado" : "resultados"} nesta aba`
              : "Aguardando a primeira varredura"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por cargo, órgão…"
              className="h-9 w-full rounded-lg border border-white/10 bg-[#0f1828] pl-8 pr-3 text-[12.5px] text-slate-200 placeholder:text-slate-600 focus:border-slate-500/50 focus:outline-none focus:ring-1 focus:ring-slate-500/30 sm:w-52"
            />
          </label>

          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as typeof tipo)}
            className="h-9 rounded-lg border border-white/10 bg-[#0f1828] px-2.5 text-[12.5px] text-slate-300 focus:border-slate-500/50 focus:outline-none focus:ring-1 focus:ring-slate-500/30"
          >
            <option value="todos">Todos os tipos</option>
            <option value="concurso">Concurso público</option>
            <option value="processo">Processo seletivo</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0f1828] p-1">
        {FILTROS.map((opcao) => {
          const ativo = filtro === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setFiltro(opcao.id)}
              aria-pressed={ativo}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition ${
                ativo
                  ? "bg-white/[0.09] text-slate-100 shadow-sm"
                  : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
              }`}
            >
              {opcao.rotulo}
              <span
                className={`rounded-md px-1 font-mono text-[10px] ${
                  ativo ? "bg-white/10 text-slate-300" : "text-slate-600"
                }`}
              >
                {contagens[opcao.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`mt-3 space-y-2 ${executando ? "opacity-60" : ""} transition-opacity`}>
        {!varredura && executando && <EsqueletoLista />}

        {varredura && itens.length === 0 && (
          <Vazio
            filtro={filtro}
            temEncerrados={contagens.encerrados > 0}
            busca={busca}
            aoVerEncerrados={() => setFiltro("encerrados")}
            aoLimparBusca={() => {
              setBusca("");
              setTipo("todos");
            }}
          />
        )}

        {itens.map((item) => (
          <CartaoItem key={item.id} item={item} novo={novosIds.has(item.id)} />
        ))}
      </div>
    </section>
  );
}

function EsqueletoLista() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((indice) => (
        <div key={indice} className="cartao-interno animate-pulse p-4">
          <div className="h-2 w-24 rounded bg-white/[0.06]" />
          <div className="mt-3 h-3.5 w-2/3 rounded bg-white/[0.07]" />
          <div className="mt-3 h-2 w-1/2 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

function Vazio({
  filtro,
  temEncerrados,
  busca,
  aoVerEncerrados,
  aoLimparBusca,
}: {
  filtro: Filtro;
  temEncerrados: boolean;
  busca: string;
  aoVerEncerrados: () => void;
  aoLimparBusca: () => void;
}) {
  const filtrando = busca.trim().length > 0;
  const titulo = filtrando
    ? "Nada encontrado com esse termo"
    : filtro === "abertos"
      ? "Nada com inscrições abertas agora"
      : filtro === "andamento"
        ? "Nada em andamento no momento"
        : filtro === "encerrados"
          ? "Nenhum processo encerrado nos últimos meses"
          : "Nenhuma oportunidade para mostrar";

  const texto = filtrando
    ? "Tente outro cargo ou limpe a busca."
    : filtro === "abertos"
      ? "As fontes automáticas foram consultadas e nenhuma janela de inscrição está aberta hoje."
      : "Quando a próxima varredura encontrar algo, aparece aqui.";

  return (
    <div className="cartao-interno flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03]">
        <Inbox className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
      </div>
      <p className="mt-3 text-[13.5px] font-medium text-slate-300">{titulo}</p>
      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-slate-500">{texto}</p>

      {filtrando ? (
        <button
          type="button"
          onClick={aoLimparBusca}
          className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] text-slate-300 transition hover:bg-white/[0.05]"
        >
          Limpar busca
        </button>
      ) : (
        filtro === "abertos" &&
        temEncerrados && (
          <button
            type="button"
            onClick={aoVerEncerrados}
            className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-[11.5px] text-slate-300 transition hover:bg-white/[0.05]"
          >
            Ver encerrados recentes
          </button>
        )
      )}
    </div>
  );
}

function CartaoItem({ item, novo }: { item: Item; novo: boolean }) {
  const cores = CORES_SITUACAO[item.situacao];
  const periodo = formatarIntervalo(item.inscricaoInicio, item.inscricaoFim);
  const fontes = [item.fonteNome, ...(item.tambemEm ?? [])].join(" · ");

  return (
    <article
      className={`cartao-interno border-l-2 p-3.5 transition hover:border-white/[0.14] ${cores.borda} ${
        item.situacao === "encerrado" ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cores.pontos}`} aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.tipo && (
              <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-slate-400">
                {item.tipo}
              </span>
            )}
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] ${cores.fundo} ${cores.texto}`}
            >
              {ROTULO_SITUACAO[item.situacao]}
            </span>
            {novo && (
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-emerald-300">
                novo
              </span>
            )}
          </div>

          <h3 className="mt-1.5 text-[13.5px] font-semibold leading-snug text-slate-200">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noreferrer" className="hover:text-white hover:underline hover:underline-offset-2">
                {item.titulo}
              </a>
            ) : (
              item.titulo
            )}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[10.5px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" strokeWidth={1.8} />
              {periodo}
            </span>
            {item.vagas !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" strokeWidth={1.8} />
                {item.vagas} {item.vagas === 1 ? "vaga" : "vagas"}
              </span>
            )}
            {item.orgao && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Building2 className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                <span className="truncate">{item.orgao}</span>
              </span>
            )}
            <span className="inline-flex min-w-0 items-center gap-1" title={fontes}>
              <Layers className="h-3 w-3 shrink-0" strokeWidth={1.8} />
              <span className="truncate">
                {item.fonteNome}
                {item.tambemEm && item.tambemEm.length > 0 ? ` +${item.tambemEm.length}` : ""}
              </span>
            </span>
          </div>

          {item.statusTexto && item.situacao !== "encerrado" && (
            <p className="mt-1.5 text-[10.5px] text-slate-500">{item.statusTexto}</p>
          )}

          {item.resumo && item.situacao !== "encerrado" && (
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{item.resumo}</p>
          )}
        </div>

        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir ${item.titulo}`}
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-500 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-slate-200"
          >
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.9} />
          </a>
        )}
      </div>
    </article>
  );
}
