import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { executarVarredura } from "../core/scan";
import { fontesAutomaticas } from "../core/sources";
import type { Varredura } from "../core/types";
import { criarFetcher } from "../fetchers";
import { Cabecalho } from "./componentes/Cabecalho";
import { Fontes } from "./componentes/Fontes";
import { Historico } from "./componentes/Historico";
import { Indicadores } from "./componentes/Indicadores";
import { ListaItens } from "./componentes/ListaItens";
import { PainelVeredito } from "./componentes/PainelVeredito";
import { apagarHistorico, carregarHistorico, registrarVarredura, type RegistroHistorico } from "./historico";
import { resumoParaCopiar } from "./util/formato";

export function App() {
  const [varredura, setVarredura] = useState<Varredura | null>(null);
  const [executando, setExecutando] = useState(false);
  const [estadoFontes, setEstadoFontes] = useState<Record<string, "pendente" | "ok" | "erro">>({});
  const [erro, setErro] = useState<string | null>(null);
  const [historico, setHistorico] = useState<RegistroHistorico[]>(() => carregarHistorico());
  const [novosIds, setNovosIds] = useState<Set<string>>(() => new Set());
  const [copiado, setCopiado] = useState(false);

  const emExecucao = useRef(false);
  const timerCopiado = useRef<number | null>(null);

  const varrer = useCallback(async () => {
    if (emExecucao.current) return;
    emExecucao.current = true;
    setExecutando(true);
    setErro(null);
    setCopiado(false);
    setEstadoFontes(Object.fromEntries(fontesAutomaticas.map((fonte) => [fonte.id, "pendente" as const])));

    try {
      const resultado = await executarVarredura({
        fetcher: criarFetcher(),
        aoConcluirFonte: (fonte) => {
          setEstadoFontes((anterior) => ({ ...anterior, [fonte.fonteId]: fonte.ok ? "ok" : "erro" }));
        },
      });
      setVarredura(resultado);
      const registro = registrarVarredura(resultado);
      setHistorico(registro.registros);
      setNovosIds(new Set(registro.novos.map((item) => item.id)));
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível concluir a varredura. Verifique a conexão e tente de novo.",
      );
    } finally {
      setExecutando(false);
      emExecucao.current = false;
    }
  }, []);

  const primeiraVarredura = useRef(false);
  useEffect(() => {
    if (primeiraVarredura.current) return;
    primeiraVarredura.current = true;
    void varrer();
  }, [varrer]);

  useEffect(() => {
    return () => {
      if (timerCopiado.current) window.clearTimeout(timerCopiado.current);
    };
  }, []);

  const copiar = useCallback(async () => {
    if (!varredura) return;
    try {
      await navigator.clipboard.writeText(resumoParaCopiar(varredura));
      setCopiado(true);
      if (timerCopiado.current) window.clearTimeout(timerCopiado.current);
      timerCopiado.current = window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      setErro("Não foi possível copiar o resumo neste aparelho.");
    }
  }, [varredura]);

  const limparHistorico = useCallback(() => {
    if (!window.confirm("Apagar o histórico de varreduras deste aparelho?")) return;
    apagarHistorico();
    setHistorico([]);
    setNovosIds(new Set());
  }, []);

  const concluidas = Object.values(estadoFontes).filter((estado) => estado !== "pendente").length;

  return (
    <div className="relative min-h-screen">
      <div className="fundo-tecnico pointer-events-none fixed inset-0" aria-hidden="true" />

      <div className="relative">
        <Cabecalho executando={executando} ultimaEm={varredura?.iniciadaEm} aoVarrer={varrer} />

        <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-6 lg:px-8">
          {erro && (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-3.5 py-3 text-[12px] text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
              <p className="flex-1 leading-relaxed">{erro}</p>
              <button
                type="button"
                onClick={() => setErro(null)}
                className="rounded p-0.5 text-rose-300/70 transition hover:bg-white/[0.06] hover:text-rose-100"
                aria-label="Fechar aviso"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <PainelVeredito
            varredura={varredura}
            executando={executando}
            concluidas={concluidas}
            totalFontes={fontesAutomaticas.length}
            novos={novosIds.size}
            copiado={copiado}
            aoVarrer={varrer}
            aoCopiar={copiar}
          />

          <div className="mt-3">
            <Indicadores varredura={varredura} executando={executando} />
          </div>

          <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_296px]">
            <ListaItens varredura={varredura} executando={executando} novosIds={novosIds} />

            <div className="space-y-3">
              <Fontes varredura={varredura} executando={executando} estadoFontes={estadoFontes} />
              <Historico registros={historico} aoLimpar={limparHistorico} />
            </div>
          </div>

          <footer className="mt-8 flex flex-col gap-1 border-t border-white/[0.06] pt-4 text-[10.5px] leading-relaxed text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Ferramenta pessoal e independente, sem vínculo com Prefeitura, IBAM, SAAE, CEMMIL, Con8 ou PCI.
              Confirme sempre no edital oficial.
            </p>
            <p className="shrink-0 font-mono uppercase tracking-[0.12em]">v0.1 · leitura ao vivo</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
