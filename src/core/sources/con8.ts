/**
 * Con8 — portal do CIS 8 de Abril.
 *
 * O GET abre normalmente, mas a consulta de situação usa POST em JSF e cai
 * em um desafio do Cloudflare. Automatizar isso seria frágil (e desrespeitoso
 * com o site), então a fonte fica como link manual: ela não entra no veredito.
 */

import type { FonteManual } from "../types";

export const con8: FonteManual = {
  id: "con8",
  nome: "Con8 / CIS 8 de Abril",
  url: "https://www.con8.org.br/paginas/portal/concursos/situacao?tipo=2",
  papel: "manual",
  motivo:
    "A consulta de situação exige um desafio anti-bot (Cloudflare) que não é confiável de automatizar. Abra o link e confira manualmente.",
};

export const fontesManuais: readonly FonteManual[] = [con8];
