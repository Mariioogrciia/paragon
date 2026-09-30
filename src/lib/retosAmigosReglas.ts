/** Reglas de los retos entre amigos, sin base de datos (servidor, formulario y tests). */

export const DURACIONES_RETO = [7, 14, 30] as const;
export const MAX_INVITADOS_RETO = 8;
/** Retos en marcha creados por la misma persona a la vez. */
export const MAX_RETOS_ABIERTOS = 3;

/** Quién gana: el máximo de trofeos, con empate compartido. A cero no gana nadie. */
export function ganadoresReto(resultados: { userId: string; trofeos: number }[]): string[] {
  const maximo = Math.max(0, ...resultados.map((r) => r.trofeos));
  if (maximo === 0) return [];
  return resultados.filter((r) => r.trofeos === maximo).map((r) => r.userId);
}
