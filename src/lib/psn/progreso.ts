import type { TrophyCounts } from "@/lib/types";

/**
 * Lo que vale cada metal para el porcentaje de PlayStation (el mismo reparto
 * con el que Sony calcula el «progreso» de una lista de trofeos).
 */
const PUNTOS: TrophyCounts = { platinum: 180, gold: 90, silver: 30, bronze: 15 };

const puntos = (c: Partial<TrophyCounts> | null | undefined) =>
  (c?.platinum ?? 0) * PUNTOS.platinum + (c?.gold ?? 0) * PUNTOS.gold + (c?.silver ?? 0) * PUNTOS.silver + (c?.bronze ?? 0) * PUNTOS.bronze;

/**
 * El porcentaje de un juego de PSN (12 nov 2026). Normalmente es el que da
 * Sony tal cual; si llega uno imposible (un GTA V de PS4 salió al 390 %),
 * se calcula con los trofeos conseguidos por metal, como lo calcula Sony.
 * Módulo puro: `tests/progresoPsn.test.ts`.
 */
export function progresoPsn(progreso: number | null | undefined, definidos: Partial<TrophyCounts> | null | undefined, ganados: Partial<TrophyCounts> | null | undefined): number {
  if (typeof progreso === "number" && Number.isFinite(progreso) && progreso >= 0 && progreso <= 100) return Math.round(progreso);
  const total = puntos(definidos);
  if (total === 0) return 0;
  return Math.min(100, Math.round((puntos(ganados) / total) * 100));
}
