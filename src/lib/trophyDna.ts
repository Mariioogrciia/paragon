import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";

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

/**
 * % de afinidad de un juego de Descubrir con tu propio Trophy DNA — cruza
 * los géneros IGDB del juego con los ejes ya calculados por
 * `calcularTrophyDna` (mismo `valor` 0-100 que pinta el radar, no un
 * cálculo aparte). Un juego puede tocar varios ejes a la vez (p.ej. un RPG
 * de acción); se queda con el MÁS ALTO de los que coincidan, no una media
 * — "92% de afinidad" tiene que reflejar tu eje más fuerte que de verdad
 * aplica aquí, no diluirse por ejes que no tocan este juego.
 *
 * `null` (no un 0%) cuando no hay ningún eje con trofeos todavía (cuenta
 * recién empezada) o el juego no tiene géneros que crucen con ninguno de
 * los nuestros — un 0% sugeriría "sabemos que no te va a gustar", que es
 * un dato que no tenemos; lo honesto es no enseñar el badge en absoluto.
 */
export function calcularAfinidad(ejes: EjeDna[], genresJuego: string[]): number | null {
  if (genresJuego.length === 0) return null;
  const generoSet = new Set(genresJuego);

  let mejor: number | null = null;
  for (const eje of ejes) {
    if (eje.trofeos === 0) continue;
    const cat = CATEGORIAS_GENERO.find((c) => c.key === eje.key);
    if (!cat?.generos.some((g) => generoSet.has(g))) continue;
    if (mejor === null || eje.valor > mejor) mejor = eje.valor;
  }
  return mejor;
}

export interface EstiloDeCaza {
  nombre: string;
  descripcion: string;
}

/**
 * "Estilo de caza": a diferencia del arquetipo de `calcularTrophyDna` (QUÉ
 * géneros juegas), esto mide CÓMO cazas trofeos — cuánto terminas lo que
 * empiezas, cuántos juegos abarcas a la vez, cuánto te quedas en cada uno.
 * Ideas #Fase 3 del documento de diseño ("Explorador, Perfeccionista,
 * Competidor, Coleccionista, Maratonista"); se deja fuera "Competidor" —
 * mediría algo como la rareza media de tus trofeos o tu puesto en ligas, y
 * ninguno de los dos está disponible aquí sin una consulta aparte cara de
 * verdad (rareza) o datos que no tiene todo el mundo (ligas) — mejor no
 * inventarlo con lo que hay que dar un dato que no se puede sostener.
 *
 * Reglas en orden de prioridad (la primera que encaja gana) — pensadas para
 * que cada persona caiga en la que más la define, no la primera que toca
 * por casualidad:
 * 1. Maratonista: pocos juegos, pero muchísimas horas en cada uno.
 * 2. Perfeccionista: termina la mayoría de lo que empieza.
 * 3. Coleccionista: bibloteca grande, pocos terminados — le vale con tener
 *    trofeos de muchos sitios distintos.
 * 4. Trotamundos: mucha variedad de géneros distintos jugados de verdad
 *    (no solo comprados) — el "Explorador" del documento, renombrado para
 *    no chocar con "El Explorador" que ya usa `calcularTrophyDna` para el
 *    género Aventura (son cosas distintas, mismo nombre habría confundido
 *    los dos badges en la misma pantalla).
 * Si no encaja en ninguna o hay muy pocos juegos con progreso real (menos
 * de 3), no se fuerza un arquetipo — mismo criterio que `arquetipo: null`
 * de ahí arriba.
 */
export function calcularEstiloDeCaza(games: Game[]): EstiloDeCaza | null {
  const jugados = games.filter((g) => !g.isWishlist && g.earnedTotal > 0);
  if (jugados.length < 3) return null;

  const completados = jugados.filter(esPlatinoEquivalente).length;
  const tasaFinalizacion = completados / jugados.length;
  const minutosTotales = jugados.reduce((sum, g) => sum + (g.playtimeMinutes ?? 0), 0);
  const horasPorJuego = minutosTotales / 60 / jugados.length;
  const generosDistintos = new Set(jugados.flatMap((g) => g.genres ?? [])).size;

  if (horasPorJuego >= 30 && jugados.length <= 20) {
    return { nombre: "El Maratonista", descripcion: "Pocos juegos, pero te los agotas de verdad — te quedas en cada mundo hasta el final." };
  }
  if (tasaFinalizacion >= 0.5 && jugados.length >= 5) {
    return { nombre: "El Perfeccionista", descripcion: "Lo que empiezas, lo terminas — la mayoría de tu biblioteca está platinada o al 100%." };
  }
  if (jugados.length >= 25 && tasaFinalizacion < 0.2) {
    return { nombre: "El Coleccionista", descripcion: "Te vale con tener trofeos de muchos sitios distintos — no todos necesitan terminarse." };
  }
  if (generosDistintos >= 6) {
    return { nombre: "El Trotamundos", descripcion: "Saltas de género en género sin quedarte fijo en ninguno — variedad ante todo." };
  }
  return null;
}
