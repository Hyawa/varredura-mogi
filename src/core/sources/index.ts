/**
 * Catálogo de fontes.
 *
 * As automáticas entram no veredito. As manuais aparecem na interface como
 * link, com o motivo de não serem automatizadas — nunca como "NÃO".
 */

import type { FonteAutomatica, FonteManual } from "../types";
import { cemmil } from "./cemmil";
import { fontesManuais } from "./con8";
import { ibam } from "./ibam";
import { pci } from "./pci";
import { prefeitura } from "./prefeitura";
import { saae } from "./saae";
import { sigmarh } from "./sigmarh";

export const fontesAutomaticas: readonly FonteAutomatica[] = [
  prefeitura,
  ibam,
  saae,
  sigmarh,
  cemmil,
  pci,
];

export { fontesManuais };
export type { FonteAutomatica, FonteManual };
