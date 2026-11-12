import { ExternalLink, Info, Loader2, RefreshCw } from "lucide-react";

import { fontesAutomaticas, fontesManuais } from "../../core/sources";
import type { ResultadoFonte, Varredura } from "../../core/types";

interface Props {
  varredura: Varredura | null;
  executando: boolean;
  estadoFontes: Record<string, "pendente" | "ok" | "erro">;
}

function Ponto({ estado }: { estado: "pendente" | "ok" | "erro" }) {
  if (estado === "pendente") {
    return <Loader2 className="h-3 w-3 animate-spin text-slate-500" strokeWidth={2} />;
  }
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${estado === "ok" ? "bg-emerald-400" : "bg-rose-400"}`}
      aria-hidden="true"
    />
  );
}

export function Fontes({ varredura, executando, estadoFontes }: Props) {
  const resultados = new Map<string, ResultadoFonte>(varredura?.fontes.map((fonte) => [fonte.fonteId, fonte]) ?? []);
  const totalOk = varredura?.totais.fontesOk ?? 0;

  return (
    <aside className="cartao p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold text-slate-200">Fontes consultadas</h2>
        <span className="font-mono text-[10px] text-slate-500">
          {varredura ? `${totalOk}/${fontesAutomaticas.length} ok` : `${fontesAutomaticas.length} automáticas`}
        </span>
      </div>

      <ul className="mt-3 space-y-0.5">
        {fontesAutomaticas.map((fonte) => {
          const resultado = resultados.get(fonte.id);
          const estado = estadoFontes[fonte.id] ?? (resultado ? (resultado.ok ? "ok" : "erro") : undefined);
          const pendente = executando && estado === "pendente";

          return (
            <li key={fonte.id}>
              <a
                href={fonte.url}
                target="_blank"
                rel="noreferrer"
                title={resultado?.erro ?? `${fonte.nome} — ${resultado?.duracaoMs ?? "—"} ms`}
                className="group flex items-start gap-2.5 rounded-lg px-1.5 py-2 transition hover:bg-white/[0.04]"
              >
                <span className="mt-[5px] flex h-3 w-3 shrink-0 items-center justify-center">
                  {estado ? <Ponto estado={estado} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] text-slate-300 group-hover:text-slate-100">
                      {fonte.nome}
                    </span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 text-slate-600 opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-slate-500">
                    {pendente
                      ? "consultando…"
                      : resultado
                        ? resultado.ok
                          ? `${resultado.itens.length} ${resultado.itens.length === 1 ? "item" : "itens"} · ${resultado.duracaoMs} ms`
                          : (resultado.erro ?? "falhou")
                        : "aguardando varredura"}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[10px] uppercase tracking-[0.14em] text-slate-500">
        <Info className="h-3 w-3" strokeWidth={1.8} />
        Conferência manual
      </div>

      <div className="mt-2 space-y-3">
        {fontesManuais.map((fonte) => (
          <div key={fonte.id}>
            <a
              href={fonte.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-amber-300/90 hover:text-amber-200"
            >
              {fonte.nome}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{fonte.motivo}</p>
          </div>
        ))}
      </div>

      {varredura && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[10.5px] text-slate-500">
          <RefreshCw className="h-3 w-3" strokeWidth={1.8} />
          {varredura.totais.falhas === 0
            ? "Todas as fontes automáticas responderam."
            : `${varredura.totais.falhas} fonte(s) falharam nesta rodada.`}
        </div>
      )}
    </aside>
  );
}
