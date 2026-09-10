import type { Game } from "@/lib/types";

/**
 * Trophy DNA: en qué géneros se te han ido de verdad los trofeos, no la
 * biblioteca entera (un juego comprado y sin tocar no dice nada de ti). Los
 * ejes son categorías propias, mapeadas a los géneros reales que da IGDB
 * (`games.genres`) — no existe un género "souls-like" ni "sigilo" en la
 * taxonomía de IGDB, así que esos dos de la idea original se han dejado
 * fuera en vez de inventar una detección que adivinaría mal la mitad de
 * las veces (mismo criterio que ya se aplicó descartando la heurística de
 * subtítulos de PowerPyx).
 */
export const CATEGORIAS_GENERO = [
  { key: "accion", label: "Acción", generos: ["Shooter", "Fighting", "Hack and slash/Beat 'em up", "Arcade"] },
  { key: "rpg", label: "RPG", generos: ["Role-playing (RPG)", "MOBA"] },
  { key: "aventura", label: "Aventura", generos: ["Adventure", "Point-and-click", "Visual Novel"] },
  { key: "estrategia", label: "Estrategia", generos: ["Strategy", "Tactical", "Turn-based strategy (TBS)", "Real Time Strategy (RTS)"] },
  { key: "plataformas", label: "Plataformas", generos: ["Platform"] },
  { key: "puzles", label: "Puzles", generos: ["Puzzle", "Card & Board Game", "Quiz/Trivia"] },
  { key: "deportes", label: "Deportes", generos: ["Sport", "Racing", "Pinball"] },
] as const;

export type CategoriaDna = (typeof CATEGORIAS_GENERO)[number]["key"];

const ARQUETIPOS: Record<CategoriaDna, string> = {
  accion: "El Adrenalínico",
  rpg: "El Especialista en RPGs",
  aventura: "El Explorador",
  estrategia: "El Estratega de Sillón",
  plataformas: "El Saltarín de Precisión",
  puzles: "El Resolvedor de Puzles",
  deportes: "El Deportista de Sofá",
};

export interface EjeDna {
  key: CategoriaDna;
  label: string;
  /** 0-100, normalizado contra el eje más fuerte — así el más jugado siempre llega al borde del radar. */
  valor: number;
  trofeos: number;
}

export interface TrophyDna {
  ejes: EjeDna[];
  arquetipo: string | null;
}

/**
 * Pesa por TROFEOS GANADOS (no por juegos ni por horas): un juego de 60h a
 * medias pesa lo mismo que uno corto ya terminado si has sacado los mismos
 * trofeos de cada uno, que es justo lo que "Trophy DNA" quiere medir — dónde
 * se te han ido los trofeos, no dónde se te ha ido el tiempo (eso ya lo
 * enseña `PlaytimeBarChart`). Un juego con varios géneros suma su peso
 * entero a cada categoría que le toque — la suma de los ejes puede superar
 * el total de trofeos, y es intencional: "Elden Ring" es Acción Y RPG a la
 * vez, no hay que elegir una.
 */
export function calcularTrophyDna(games: Game[]): TrophyDna {
  const pesos = new Map<CategoriaDna, number>(CATEGORIAS_GENERO.map((c) => [c.key, 0]));

  for (const g of games) {
    if (g.isWishlist || g.earnedTotal === 0 || !g.genres?.length) continue;
    for (const cat of CATEGORIAS_GENERO) {
      if (cat.generos.some((genero) => g.genres!.includes(genero))) {
        pesos.set(cat.key, (pesos.get(cat.key) ?? 0) + g.earnedTotal);
      }
    }
  }

  const max = Math.max(...pesos.values(), 0);
  const ejes: EjeDna[] = CATEGORIAS_GENERO.map((c) => ({
    key: c.key,
    label: c.label,
    trofeos: pesos.get(c.key) ?? 0,
    valor: max > 0 ? Math.round(((pesos.get(c.key) ?? 0) / max) * 100) : 0,
  }));

  const top = ejes.reduce((a, b) => (b.trofeos > a.trofeos ? b : a), ejes[0]);
  const arquetipo = top.trofeos > 0 ? ARQUETIPOS[top.key] : null;

  return { ejes, arquetipo };
}
