import type { TrophyGrade } from "@/lib/types";

/**
 * Constantes visuales compartidas por las tarjetas de juego y trofeo.
 *
 * Los degradados están calcados de la maqueta: cada metal tiene su propia
 * rampa de color en vez de un color plano, y las carátulas sin icono caen en
 * una de doce combinaciones fijas elegidas por el id del juego, para que la
 * biblioteca no se vea con un mismo cuadrado gris repetido.
 */
export const GRADE_TILE: Record<TrophyGrade, string> = {
  platinum: "linear-gradient(150deg, #dff0f8, #7fbcd8 60%, #3f7d99)",
  gold: "linear-gradient(150deg, #f7e3a8, #e2b53e 60%, #9a7716)",
  silver: "linear-gradient(150deg, #eef1f4, #b9c2cc 60%, #7c8794)",
  bronze: "linear-gradient(150deg, #e8b98e, #c07b4a 60%, #8a5327)",
};

/**
 * Las plataformas sin metales (Steam) usan el azul de la casa: un logro suelto
 * no vale ni más ni menos que otro, y pintarlo de bronce sería mentir.
 */
export const PLAIN_TILE = "linear-gradient(150deg, #9fd4ec, #4a9eff 60%, #2f5a8f)";

export function tileFor(grade?: TrophyGrade): string {
  return grade ? GRADE_TILE[grade] : PLAIN_TILE;
}

/** Color plano del metal, o el azul neutro donde no hay metales. */
export function colorFor(grade?: TrophyGrade): string {
  return grade ? `var(--${grade})` : "var(--accent-2)";
}

const COVERS = [
  "linear-gradient(150deg, #d8a34a, #7a3f2a 60%, #2a1a2e)",
  "linear-gradient(150deg, #5a3f7d, #1e2a4a 65%, #0d1220)",
  "linear-gradient(150deg, #2f6f8f, #123a52 60%, #0b1a26)",
  "linear-gradient(150deg, #d4553f, #5e1f2c 60%, #1a0e18)",
  "linear-gradient(150deg, #2f7d6a, #0f3a3a 60%, #0a1a1c)",
  "linear-gradient(150deg, #c94f7c, #3a1c4a 60%, #12101f)",
  "linear-gradient(150deg, #e0703a, #6b2b2f 60%, #1c1020)",
  "linear-gradient(150deg, #4a6fd4, #22306b 60%, #0d1226)",
  "linear-gradient(150deg, #8f5ad8, #2b2059 60%, #0e0c1c)",
  "linear-gradient(150deg, #3f8f6f, #14453f 60%, #091a1a)",
  "linear-gradient(150deg, #d8b04a, #6b4a1f 60%, #1c1410)",
  "linear-gradient(150deg, #6f7d92, #2a3446 60%, #0d1218)",
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Degradado de carátula determinista: el mismo juego siempre cae en el mismo. */
export function coverGradient(id: string): string {
  return COVERS[hash(id) % COVERS.length];
}

/** Iniciales de dos letras para la carátula cuando no hay icono de PSN. */
export function monogram(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase();
}

/** "hace 2 d", "hace 3 m"... la misma escala relativa en toda la app. */
export function relativeDate(input?: string | Date | null): string | null {
  if (!input) return null;

  const days = Math.floor((Date.now() - new Date(input).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return null;

  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} d`;
  if (days < 365) return `hace ${Math.floor(days / 30)} m`;
  return `hace ${Math.floor(days / 365)} a`;
}

export interface Rarity {
  label: string;
  bg: string;
  fg: string;
}

/**
 * Etiqueta de rareza a partir del % de jugadores que tiene el trofeo.
 * Los cortes son los mismos que usa el resto del sitio para "raro".
 */
export function rarity(percent: number): Rarity {
  if (percent < 5) return { label: "Ultra raro", bg: "rgba(226, 181, 62, 0.14)", fg: "#e2b53e" };
  if (percent < 20) return { label: "Muy raro", bg: "rgba(159, 212, 236, 0.14)", fg: "#9fd4ec" };
  if (percent < 40) return { label: "Raro", bg: "rgba(74, 158, 255, 0.14)", fg: "#7ab8ff" };
  return { label: "Común", bg: "rgba(135, 148, 168, 0.12)", fg: "#8794a8" };
}
