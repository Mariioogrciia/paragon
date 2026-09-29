/**
 * Reglas del Pase de Temporada, puras (sin base de datos) para poder usarlas
 * en cliente y probarlas (tests/temporada.test.ts). Los datos: lib/temporadas.ts.
 *
 *   - Temporada = trimestre natural, en hora UTC ("2026-T4" = oct-dic).
 *   - Puntos = los de las ligas: platino 100, oro 50, plata 25, resto 10.
 *   - Nivel = 1 cada PUNTOS_POR_NIVEL, hasta NIVEL_MAXIMO.
 *   - Medallas (cosméticas) al llegar a ciertos niveles.
 */

export const PUNTOS_POR_NIVEL = 250;
export const NIVEL_MAXIMO = 50;

export const MEDALLAS = [
  { nivel: 5, clave: "bronce", emoji: "🥉", color: "#c07b4a" },
  { nivel: 15, clave: "plata", emoji: "🥈", color: "#b9c2cc" },
  { nivel: 30, clave: "oro", emoji: "🥇", color: "#e2b53e" },
  { nivel: 50, clave: "platino", emoji: "💎", color: "#9fd4ec" },
] as const;

export type Medalla = (typeof MEDALLAS)[number];

export interface Temporada {
  clave: string;
  anio: number;
  trimestre: 1 | 2 | 3 | 4;
  inicio: Date;
  /** Exclusivo: el primer instante de la temporada siguiente. */
  fin: Date;
}

export function temporadaDe(fecha: Date): Temporada {
  const anio = fecha.getUTCFullYear();
  const trimestre = (Math.floor(fecha.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const inicio = new Date(Date.UTC(anio, (trimestre - 1) * 3, 1));
  const fin = new Date(Date.UTC(anio, trimestre * 3, 1));
  return { clave: `${anio}-T${trimestre}`, anio, trimestre, inicio, fin };
}

export function temporadaAnterior(fecha: Date): Temporada {
  const actual = temporadaDe(fecha);
  return temporadaDe(new Date(actual.inicio.getTime() - 1));
}

export function nivelDe(puntos: number): number {
  return Math.min(NIVEL_MAXIMO, Math.floor(Math.max(0, puntos) / PUNTOS_POR_NIVEL));
}

/** Puntos que faltan para el siguiente nivel (0 en el máximo). */
export function faltanParaSiguiente(puntos: number): number {
  const nivel = nivelDe(puntos);
  return nivel >= NIVEL_MAXIMO ? 0 : (nivel + 1) * PUNTOS_POR_NIVEL - puntos;
}

/** La mejor medalla conseguida con ese nivel, o `null`. */
export function medallaDe(nivel: number): Medalla | null {
  let mejor: Medalla | null = null;
  for (const m of MEDALLAS) if (nivel >= m.nivel) mejor = m;
  return mejor;
}
