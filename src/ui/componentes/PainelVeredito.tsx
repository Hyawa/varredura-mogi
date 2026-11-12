import { Check, Copy, Loader2, RotateCw } from "lucide-react";

import type { Varredura } from "../../core/types";
import { dataCurta, duracao, fraseVeredito, ROTULO_VEREDITO } from "../util/formato";

interface Props {
  varredura: Varredura | null;
  executando: boolean;
  concluidas: number;
  totalFontes: number;
  novos: number;
  copiado: boolean;
  aoVarrer: () => void;
  aoCopiar: () => void;
}

const CORES = {
  SIM: {
    texto: "text-emerald-400",
    borda: "border-emerald-500/25",
    brilho: "rgba(34, 197, 94, 0.10)",
    rail: "bg-emerald-400",
  },
  NAO: {
    texto: "text-slate-100",
    borda: "border-white/10",
    brilho: "rgba(148, 163, 184, 0.06)",
    rail: "bg-slate-400",
  },
  INDETERMINADO: {
    texto: "text-amber-400",
    borda: "border-amber-500/25",
    brilho: "rgba(245, 158, 11, 0.10)",
    rail: "bg-amber-400",
  },
} as const;

function Radar({
  veredito,
  executando,
  concluidas,
  total,
  abertos,
}: {
  veredito: Varredura["veredito"] | null;
  executando: boolean;
  concluidas: number;
  total: number;
  abertos: number;
}) {
  const cor =
    veredito === "SIM" ? "text-emerald-400" : veredito === "INDETERMINADO" ? "text-amber-400" : "text-slate-200";

  return (
    <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center sm:h-44 sm:w-44">
      <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
      <div className="absolute inset-[18px] rounded-full border border-white/[0.06]" />
      <div className="absolute inset-[38px] rounded-full border border-white/[0.05]" />
      <div className={`radar absolute inset-0 rounded-full ${executando ? "" : "radar-parado"}`} />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.035]" />
      <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white/[0.035]" />

      <div className="relative text-center">
        {executando ? (
          <>
            <div className="flex items-center justify-center gap-1.5 font-mono text-3xl font-medium text-slate-200">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              {concluidas}/{total}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">fontes</p>
          </>
        ) : (
          <>
            <div className={`font-mono text-4xl font-medium ${cor}`}>{abertos}</div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {abertas_rotulo(abertos)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function abertas_rotulo(abertos: number): string {
  return abertos === 1 ? "aberta" : "abertas";
}

export function PainelVeredito({
  varredura,
  executando,
  concluidas,
  totalFontes,
  novos,
  copiado,
  aoVarrer,
  aoCopiar,
}: Props) {
  const cores = varredura ? CORES[varredura.veredito] : CORES.NAO;
  const rotulo = varredura ? ROTULO_VEREDITO[varredura.veredito] : "—";

  return (
    <section
      className={`cartao relative overflow-hidden ${cores.borda}`}
      style={{
        backgroundImage: `radial-gradient(760px 320px at 82% 0%, ${cores.brilho}, transparent 62%), linear-gradient(180deg, rgba(27,35,54,.95), rgba(21,29,46,.92))`,
      }}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${cores.rail} opacity-80`} />

      <div className="flex flex-col gap-7 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-500" />
            Resultado da varredura
            {varredura && <span className="text-slate-600">·</span>}
            {varredura && <span className="font-mono tracking-normal text-slate-500">{dataCurta(varredura.iniciadaEm)}</span>}
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className={`font-mono text-5xl font-semibold leading-none tracking-tight sm:text-6xl ${cores.texto}`}>
              {executando && !varredura ? "…" : rotulo}
            </h2>
            {varredura && !executando && (
              <span className="mb-1 rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
                {varredura.hoje.split("-").reverse().join("/")}
              </span>
            )}
          </div>

          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-300">
            {executando && !varredura ? "Consultando as fontes oficiais. Isso leva alguns segundos." : varredura ? fraseVeredito(varredura) : "Clique em “Varrer agora” para consultar as fontes."}
          </p>

          {varredura && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{varredura.motivo}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={aoVarrer}
              disabled={executando}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {executando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
              {executando ? "Varrendo…" : "Varrer novamente"}
            </button>

            <button
              type="button"
              onClick={aoCopiar}
              disabled={!varredura}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-40"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar resumo"}
            </button>

            {novos > 0 && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-300">
                +{novos} {novos === 1 ? "novo" : "novos"} desde a última
              </span>
            )}
          </div>
        </div>

        <Radar
          veredito={varredura?.veredito ?? null}
          executando={executando}
          concluidas={concluidas}
          total={totalFontes}
          abertos={varredura?.totais.abertos ?? 0}
        />
      </div>

      {varredura && (
        <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.04] sm:grid-cols-4">
          <Metrica rotulo="Fontes responderam" valor={`${varredura.totais.fontesOk}/${varredura.totais.fontes}`} />
          <Metrica rotulo="Tempo de varredura" valor={duracao(varredura.duracaoMs)} />
          <Metrica rotulo="Inscrições abertas" valor={String(varredura.totais.abertos)} destaque={varredura.totais.abertos > 0} />
          <Metrica
            rotulo="Em andamento"
            valor={String(varredura.totais.andamento)}
            nota={varredura.totais.futuros > 0 ? `+${varredura.totais.futuros} em breve` : undefined}
          />
        </div>
      )}
    </section>
  );
}

function Metrica({ rotulo, valor, destaque, nota }: { rotulo: string; valor: string; destaque?: boolean; nota?: string }) {
  return (
    <div className="bg-[#131c2d] px-4 py-3 first:rounded-bl-[18px] last:rounded-br-[18px]">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{rotulo}</p>
      <p className={`mt-1 font-mono text-lg ${destaque ? "text-emerald-400" : "text-slate-200"}`}>
        {valor}
        {nota && <span className="ml-1.5 text-[10px] text-slate-500">{nota}</span>}
      </p>
    </div>
  );
}
