import type { Game } from "@/lib/types";

/**
 * "¿Qué te pide el cuerpo hoy?" — los mismos géneros IGDB que ya usa
 * Trophy DNA (`CATEGORIAS_GENERO`, lib/trophyDna.ts), reagrupados por
 * sensación en vez de por taxonomía técnica. Elegir "RPG" o "Estrategia"
 * en un filtro es preciso pero no es cómo piensa nadie en el sofá —
 * "quiero desconectar" sí. Mismos géneros reales de siempre, solo la
 * agrupación es nueva.
 */
export const ESTADOS_ANIMO = [
  {
    key: "adrenalina",
    emoji: "💥",
    label: "Descargar adrenalina",
    generos: ["Shooter", "Fighting", "Hack and slash/Beat 'em up", "Arcade", "Racing"],
  },
  {
    key: "relax",
    emoji: "🧘",
    label: "Desconectar y relajar",
    generos: ["Puzzle", "Platform", "Card & Board Game", "Quiz/Trivia", "Pinball"],
  },
  {
    key: "historia",
    emoji: "📖",
    label: "Sumergirte en una historia",
    generos: ["Role-playing (RPG)", "Adventure", "Point-and-click", "Visual Novel"],
  },
  {
    key: "mental",
    emoji: "🧠",
    label: "Reto mental",
    generos: ["Strategy", "Tactical", "Turn-based strategy (TBS)", "Real Time Strategy (RTS)", "MOBA"],
  },
] as const;

export type EstadoAnimoKey = (typeof ESTADOS_ANIMO)[number]["key"];

/** Tu backlog (empezado o sin empezar, nunca terminado ni deseados) que encaja con el estado de ánimo elegido. */
export function juegosPorEstadoAnimo(games: Game[], estado: EstadoAnimoKey): Game[] {
  const generos = ESTADOS_ANIMO.find((e) => e.key === estado)?.generos ?? [];
  return games.filter(
    (g) => !g.isWishlist && g.progressPercent < 100 && (g.genres ?? []).some((genero) => (generos as readonly string[]).includes(genero)),
  );
}
