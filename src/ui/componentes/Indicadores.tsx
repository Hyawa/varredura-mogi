import { Activity, Archive, CalendarCheck, Wifi, WifiOff } from "lucide-react";

import type { Varredura } from "../../core/types";
import { plural } from "../util/formato";

interface Props {
  varredura: Varredura | null;
  executando: boolean;
}

function Esqueleto() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((indice) => (
        <div key={indice} className="cartao animate-pulse p-4">
          <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
          <div className="mt-4 h-7 w-10 rounded bg-white/[0.07]" />
          <div className="mt-2 h-2 w-24 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

export function Indicadores({ varredura, executando }: Props) {
  if (!varredura) return <Esqueleto />;

  const { totais } = varredura;
  const todasOk = totais.falhas === 0;

  return (
    <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${executando ? "opacity-60" : ""} transition-opacity`}>
      <Cartao
        rotulo="Inscrições abertas"
        valor={String(totais.abertos)}
        nota={totais.abertos > 0 ? "dá para se inscrever agora" : "nenhuma janela aberta"}
        icone={<CalendarCheck className="h-4 w-4" strokeWidth={1.8} />}
        cor={totais.abertos > 0 ? "text-emerald-400" : "text-slate-200"}
        detalhe={totais.abertos > 0 ? "border-emerald-500/20" : undefined}
      />
      <Cartao
        rotulo="Em andamento"
        valor={String(totais.andamento)}
        nota={totais.andamento > 0 ? "inscrições não confirmadas" : "nada em andamento"}
        icone={<Activity className="h-4 w-4" strokeWidth={1.8} />}
        cor={totais.andamento > 0 ? "text-amber-400" : "text-slate-200"}
      />
      <Cartao
        rotulo="Fontes OK"
        valor={`${totais.fontesOk}/${totais.fontes}`}
        nota={todasOk ? "todas responderam" : plural(totais.falhas, "falha", "falhas")}
        icone={todasOk ? <Wifi className="h-4 w-4" strokeWidth={1.8} /> : <WifiOff className="h-4 w-4" strokeWidth={1.8} />}
        cor={todasOk ? "text-slate-200" : "text-rose-400"}
        detalhe={todasOk ? undefined : "border-rose-500/20"}
      />
      <Cartao
        rotulo="Encerrados recentes"
        valor={String(totais.encerrados)}
        nota="para consulta de histórico"
        icone={<Archive className="h-4 w-4" strokeWidth={1.8} />}
        cor="text-slate-200"
      />
    </div>
  );
}

function Cartao({
  rotulo,
  valor,
  nota,
  icone,
  cor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  icone: React.ReactNode;
  cor: string;
  detalhe?: string;
}) {
  return (
    <div className={`cartao p-4 ${detalhe ?? ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{rotulo}</p>
        <span className="text-slate-600">{icone}</span>
      </div>
      <p className={`mt-3 font-mono text-3xl font-medium leading-none ${cor}`}>{valor}</p>
      <p className="mt-1.5 text-[11px] text-slate-500">{nota}</p>
    </div>
  );
}
