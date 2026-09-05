import type { Trophy } from "@/lib/types";

/**
 * Dificultad estimada del platino.
 *
 * Sale de la rareza que ya guardamos en cada trofeo: el porcentaje de
 * jugadores DEL JUEGO que lo tienen. El platino es la mejor señal, porque
 * resume el juego entero en un número; si no hay platino (Steam), se usa el
 * logro más raro.
 *
 * Escala 1-10 (antes 1-6): se probó sacarla de una API o por scraping —
 * PSNProfiles, la referencia real de "dificultad sobre 10" entre cazadores
 * de trofeos, es la fuente obvia, pero está detrás de un reto de Cloudflare
 * ("Just a moment...", comprobado a mano el 5 de septiembre de 2026) igual
 * que ya bloqueó el scraping de Epic/DuckDuckGo/Bing en sesiones
 * anteriores — no hay forma de leerla con una petición de servidor normal,
 * y montar un navegador headless completo para esto es el mismo "pesado,
 * frágil, se rompe sin avisar" que ya se descartó para los logros de Epic.
 * En vez de eso, se reparte la MISMA rareza real (dato nuestro, no
 * inventado) en 10 tramos en lugar de 6, para que se pueda enseñar como
 * "7/10" igual que esas webs, sin depender de terceros.
 *
 * Qué NO es: una medida de habilidad. La rareza mezcla tres cosas — lo difícil
 * que es, lo largo que es y cuánta gente abandona el juego a la media hora.
 * Un platino de 100 horas fáciles puede ser más raro que uno de 10 horas
 * imposibles. Por eso se llama "estimada" en la interfaz y se enseña siempre
 * el porcentaje al lado: el dato crudo no engaña a nadie, la etiqueta sola sí
 * podría.
 */

export interface Dificultad {
  /** 1 (regalado) a 10 (brutal). Para ordenar, filtrar y pintar. */
  nivel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  etiqueta: string;
  color: string;
  /** % de jugadores del juego que tienen el platino (o el logro más raro). */
  rareza: number;
  /** Si el número sale del platino de verdad o de un logro suelto. */
  desdePlatino: boolean;
}

/**
 * Los cortes siguen la escala de rareza de PSN (ultra raro por debajo del 5%),
 * con más tramos por debajo del 10% que por arriba: en una biblioteca normal
 * la mitad de los platinos caen ahí, y con solo 6 tramos se apelotonaban
 * todos en "difícil"/"muy difícil" sin distinguirse entre sí.
 */
const ESCALA: { max: number; nivel: Dificultad["nivel"]; etiqueta: string; color: string }[] = [
  { max: 0.3, nivel: 10, etiqueta: "Brutal", color: "#c0392b" },
  { max: 0.75, nivel: 9, etiqueta: "Brutal", color: "#c8492e" },
  { max: 1.5, nivel: 8, etiqueta: "Muy difícil", color: "#d35400" },
  { max: 3, nivel: 7, etiqueta: "Muy difícil", color: "#cf6a1a" },
  { max: 6, nivel: 6, etiqueta: "Difícil", color: "#c99a2e" },
  { max: 10, nivel: 5, etiqueta: "Difícil", color: "#b8a53a" },
  { max: 18, nivel: 4, etiqueta: "Media", color: "#8fa347" },
  { max: 30, nivel: 3, etiqueta: "Media", color: "#6a9c56" },
  { max: 50, nivel: 2, etiqueta: "Fácil", color: "#4e9f6d" },
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
