import { Loader2, RotateCw } from "lucide-react";

import { hora } from "../util/formato";

interface Props {
  executando: boolean;
  ultimaEm?: string;
  aoVarrer: () => void;
}

export function Cabecalho({ executando, ultimaEm, aoVarrer }: Props) {
  return (
    <header className="vidro sticky top-0 z-30 border-b border-white/[0.07]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <img
          src="logo.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 select-none"
          draggable={false}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-100">
              Varredura Mogi
            </h1>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:inline">
              concursos · processos seletivos
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            Mogi Mirim / SP
            {ultimaEm ? ` · última varredura às ${hora(ultimaEm)}` : " · nenhuma varredura ainda"}
          </p>
        </div>

        <button
          type="button"
          onClick={aoVarrer}
          disabled={executando}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-900 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
        >
          {executando ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <RotateCw className="h-4 w-4" strokeWidth={2} />
          )}
          <span className="hidden sm:inline">{executando ? "Varrendo…" : "Varrer agora"}</span>
          <span className="sm:hidden">{executando ? "…" : "Varrer"}</span>
        </button>
      </div>
    </header>
  );
}
