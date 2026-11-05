/**
 * Plan de platino guiado (5 nov 2026): los trofeos del juego base que te
 * faltan, ordenados en fases como haría una guía, a partir de lo que ya
 * sabemos de cada trofeo:
 *
 *   1. Perdibles (PowerPyx, `isMissable`): primero, porque si pasas el punto
 *      de no retorno hay que rejugar.
 *   2. Historia: lo que sale jugando.
 *   3. Coleccionables: mejor con la guía en la mano, en la misma partida.
 *   4. Online: antes de que cierren los servidores; para esto están las
 *      sesiones de Paragon.
 *   5. Habilidad: cuando ya conoces el juego.
 *   6. Grindeo: lo que es repetir hasta llegar a la cifra.
 *   7. Limpieza: el resto, de más común a más raro.
 *
 * Cada fase cuenta también los que ya tienes, para enseñar su progreso. Los
 * de DLC no entran (el platino no depende de ellos), salvo que el juego no
 * tenga separación por DLC. Módulo puro: `tests/planPlatino.test.ts`.
 */
import type { Trophy } from "@/lib/types";
import { clasificarTrofeo } from "@/lib/trophyType";

export const FASES = ["perdibles", "historia", "coleccionables", "online", "habilidad", "grindeo", "limpieza"] as const;
export type Fase = (typeof FASES)[number];

export interface FasePlan {
  fase: Fase;
  total: number;
  conseguidos: number;
  /** Los que faltan, en el orden en que conviene ir a por ellos. */
  pendientes: Trophy[];
}

export interface PlanPlatino {
  fases: FasePlan[];
  /** La primera fase con algo pendiente: "lo siguiente que toca". */
  actual: Fase | null;
  faltan: number;
}

function faseDe(t: Trophy): Fase {
  if (t.isMissable) return "perdibles";
  switch (clasificarTrofeo(t)) {
    case "historia":
      return "historia";
    case "coleccionable":
      return "coleccionables";
    case "multijugador":
      return "online";
    case "habilidad":
      return "habilidad";
    case "grindeo":
      return "grindeo";
    default:
      return "limpieza";
  }
}

export function planPlatino(trofeos: Trophy[]): PlanPlatino | null {
  // El trofeo de platino no es un paso: sale solo al final.
  const sinPlatino = trofeos.filter((t) => t.grade !== "platinum");
  const base = sinPlatino.filter((t) => (t.groupId ?? "default") === "default");
  const lista = base.length > 0 ? base : sinPlatino;
  if (lista.length === 0) return null;

  const porFase = new Map<Fase, Trophy[]>(FASES.map((f) => [f, []]));
  for (const t of lista) porFase.get(faseDe(t))!.push(t);

  // Dentro de cada fase, lo más común primero (lo más fácil, si nada dice
  // otra cosa). Los de historia, además, en el orden de la lista del juego,
  // que suele ser el de los capítulos: ahí no se reordena.
  const orden = (fase: Fase) => (a: Trophy, b: Trophy) =>
    fase === "historia" ? 0 : (b.rarityPercent ?? 0) - (a.rarityPercent ?? 0);

  const fases = FASES.map<FasePlan>((fase) => {
    const todos = porFase.get(fase)!;
    return {
      fase,
      total: todos.length,
      conseguidos: todos.filter((t) => t.earned).length,
      pendientes: todos.filter((t) => !t.earned).sort(orden(fase)),
    };
  }).filter((f) => f.total > 0);

  const faltan = fases.reduce((n, f) => n + f.pendientes.length, 0);
  return { fases, actual: fases.find((f) => f.pendientes.length > 0)?.fase ?? null, faltan };
}
