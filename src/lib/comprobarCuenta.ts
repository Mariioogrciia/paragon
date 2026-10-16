/**
 * Lo que el asistente de vincular (16 oct 2026) le enseña a quien comprueba
 * una cuenta: la parte pura, aparte de lib/diagnosticoCuenta.ts para poder
 * probarla sin red.
 *
 * Cada plataforma tiene sus ajustes que deciden si se puede leer:
 * - PSN: que la cuenta exista y que sus trofeos se vean (en público).
 * - Steam: el perfil en público Y "Detalles del juego" en público (el que
 *   casi todo el mundo se salta).
 * - Xbox: que el historial de logros se vea.
 */

export type PlataformaAsistente = "psn" | "steam" | "xbox";

export const PLATAFORMAS_ASISTENTE: readonly PlataformaAsistente[] = ["psn", "steam", "xbox"];

export function esPlataformaAsistente(valor: unknown): valor is PlataformaAsistente {
  return typeof valor === "string" && (PLATAFORMAS_ASISTENTE as readonly string[]).includes(valor);
}

/** Cada fila de la lista: `encontrada` siempre va primero; el resto, según la plataforma. */
export type ClaveComprobacion = "encontrada" | "libre" | "perfilPublico" | "detallesJuego" | "trofeosVisibles" | "logrosVisibles";

export interface Comprobacion {
  clave: ClaveComprobacion;
  ok: boolean;
}

export interface Diagnostico {
  platform: PlataformaAsistente;
  accountId: string;
  username: string;
  avatarUrl: string | null;
  comprobaciones: Comprobacion[];
  /** Todo en verde: al vincular, la biblioteca se llenará. */
  listo: boolean;
  /** La cuenta ya es de otro usuario de Paragon: no se puede vincular. */
  bloqueada: boolean;
}

/** Lo que se sabe de la plataforma, ya leído; aquí solo se ordena y se decide. */
export interface Lectura {
  accountId: string;
  username: string;
  avatarUrl: string | null;
  /** Steam: perfil público. En las otras no aplica. */
  perfilPublico?: boolean;
  /** Se puede leer la biblioteca / los trofeos / los logros. */
  legible: boolean;
  /** Ya la tiene vinculada otro usuario de Paragon. */
  deOtro: boolean;
}

export function armarDiagnostico(platform: PlataformaAsistente, lectura: Lectura): Diagnostico {
  const comprobaciones: Comprobacion[] = [{ clave: "encontrada", ok: true }];
  if (lectura.deOtro) comprobaciones.push({ clave: "libre", ok: false });

  if (platform === "steam") {
    const perfil = lectura.perfilPublico ?? lectura.legible;
    comprobaciones.push({ clave: "perfilPublico", ok: perfil });
    // Con el perfil privado Steam no deja ver nada más: "Detalles del juego"
    // sale en rojo también, que es lo que habrá que tocar después.
    comprobaciones.push({ clave: "detallesJuego", ok: perfil && lectura.legible });
  } else if (platform === "psn") {
    comprobaciones.push({ clave: "trofeosVisibles", ok: lectura.legible });
  } else {
    comprobaciones.push({ clave: "logrosVisibles", ok: lectura.legible });
  }

  return {
    platform,
    accountId: lectura.accountId,
    username: lectura.username,
    avatarUrl: lectura.avatarUrl,
    comprobaciones,
    listo: comprobaciones.every((c) => c.ok),
    bloqueada: lectura.deOtro,
  };
}
