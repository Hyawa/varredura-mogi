import { History, Trash2 } from "lucide-react";

import type { RegistroHistorico } from "../historico";
import { hora } from "../util/formato";

interface Props {
  registros: RegistroHistorico[];
  aoLimpar: () => void;
}

export function Historico({ registros, aoLimpar }: Props) {
  const amostra = [...registros].slice(0, 18).reverse();
  const hoje = new Date().toDateString();
  const deHoje = registros.filter((registro) => new Date(registro.em).toDateString() === hoje).length;

  return (
    <section className="cartao p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-200">
          <History className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.8} />
          Histórico
        </h2>
        {registros.length > 0 && (
          <button
            type="button"
            onClick={aoLimpar}
            className="rounded-md p-1 text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-300"
            aria-label="Limpar histórico"
            title="Limpar histórico"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {registros.length === 0 ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
          As varreduras ficam salvas só neste aparelho. Assim o app avisa quando aparece algo novo.
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-11 items-end gap-[3px]" aria-hidden="true">
            {amostra.map((registro) => {
              const altura = 10 + Math.min(30, registro.abertos * 9);
              const cor =
                registro.abertos > 0
                  ? "bg-emerald-400/80"
                  : registro.veredito === "INDETERMINADO"
                    ? "bg-amber-400/70"
                    : "bg-slate-600/80";
              return (
                <div
                  key={registro.em}
                  className={`flex-1 rounded-sm ${cor}`}
                  style={{ height: `${altura}px` }}
                  title={`${hora(registro.em)} · ${registro.veredito} · ${registro.abertos} aberto(s)`}
                />
              );
            })}
          </div>

          <p className="mt-2 text-[10.5px] text-slate-500">
            {registros.length} {registros.length === 1 ? "varredura" : "varreduras"} salvas
            {deHoje > 0 ? ` · ${deHoje} hoje` : ""}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-2.5 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" /> aberto
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" /> indeterminado
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" /> nada aberto
            </span>
          </div>
        </>
      )}
    </section>
  );
}
