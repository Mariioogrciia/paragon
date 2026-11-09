import "server-only";
import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, gameTrophies, userGames, userTrophies, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { listFriends } from "@/lib/amigos";
import { normalizar } from "@/lib/powerpyx";
import { esPlatinoEquivalente } from "@/lib/stats";
import type { Game } from "@/lib/types";

/**
 * Lo que «A un paso del platino» enseña además de los números (8 nov 2026),
 * sacado de la base en pocas consultas para todos los juegos de la lista:
 *
 * - `masRaroPendiente`: el % del trofeo más raro que te falta del juego base.
 *   Un 95 % con un trofeo del 0,8 % pendiente no está "a un paso".
 * - `perdibles`: cuántos de los que te faltan se pueden perder (PowerPyx,
 *   `games.missableTrophies`).
 * - `amigos`: amigos que lo tienen empezado y sin platinar, para hacerlo juntos.
 */
export interface ExtrasJuego {
  masRaroPendiente: number | null;
  perdibles: number;
  amigos: { handle: string | null; nombre: string | null; imagen: string | null; percent: number }[];
}

export async function extrasPlatinables(userId: string, gameIds: string[]): Promise<Map<string, ExtrasJuego>> {
  const ids = [...new Set(gameIds)].slice(0, 60);
  const extras = new Map<string, ExtrasJuego>(ids.map((id) => [id, { masRaroPendiente: null, perdibles: 0, amigos: [] }]));
  if (ids.length === 0) return extras;

  const [pendientes, perdiblesJuego, amigosIds] = await Promise.all([
    db
      .select({ gameId: userTrophies.gameId, name: gameTrophies.name, rareza: userTrophies.rarityPercent })
      .from(userTrophies)
      .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
      .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, false), inArray(userTrophies.gameId, ids), eq(gameTrophies.groupId, "default"), ne(gameTrophies.grade, "platinum"))),
    db.select({ id: gamesTable.id, perdibles: gamesTable.missableTrophies }).from(gamesTable).where(and(inArray(gamesTable.id, ids), isNotNull(gamesTable.missableTrophies))),
    listFriends(userId).then((f) => f.map((a) => a.userId)).catch(() => [] as string[]),
  ]);

  const perdiblesPorJuego = new Map(perdiblesJuego.map((g) => [g.id, new Set((g.perdibles ?? []).map(normalizar))]));
  for (const p of pendientes) {
    const e = extras.get(p.gameId);
    if (!e) continue;
    const r = p.rareza === null ? null : Number(p.rareza);
    if (r !== null && Number.isFinite(r) && (e.masRaroPendiente === null || r < e.masRaroPendiente)) e.masRaroPendiente = r;
    if (perdiblesPorJuego.get(p.gameId)?.has(normalizar(p.name))) e.perdibles++;
  }

  if (amigosIds.length > 0) {
    const filas = await db
      .select({
        gameId: userGames.gameId,
        handle: users.handle,
        nombre: users.name,
        imagen: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
        percent: userGames.progressPercent,
        earned: userGames.earned,
      })
      .from(userGames)
      .innerJoin(users, eq(users.id, userGames.userId))
      .where(and(inArray(userGames.userId, amigosIds.slice(0, 200)), inArray(userGames.gameId, ids), eq(userGames.isWishlist, false), sql`${userGames.earnedTotal} > 0`))
      .orderBy(sql`${userGames.progressPercent} desc`);
    for (const f of filas) {
      const e = extras.get(f.gameId);
      const platinado = ((f.earned as { platinum?: number } | null)?.platinum ?? 0) > 0 || f.percent >= 100;
      if (!e || platinado || e.amigos.length >= 3) continue;
      e.amigos.push({ handle: f.handle, nombre: f.nombre, imagen: f.imagen, percent: f.percent });
    }
  }
  return extras;
}

/**
 * «Doble platino» (8 nov 2026): juegos que ya platinaste en una versión y
 * que tienen otra versión con su propio platino (PS4 y PS5, PS3 y Vita…),
 * por el igdbId. Si esa otra versión ya está en tu biblioteca, va su %.
 */
export interface DoblePlatino {
  titulo: string;
  platinado: { id: string; dispositivo: string };
  otra: { id: string; titulo: string; dispositivo: string; iconUrl: string | null };
  /** % en tu biblioteca de esa otra versión; null si no la tienes. */
  laTienes: number | null;
}

export async function doblesPlatinos(games: Game[], limite = 10): Promise<DoblePlatino[]> {
  const platinados = games.filter((g) => !g.isWishlist && g.igdbId && esPlatinoEquivalente(g) && (g.defined?.platinum ?? 0) > 0);
  if (platinados.length === 0) return [];
  const igdb = [...new Set(platinados.map((g) => g.igdbId!))].slice(0, 300);
  const mios = new Map(games.map((g) => [g.id, g]));
  const otras = await db
    .select({ id: gamesTable.id, titulo: gamesTable.title, dispositivo: gamesTable.deviceLabel, iconUrl: gamesTable.iconUrl, igdbId: gamesTable.igdbId, defined: gamesTable.defined })
    .from(gamesTable)
    .where(and(inArray(gamesTable.igdbId, igdb), eq(gamesTable.platform, "psn")));

  const vistos = new Set<string>();
  const salida: DoblePlatino[] = [];
  for (const o of otras) {
    const conPlatino = ((o.defined as { platinum?: number } | null)?.platinum ?? 0) > 0;
    const mia = mios.get(o.id);
    if (!conPlatino || vistos.has(o.id) || (mia && esPlatinoEquivalente(mia))) continue;
    const base = platinados.find((p) => p.igdbId === o.igdbId && p.id !== o.id && p.deviceLabel !== o.dispositivo);
    if (!base) continue;
    vistos.add(o.id);
    salida.push({
      titulo: base.title,
      platinado: { id: base.id, dispositivo: base.deviceLabel },
      otra: { id: o.id, titulo: o.titulo, dispositivo: o.dispositivo, iconUrl: o.iconUrl ?? null },
      laTienes: mia ? mia.progressPercent : null,
    });
  }
  // Primero las que ya tienes (y más avanzadas), luego las que habría que conseguir.
  return salida.sort((a, b) => (b.laTienes ?? -1) - (a.laTienes ?? -1)).slice(0, limite);
}
