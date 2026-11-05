/**
 * Reglas puras del ranking de platinos más rápidos (lib/platinoRapido.ts),
 * aparte para probarlas sin base: `tests/platinoRapido.test.ts`.
 */

/** Por debajo de esto no es una marca: son trofeos importados de golpe o un reloj roto. */
export const DURACION_MINIMA_MS = 10 * 60 * 1000;

/** Milisegundos entre el primer trofeo y el platino, o `null` si no vale como marca. */
export function duracionPlatino(inicio: string | null, fin: string | null): number | null {
  if (!inicio || !fin) return null;
  const a = Date.parse(inicio);
  const b = Date.parse(fin);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const d = b - a;
  return d >= DURACION_MINIMA_MS ? d : null;
}

/** "3 d 4 h", "5 h 12 min", "42 min" — corto y sin depender del idioma salvo las unidades. */
export function duracionLegible(ms: number, unidades: { d: string; h: string; min: string }): string {
  const minutos = Math.round(ms / 60_000);
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const resto = minutos % 60;
  if (dias > 0) return horas > 0 ? `${dias} ${unidades.d} ${horas} ${unidades.h}` : `${dias} ${unidades.d}`;
  if (horas > 0) return resto > 0 ? `${horas} ${unidades.h} ${resto} ${unidades.min}` : `${horas} ${unidades.h}`;
  return `${resto} ${unidades.min}`;
}
