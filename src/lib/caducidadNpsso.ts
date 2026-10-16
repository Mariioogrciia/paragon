/**
 * Cuándo avisar de que el NPSSO del servidor (`PSN_NPSSO`) caduca — la parte
 * pura de lib/credencialPsn.ts, aparte para poder probarla sin base ni red.
 *
 * Sony no dice cuándo caduca un NPSSO; la comunidad (y la experiencia aquí)
 * dice que dura unos 2 meses. Así que se cuenta desde la primera vez que el
 * servidor lo vio funcionar y se avisa una semana antes de los 60 días; si
 * falla antes, se avisa en el momento, una vez al día como mucho.
 */

export const DIAS_VIDA_NPSSO = 60;
export const DIAS_AVISO_ANTES = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

export type AvisoNpsso =
  | { tipo: "falta"; clave: string }
  | { tipo: "caducado"; clave: string }
  | { tipo: "pronto"; clave: string; diasRestantes: number };

/** "2026-10-16": un aviso de fallo por día, como mucho. */
function claveDia(ahora: Date): string {
  return ahora.toISOString().slice(0, 10);
}

/**
 * Qué aviso toca ahora (o ninguno). `huella` identifica el NPSSO en uso sin
 * guardarlo (un hash corto); `vistoDesde` es cuándo funcionó por primera vez.
 */
export function avisoNpsso(estado: {
  configurado: boolean;
  falla: boolean;
  huella: string | null;
  vistoDesde: Date | null;
  ahora: Date;
}): AvisoNpsso | null {
  const { configurado, falla, huella, vistoDesde, ahora } = estado;
  if (!configurado) return { tipo: "falta", clave: `falta-${claveDia(ahora)}` };
  if (falla) return { tipo: "caducado", clave: `caducado-${huella}-${claveDia(ahora)}` };
  if (!vistoDesde) return null;
  const restantes = diasRestantesNpsso(vistoDesde, ahora);
  if (restantes > DIAS_AVISO_ANTES) return null;
  // Un solo aviso de "caduca pronto" por NPSSO; si llega a fallar, ya avisa "caducado".
  return { tipo: "pronto", clave: `pronto-${huella}`, diasRestantes: restantes };
}

/** Días que le quedan (aprox.) a un NPSSO que funciona desde `vistoDesde`; nunca menos de 0. */
export function diasRestantesNpsso(vistoDesde: Date, ahora: Date): number {
  const usados = Math.floor((ahora.getTime() - vistoDesde.getTime()) / DIA_MS);
  return Math.max(DIAS_VIDA_NPSSO - usados, 0);
}
