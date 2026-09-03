import type { Trophy } from "@/lib/types";

/**
 * Dificultad estimada del platino.
 *
 * Sale de la rareza que ya guardamos en cada trofeo: el porcentaje de
 * jugadores DEL JUEGO que lo tienen. El platino es la mejor señal, porque
 * resume el juego entero en un número; si no hay platino (Steam), se usa el
 * logro más raro.
 *
 * Qué NO es: una medida de habilidad. La rareza mezcla tres cosas — lo difícil
 * que es, lo largo que es y cuánta gente abandona el juego a la media hora.
 * Un platino de 100 horas fáciles puede ser más raro que uno de 10 horas
 * imposibles. Por eso se llama "estimada" en la interfaz y se enseña siempre
 * el porcentaje al lado: el dato crudo no engaña a nadie, la etiqueta sola sí
 * podría.
 */

export interface Dificultad {
  /** 1 (regalado) a 6 (brutal). Para ordenar y para pintar. */
  nivel: 1 | 2 | 3 | 4 | 5 | 6;
  etiqueta: string;
  color: string;
  /** % de jugadores del juego que tienen el platino (o el logro más raro). */
  rareza: number;
  /** Si el número sale del platino de verdad o de un logro suelto. */
  desdePlatino: boolean;
}

/**
 * Los cortes siguen la escala de rareza de PSN (ultra raro por debajo del 5%),
 * partida en dos por arriba y por abajo para que no acabe todo en el mismo
 * saco: en una biblioteca normal, la mitad de los platinos caen bajo el 5%.
 */
const ESCALA: { max: number; nivel: Dificultad["nivel"]; etiqueta: string; color: string }[] = [
  { max: 0.5, nivel: 6, etiqueta: "Brutal", color: "#c0392b" },
  { max: 2, nivel: 5, etiqueta: "Muy difícil", color: "#d35400" },
  { max: 5, nivel: 4, etiqueta: "Difícil", color: "#c99a2e" },
  { max: 15, nivel: 3, etiqueta: "Media", color: "#4e9f6d" },
  { max: 30, nivel: 2, etiqueta: "Fácil", color: "#3d8f5f" },
  { max: 101, nivel: 1, etiqueta: "Muy fácil", color: "#2f7d55" },
];

export function dificultadDesdeRareza(rareza: number, desdePlatino: boolean): Dificultad {
  const tramo = ESCALA.find((e) => rareza < e.max) ?? ESCALA[ESCALA.length - 1];

  return {
    nivel: tramo.nivel,
    etiqueta: tramo.etiqueta,
    color: tramo.color,
    rareza,
    desdePlatino,
  };
}

/** Dificultad de un juego a partir de su lista de trofeos. */
export function dificultadDeJuego(trophies: Trophy[]): Dificultad | null {
  const conRareza = trophies.filter((t) => t.rarityPercent !== undefined);
  if (conRareza.length === 0) return null;

  const platino = conRareza.find((t) => t.grade === "platinum");
  if (platino) return dificultadDesdeRareza(platino.rarityPercent!, true);

  // Sin platino, el logro más raro es lo más parecido a "rematar el juego".
  const masRaro = conRareza.reduce((a, b) =>
    (b.rarityPercent ?? 100) < (a.rarityPercent ?? 100) ? b : a,
  );

  return dificultadDesdeRareza(masRaro.rarityPercent!, false);
}
