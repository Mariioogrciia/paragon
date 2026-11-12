/**
 * Consolas y juegos que ya no tienes (8 nov 2026, lib/retirados.ts): reglas
 * puras, `tests/retirados.test.ts`.
 *
 * Un juego de PSN puede ser de varias consolas a la vez ("PS3,PSVITA", el
 * cross-buy): solo cuenta como retirado si lo son TODAS, porque si aún tienes
 * la Vita lo puedes seguir jugando ahí.
 */
import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";

export interface Retirados {
  dispositivos: Set<string>;
  juegos: Set<string>;
}

/**
 * Todo lo que marcas tú sobre tus juegos (misma tabla `retirado`, 8 nov 2026):
 * lo que ya no tienes, lo instalado ahora, lo oculto de tu perfil público y
 * la fecha objetivo del platino reservado ("2026-12-01").
 */
export interface Marcas extends Retirados {
  instalados: Set<string>;
  ocultosPerfil: Set<string>;
  fechaObjetivo: string | null;
  /** «Mis cazas» (12 nov 2026): los juegos que quieres platinar, en el orden en que los elegiste. */
  cazas: string[];
}

export type TipoMarca = "dispositivo" | "juego" | "instalado" | "oculto_perfil" | "fecha_objetivo" | "caza";

export const SIN_RETIRADOS: Marcas = { dispositivos: new Set(), juegos: new Set(), instalados: new Set(), ocultosPerfil: new Set(), fechaObjetivo: null, cazas: [] };

/** Cuántos juegos caben a la vez en «Mis cazas». */
export const MAX_CAZAS = 8;

/**
 * «Reanuda tus cazas» (12 nov 2026): los juegos elegidos, en su orden, que
 * sigan en tu biblioteca, no estén retirados y no estén ya platinados (o al
 * 100 % donde no hay platino). Los platinados salen solos de la lista.
 */
export function cazasDeBiblioteca(games: Game[], marcas: Pick<Marcas, "cazas" | "dispositivos" | "juegos">): Game[] {
  const porId = new Map(games.map((g) => [g.id, g]));
  return marcas.cazas
    .map((id) => porId.get(id))
    .filter((g): g is Game => g !== undefined && !esPlatinoEquivalente(g) && !juegoRetirado(g, marcas));
}

const DIA_MS = 86_400_000;

/**
 * Consolas que llevas mucho sin tocar (8 nov 2026): "hace 3 años que no
 * juegas a nada de PS3, ¿la quitamos?". Solo las no retiradas, con la última
 * partida de hace más de `anios` años.
 */
export function consolasParaRetirar(
  games: Pick<Game, "deviceLabel" | "lastPlayedAt" | "isWishlist">[],
  r: Retirados,
  ahora = Date.now(),
  anios = 2,
): { dispositivo: string; anios: number; juegos: number }[] {
  const ultima = new Map<string, number>();
  const cuenta = new Map<string, number>();
  for (const g of games) {
    if (g.isWishlist) continue;
    const t = g.lastPlayedAt ? new Date(g.lastPlayedAt).getTime() : 0;
    for (const d of dispositivosDe(g.deviceLabel)) {
      cuenta.set(d, (cuenta.get(d) ?? 0) + 1);
      ultima.set(d, Math.max(ultima.get(d) ?? 0, Number.isFinite(t) ? t : 0));
    }
  }
  return [...ultima]
    .filter(([d, t]) => !r.dispositivos.has(d) && t > 0 && ahora - t > anios * 365 * DIA_MS)
    .map(([d, t]) => ({ dispositivo: d, anios: Math.floor((ahora - t) / (365 * DIA_MS)), juegos: cuenta.get(d) ?? 0 }))
    .sort((a, b) => b.anios - a.anios);
}

/** Días que quedan hasta la fecha objetivo (negativo si ya pasó); null si no hay. */
export function diasHastaObjetivo(fecha: string | null, ahora = Date.now()): number | null {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const objetivo = new Date(`${fecha}T23:59:59Z`).getTime();
  return Math.ceil((objetivo - ahora) / DIA_MS);
}

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

/** Nombre bonito de lo que guarda la plataforma en `deviceLabel` ("PSVITA" → "PS Vita"). */
export function nombreConsola(d: string): string {
  const nombres: Record<string, string> = { PSVITA: "PS Vita", PSPC: "PC (PlayStation)", XBOX360: "Xbox 360", "XBOX 360": "Xbox 360", "XBOX ONE": "Xbox One", XBOXONE: "Xbox One", "XBOX SERIES": "Xbox Series" };
  return nombres[d] ?? d;
}
