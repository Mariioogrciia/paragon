/**
 * Consolas y juegos que ya no tienes (8 nov 2026, lib/retirados.ts): reglas
 * puras, `tests/retirados.test.ts`.
 *
 * Un juego de PSN puede ser de varias consolas a la vez ("PS3,PSVITA", el
 * cross-buy): solo cuenta como retirado si lo son TODAS, porque si aún tienes
 * la Vita lo puedes seguir jugando ahí.
 */
import type { Game } from "@/lib/types";

export interface Retirados {
  dispositivos: Set<string>;
  juegos: Set<string>;
}

export const SIN_RETIRADOS: Retirados = { dispositivos: new Set(), juegos: new Set() };

/** "PS3,PSVITA" → ["PS3", "PSVITA"]; "Xbox 360" → ["XBOX 360"]. */
export function dispositivosDe(deviceLabel: string | null | undefined): string[] {
  return (deviceLabel ?? "")
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);
}

export function juegoRetirado(g: Pick<Game, "id" | "deviceLabel">, r: Retirados): boolean {
  if (r.juegos.has(g.id)) return true;
  const ds = dispositivosDe(g.deviceLabel);
  return ds.length > 0 && ds.every((d) => r.dispositivos.has(d));
}

export function sinRetirados<T extends Pick<Game, "id" | "deviceLabel">>(games: T[], r: Retirados): T[] {
  if (r.dispositivos.size === 0 && r.juegos.size === 0) return games;
  return games.filter((g) => !juegoRetirado(g, r));
}

/** Las consolas de tu biblioteca, con cuántos juegos tienes de cada una (de más a menos). */
export function dispositivosDeBiblioteca(games: Pick<Game, "deviceLabel" | "isWishlist">[]): { dispositivo: string; juegos: number }[] {
  const cuenta = new Map<string, number>();
  for (const g of games) {
    if (g.isWishlist) continue;
    for (const d of dispositivosDe(g.deviceLabel)) cuenta.set(d, (cuenta.get(d) ?? 0) + 1);
  }
  return [...cuenta].map(([dispositivo, juegos]) => ({ dispositivo, juegos })).sort((a, b) => b.juegos - a.juegos || a.dispositivo.localeCompare(b.dispositivo));
}
