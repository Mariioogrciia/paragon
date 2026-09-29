import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies, games, showcaseShelves, userGames, userTrophies } from "@/db/schema";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";

/**
 * Vitrinas temáticas del perfil: colecciones con nombre que eliges tú.
 *
 *   - "manual": hasta 6 juegos de tu biblioteca, elegidos a mano.
 *   - "desarrolladora": tus juegos completados (platino o 100%) de un
 *     estudio — se rellena sola.
 *   - "raros": tus 6 trofeos más raros por debajo del 5%.
 *
 * Como mucho MAX_VITRINAS por persona: son un escaparate, no otra biblioteca.
 */

export class VitrinaError extends Error {}

export const MAX_VITRINAS = 4;
const MAX_ITEMS = 6;

export type TipoVitrina = "manual" | "desarrolladora" | "raros";

export interface ItemVitrina {
  id: string;
  titulo: string;
  subtitulo: string | null;
  iconUrl: string | null;
  /** Para enlazar: juego de la biblioteca del dueño. */
  gameId: string;
  rareza: number | null;
}

export interface Vitrina {
  id: string;
  titulo: string;
  tipo: TipoVitrina;
  filtro: string | null;
  items: ItemVitrina[];
}

/** Juegos completados: platino en PSN, 100% en el resto (mismo criterio que lib/stats.ts). */
const completadoSql = sql`(
  (${games.platform} = 'psn' and coalesce((${userGames.earned}->>'platinum')::int, 0) > 0)
  or (${games.platform} <> 'psn' and ${userGames.progressPercent} = 100)
)`;

async function itemsDe(userId: string, v: typeof showcaseShelves.$inferSelect): Promise<ItemVitrina[]> {
  if (v.tipo === "raros") {
    const filas = await db
      .select({
        gameId: userTrophies.gameId,
        trophyId: userTrophies.trophyId,
        nombre: gameTrophies.name,
        iconUrl: gameTrophies.iconUrl,
        rareza: userTrophies.rarityPercent,
        juego: games.title,
      })
      .from(userTrophies)
      .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), isNotNull(userTrophies.rarityPercent), lt(userTrophies.rarityPercent, 5)))
      .orderBy(asc(userTrophies.rarityPercent))
      .limit(MAX_ITEMS);
    return filas.map((f) => ({
      id: `${f.gameId}:${f.trophyId}`,
      titulo: f.nombre,
      subtitulo: f.juego,
      iconUrl: f.iconUrl,
      gameId: f.gameId,
      rareza: f.rareza,
    }));
  }

  const condicion =
    v.tipo === "desarrolladora"
      ? and(eq(games.developer, v.filtro ?? ""), completadoSql)
      : inArray(userGames.gameId, (v.gameIds ?? []).slice(0, MAX_ITEMS));
  if (v.tipo === "manual" && (v.gameIds ?? []).length === 0) return [];

  const filas = await db
    .select({ gameId: userGames.gameId, titulo: games.title, iconUrl: games.iconUrl, progreso: userGames.progressPercent })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), condicion))
    .orderBy(desc(userGames.lastPlayedAt))
    .limit(MAX_ITEMS);
  // En las manuales, en el orden en que se eligieron.
  if (v.tipo === "manual") {
    const orden = v.gameIds ?? [];
    filas.sort((a, b) => orden.indexOf(a.gameId) - orden.indexOf(b.gameId));
  }
  return filas.map((f) => ({ id: f.gameId, titulo: f.titulo, subtitulo: `${f.progreso}%`, iconUrl: f.iconUrl, gameId: f.gameId, rareza: null }));
}

export async function getVitrinas(userId: string): Promise<Vitrina[]> {
  const filas = await db
    .select()
    .from(showcaseShelves)
    .where(eq(showcaseShelves.userId, userId))
    .orderBy(asc(showcaseShelves.orden), asc(showcaseShelves.creadoAt));
  return Promise.all(
    filas.map(async (v) => ({
      id: v.id,
      titulo: v.titulo,
      tipo: v.tipo as TipoVitrina,
      filtro: v.filtro,
      items: await itemsDe(userId, v),
    })),
  );
}

/** Estudios de los que tienes al menos un juego completado — opciones para una vitrina "desarrolladora". */
export async function estudiosCompletados(userId: string): Promise<string[]> {
  const filas = await db
    .selectDistinct({ developer: games.developer })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(and(eq(userGames.userId, userId), isNotNull(games.developer), completadoSql))
    .orderBy(asc(games.developer));
  return filas.map((f) => f.developer!).filter(Boolean);
}

export async function crearVitrina(
  userId: string,
  datos: { titulo: string; tipo: TipoVitrina; filtro?: string; gameIds?: string[] },
): Promise<void> {
  const titulo = datos.titulo.trim();
  if (titulo.length < 2 || titulo.length > 60) throw new VitrinaError("El título tiene que tener entre 2 y 60 caracteres.");
  if (contieneLenguajeOfensivo(titulo)) throw new VitrinaError("Ese título contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.");
  if (!["manual", "desarrolladora", "raros"].includes(datos.tipo)) throw new VitrinaError("Tipo de vitrina no válido.");

  const [{ n }] = await db.select({ n: count() }).from(showcaseShelves).where(eq(showcaseShelves.userId, userId));
  if (Number(n) >= MAX_VITRINAS) throw new VitrinaError(`Como mucho ${MAX_VITRINAS} vitrinas.`);

  let gameIds: string[] | null = null;
  let filtro: string | null = null;
  if (datos.tipo === "manual") {
    const pedidos = [...new Set(datos.gameIds ?? [])].slice(0, MAX_ITEMS);
    if (pedidos.length === 0) throw new VitrinaError("Elige al menos un juego.");
    // Solo juegos de su propia biblioteca.
    const propios = await db
      .select({ gameId: userGames.gameId })
      .from(userGames)
      .where(and(eq(userGames.userId, userId), inArray(userGames.gameId, pedidos)));
    const validos = new Set(propios.map((p) => p.gameId));
    gameIds = pedidos.filter((id) => validos.has(id));
    if (gameIds.length === 0) throw new VitrinaError("Esos juegos no están en tu biblioteca.");
  } else if (datos.tipo === "desarrolladora") {
    filtro = (datos.filtro ?? "").trim();
    if (!(await estudiosCompletados(userId)).includes(filtro)) throw new VitrinaError("No tienes juegos completados de ese estudio.");
  }

  await db.insert(showcaseShelves).values({ userId, titulo, tipo: datos.tipo, filtro, gameIds, orden: Number(n) });
}

export async function borrarVitrina(userId: string, id: string): Promise<void> {
  await db.delete(showcaseShelves).where(and(eq(showcaseShelves.id, id), eq(showcaseShelves.userId, userId)));
}
