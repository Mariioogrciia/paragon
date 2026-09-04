import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies, games, userGames, userTrophies, syncRuns } from "@/db/schema";
import { fetchLibrary as fetchPsnLibrary, fetchTrophies } from "@/lib/psn/client";
import {
  fetchAchievements,
  fetchLibrary as fetchSteamLibrary,
  fetchStoreMetadata,
} from "@/lib/steam/client";
import { fetchAchievements as fetchXblAchievements, fetchLibrary as fetchXblLibrary } from "@/lib/xbl/client";
import { parseGameKey, type Game, type Platform, type Trophy } from "@/lib/types";

/**
 * Trae datos de las plataformas y los guarda.
 *
 * Todo lo que llega de fuera pasa por aquí antes de llegar a una pantalla. Las
 * páginas leen siempre de nuestra base, nunca de PSN ni de Steam — así un
 * amigo de la plataforma ve tu progreso aunque la API de turno jamás le
 * dejaría consultarlo, y así el día que queramos rachas o histórico ya
 * tenemos de dónde sacarlos.
 */

export interface SyncAccount {
  platform: Platform;
  accountId: string;
}

/**
 * En un UPSERT, el valor que traía la fila que chocó. Evita repetir a mano
 * cada columna en el `set`, que es donde se cuelan los despistes.
 */
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}

/** Postgres admite hasta 65535 parámetros por sentencia; troceamos de sobra. */
const CHUNK = 200;

function chunked<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Cuántos juegos de Steam traen su detalle al vincular o resincronizar.
 *
 * Steam no da el porcentaje de logros en la llamada de biblioteca: hay que
 * pedirlo juego a juego. Con 300 juegos eso son 900 peticiones, demasiado para
 * una acción de usuario. Traemos los más recientes y el resto se rellena solo
 * al abrir cada ficha.
 */
const STEAM_DETAIL_LIMIT = 40;
const STEAM_CONCURRENCY = 6;

/**
 * Lo mismo que STEAM_DETAIL_LIMIT, pero mucho más bajo: OpenXBL (xbl.io) va
 * en un nivel gratis de 150 peticiones/hora — ver la nota de riesgo en
 * lib/xbl/client.ts. Vincular una cuenta ya gasta 3 peticiones antes de
 * llegar aquí (buscar el gamertag, la biblioteca, comprobar que se puede
 * leer), y cada juego puede necesitar más de una página. 15 juegos con
 * concurrencia 2 deja margen de sobra para no agotar el cupo en una sola
 * vinculación.
 */
const XBL_DETAIL_LIMIT = 15;
const XBL_CONCURRENCY = 2;

/** Lanza las tareas de N en N: ni una a una (lento) ni todas (Steam corta). */
async function mapLimit<T>(items: T[], limit: number, run: (item: T) => Promise<void>) {
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try {
        await run(item);
      } catch {
        // Un juego que falle no puede tumbar la sincronización entera.
      }
    }
  });

  await Promise.all(workers);
}

/* ------------------------------- Biblioteca ------------------------------- */

async function saveLibrary(userId: string, library: Game[]): Promise<void> {
  for (const batch of chunked(library)) {
    await db
      .insert(games)
      .values(
        batch.map((g) => ({
          id: g.id,
          platform: g.platform,
          nativeId: parseGameKey(g.id).nativeId,
          title: g.title,
          deviceLabel: g.deviceLabel,
          iconUrl: g.iconUrl,
          service: g.service ?? null,
          definedTotal: g.definedTotal,
          defined: (g.defined as unknown as Record<string, number>) ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: games.id,
        set: {
          title: sqlExcluded("title"),
          deviceLabel: sqlExcluded("deviceLabel"),
          iconUrl: sqlExcluded("iconUrl"),
          // Steam manda 0 aquí: el total de verdad llega con el detalle, así
          // que no pisamos lo que ya supiéramos con un cero.
          definedTotal: sql`greatest(${games.definedTotal}, excluded."definedTotal")`,
          defined: sql`coalesce(excluded."defined", ${games.defined})`,
        },
      });

    await db
      .insert(userGames)
      .values(
        batch.map((g) => ({
          userId,
          gameId: g.id,
          progressPercent: g.progressPercent,
          earnedTotal: g.earnedTotal,
          earned: (g.earned as unknown as Record<string, number>) ?? null,
          lastPlayedAt: g.lastPlayedAt ? new Date(g.lastPlayedAt) : null,
          playtimeMinutes: g.playtimeMinutes ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [userGames.userId, userGames.gameId],
        set: {
          progressPercent: sql`greatest(${userGames.progressPercent}, excluded."progressPercent")`,
          earnedTotal: sql`greatest(${userGames.earnedTotal}, excluded."earnedTotal")`,
          earned: sql`coalesce(excluded."earned", ${userGames.earned})`,
          lastPlayedAt: sqlExcluded("lastPlayedAt"),
          playtimeMinutes: sql`coalesce(excluded."playtimeMinutes", ${userGames.playtimeMinutes})`,
        },
      });
  }
}

/**
 * Biblioteca completa de una cuenta.
 *
 * En PSN el porcentaje de cada juego viene en la misma llamada. En Steam no:
 * por eso, después de guardar, se traen los logros de los juegos más recientes
 * (ver STEAM_DETAIL_LIMIT).
 */
export async function syncLibrary(
  userId: string,
  account: SyncAccount,
): Promise<number> {
  // Google, Epic y Ubisoft no tienen lector propio todavía. Sin esta salida,
  // "cualquier plataforma que no sea psn/steam/xbox" caía por defecto en el
  // lector de Steam y le pedía la biblioteca a Steam con, p. ej., un usuario
  // de Epic — de ahí que su cuenta se vincule con `legible: false` (ver
  // resolveEpic/resolveUbisoft/resolveGoogle en profiles.ts), lo que ya
  // evita llegar aquí. Se deja explícito por si algo cambia esa bandera sin
  // tocar esto.
  if (account.platform !== "psn" && account.platform !== "steam" && account.platform !== "xbox") return 0;

  const library =
    account.platform === "psn"
      ? await fetchPsnLibrary(account.accountId)
      : account.platform === "steam"
        ? await fetchSteamLibrary(account.accountId)
        : await fetchXblLibrary(account.accountId);

  if (library.length === 0) return 0;

  const before = await db
    .select({ total: sql<number>`coalesce(sum(${userGames.earnedTotal}), 0)` })
    .from(userGames)
    .where(eq(userGames.userId, userId));

  await saveLibrary(userId, library);

  if (account.platform === "steam") {
    const recientes = library
      .filter((g) => (g.playtimeMinutes ?? 0) > 0)
      .slice(0, STEAM_DETAIL_LIMIT);

    await mapLimit(recientes, STEAM_CONCURRENCY, async (game) => {
      await syncGameTrophies(userId, account, game.id);
    });
  }

  if (account.platform === "xbox") {
    // Xbox no da `playtimeMinutes` (a diferencia de Steam), así que el
    // filtro de "recientes" es por `lastPlayedAt`, que la biblioteca sí trae.
    const recientes = library.filter((g) => g.lastPlayedAt).slice(0, XBL_DETAIL_LIMIT);

    await mapLimit(recientes, XBL_CONCURRENCY, async (game) => {
      await syncGameTrophies(userId, account, game.id);
    });
  }

  const after = await db
    .select({ total: sql<number>`coalesce(sum(${userGames.earnedTotal}), 0)` })
    .from(userGames)
    .where(eq(userGames.userId, userId));
  await db.insert(syncRuns).values({
    id: crypto.randomUUID(),
    userId,
    platform: account.platform,
    games: library.length,
    newTrophies: Math.max(0, Number(after[0]?.total ?? 0) - Number(before[0]?.total ?? 0)),
  });

  return library.length;
}

/* --------------------------------- Detalle -------------------------------- */

async function saveTrophies(
  userId: string,
  gameId: string,
  trophies: Trophy[],
): Promise<void> {
  for (const batch of chunked(trophies)) {
    await db
      .insert(gameTrophies)
      .values(
        batch.map((t) => ({
          gameId,
          trophyId: t.id,
          name: t.name,
          detail: t.detail,
          grade: t.grade ?? null,
          hidden: t.hidden ?? false,
          iconUrl: t.iconUrl,
          groupId: t.groupId ?? "default",
          groupName: t.groupName ?? null,
          xp: t.xp ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [gameTrophies.gameId, gameTrophies.trophyId],
        set: {
          name: sqlExcluded("name"),
          detail: sqlExcluded("detail"),
          iconUrl: sqlExcluded("iconUrl"),
          groupId: sqlExcluded("groupId"),
          groupName: sqlExcluded("groupName"),
          xp: sqlExcluded("xp"),
        },
      });

    await db
      .insert(userTrophies)
      .values(
        batch.map((t) => ({
          userId,
          gameId,
          trophyId: t.id,
          earned: t.earned,
          earnedAt: t.earnedAt ? new Date(t.earnedAt) : null,
          rarityPercent: t.rarityPercent ?? null,
          progressCurrent: t.progress?.current ?? null,
          progressTarget: t.progress?.target ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [userTrophies.userId, userTrophies.gameId, userTrophies.trophyId],
        set: {
          earned: sqlExcluded("earned"),
          earnedAt: sqlExcluded("earnedAt"),
          rarityPercent: sqlExcluded("rarityPercent"),
          progressCurrent: sqlExcluded("progressCurrent"),
          progressTarget: sqlExcluded("progressTarget"),
        },
      });
  }
}

/**
 * Metadatos de catálogo de un juego de Steam (desarrolladora, editora, géneros).
 *
 * Se piden una sola vez por juego: la API de la tienda va muy limitada de
 * peticiones y esto no cambia nunca. Si falla, el juego se queda sin empresa y
 * ya está; no es motivo para romper la sincronización de logros.
 */
async function syncStoreMetadata(gameId: string, nativeId: string): Promise<void> {
  const [row] = await db
    .select({ syncedAt: games.metadataSyncedAt })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (row?.syncedAt) return;

  const metadata = await fetchStoreMetadata(nativeId);
  if (!metadata) return;

  await db
    .update(games)
    .set({
      developer: metadata.developer ?? null,
      publisher: metadata.publisher ?? null,
      genres: metadata.genres ?? null,
      pegi: metadata.pegi ?? null,
      // La carátula buena es la que da la tienda, con su hash. La ruta clásica
      // (cdn.../steam/apps/<id>/header.jpg) devuelve un placeholder de 1 KB en
      // los juegos recientes — por eso Battlefield 6 salía sin foto.
      ...(metadata.headerImage ? { iconUrl: metadata.headerImage } : {}),
      metadataSyncedAt: new Date(),
    })
    .where(eq(games.id, gameId));
}

import { searchGames } from "@/lib/igdb/client";

async function syncIgdbMetadata(gameId: string, title: string): Promise<void> {
  const [row] = await db
    .select({ syncedAt: games.metadataSyncedAt })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (row?.syncedAt) return;

  try {
    const results = await searchGames(title, 1);
    const metadata = results[0];
    
    // We mark it as synced even if we found nothing, so we don't query IGDB every time.
    if (!metadata) {
      await db.update(games).set({ metadataSyncedAt: new Date() }).where(eq(games.id, gameId));
      return;
    }

    await db
      .update(games)
      .set({
        developer: metadata.developer ?? null,
        publisher: metadata.publisher ?? null,
        genres: metadata.genres ?? null,
        pegi: metadata.pegi ?? null,
        // Optional: only update coverUrl if the game doesn't have an icon yet, or overwrite it?
        // PSN already gives a good iconUrl in the library. Let's keep the IGDB one if provided.
        ...(metadata.coverUrl ? { iconUrl: metadata.coverUrl } : {}),
        metadataSyncedAt: new Date(),
      })
      .where(eq(games.id, gameId));
  } catch (error) {
    console.error("Error fetching IGDB metadata:", error);
  }
}

/**
 * Logros de un juego para un usuario.
 *
 * En Steam, además, es el momento en el que se sabe cuántos logros tiene el
 * juego y cuántos lleva el jugador: la llamada de biblioteca no lo dice, así
 * que el progreso se calcula aquí.
 */
export async function syncGameTrophies(
  userId: string,
  account: SyncAccount,
  gameId: string,
): Promise<number> {
  const { platform, nativeId } = parseGameKey(gameId);

  let trophies: Trophy[];

  if (platform === "psn") {
    const [row] = await db
      .select({ service: games.service, title: games.title })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    trophies = await fetchTrophies(
      account.accountId,
      nativeId,
      row?.service ?? "trophy2",
    );

    if (row?.title) {
      await syncIgdbMetadata(gameId, row.title);
    }
  } else if (platform === "xbox") {
    trophies = await fetchXblAchievements(account.accountId, nativeId);

    // Xbox no tiene una API de tienda pública como Steam (syncStoreMetadata
    // es específica de appid de Steam) — se empareja por título en IGDB,
    // igual que PSN.
    const [row] = await db.select({ title: games.title }).from(games).where(eq(games.id, gameId)).limit(1);
    if (row?.title) {
      await syncIgdbMetadata(gameId, row.title);
    }
  } else {
    trophies = await fetchAchievements(account.accountId, nativeId);
    await syncStoreMetadata(gameId, nativeId);
  }

  if (trophies.length === 0) {
    // Un juego sin logros no es un error: hay muchos en Steam. Lo marcamos
    // como sincronizado para no volver a pedirlo en cada visita.
    await db
      .update(userGames)
      .set({ trophiesSyncedAt: new Date() })
      .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));

    return 0;
  }

  await saveTrophies(userId, gameId, trophies);

  const earnedTotal = trophies.filter((t) => t.earned).length;

  // Steam y Xbox comparten el mismo motivo: ninguna de las dos da el
  // progreso en la llamada de biblioteca, así que se calcula aquí, con los
  // logros de verdad ya en la mano — igual que definedTotal más abajo.
  const progreso =
    platform === "steam" || platform === "xbox"
      ? {
          earnedTotal,
          progressPercent: Math.round((earnedTotal / trophies.length) * 100),
        }
      : {};

  await db
    .update(userGames)
    .set({ trophiesSyncedAt: new Date(), ...progreso })
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));

  if (platform === "steam" || platform === "xbox") {
    await db
      .update(games)
      .set({ definedTotal: trophies.length })
      .where(eq(games.id, gameId));
  }

  return trophies.length;
}
