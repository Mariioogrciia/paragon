import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { listFriends } from "@/lib/profiles";
import { relativeDate } from "@/lib/design";
import {
  games,
  gameTrophies,
  notifications,
  userGames,
  users,
  userTrophies,
} from "@/db/schema";

/**
 * Avisos.
 *
 * Los genera el cron después de sincronizar, que es cuando se sabe algo nuevo
 * sin que el usuario haya entrado. Esa es la idea entera: enterarte de que te
 * queda un trofeo para el platino sin tener que ir a mirarlo.
 *
 * No se repiten gracias a `dedupeKey` + índice único: cada aviso se inserta
 * con "si ya existe, no hagas nada". Sin eso, el cron avisaría de lo mismo
 * cada hora, para siempre.
 */

export type TipoAviso =
  | "platino_cerca"
  | "lanzamiento"
  | "amigo_adelanta"
  | "logros_nuevos"
  | "abandonado"
  | "resumen_semanal";

export interface Aviso {
  id: string;
  type: TipoAviso;
  title: string;
  body: string | null;
  href: string | null;
  leido: boolean;
  createdAt: string;
}

/* --------------------------------- Lectura --------------------------------- */

export async function listarAvisos(userId: string, limite = 30): Promise<Aviso[]> {
  const filas = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limite);

  return filas.map((f) => ({
    id: f.id,
    type: f.type,
    title: f.title,
    body: f.body,
    href: f.href,
    leido: f.readAt !== null,
    createdAt: f.createdAt.toISOString(),
  }));
}

export async function contarSinLeer(userId: string): Promise<number> {
  const [fila] = await db
    .select({ n: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return Number(fila?.n ?? 0);
}

export async function marcarTodoLeido(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/* -------------------------------- Generación -------------------------------- */

interface NuevoAviso {
  userId: string;
  type: TipoAviso;
  title: string;
  body?: string;
  href?: string;
  gameId?: string;
  dedupeKey: string;
}

/** Inserta los que no existan ya. Devuelve cuántos eran nuevos de verdad. */
async function guardar(avisos: NuevoAviso[]): Promise<number> {
  if (avisos.length === 0) return 0;

  const insertados = await db
    .insert(notifications)
    .values(
      avisos.map((a) => ({
        userId: a.userId,
        type: a.type,
        title: a.title,
        body: a.body ?? null,
        href: a.href ?? null,
        gameId: a.gameId ?? null,
        dedupeKey: a.dedupeKey,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: notifications.id });

  return insertados.length;
}

/**
 * Cuántos trofeos del JUEGO BASE le faltan a cada juego sin platinar.
 *
 * Los de DLC se descartan aquí (`groupId <> 'default'`): el platino no depende
 * de ellos, y avisar de "te faltan 12" contando expansiones sería mentir sobre
 * lo cerca que estás.
 */
const CERCA_DEL_PLATINO = 3;

async function avisosDePlatino(userId: string, handle: string | null): Promise<NuevoAviso[]> {
  const filas = await db
    .select({
      gameId: games.id,
      titulo: games.title,
      dispositivo: games.deviceLabel,
      faltan: sql<number>`count(*) filter (
        where ${userTrophies.earned} is not true and ${gameTrophies.grade} <> 'platinum'
      )`,
      platinoHecho: sql<boolean>`bool_or(
        ${gameTrophies.grade} = 'platinum' and ${userTrophies.earned} is true
      )`,
      tienePlatino: sql<boolean>`bool_or(${gameTrophies.grade} = 'platinum')`,
    })
    .from(gameTrophies)
    .innerJoin(games, eq(games.id, gameTrophies.gameId))
    .innerJoin(
      userGames,
      and(eq(userGames.gameId, games.id), eq(userGames.userId, userId)),
    )
    .leftJoin(
      userTrophies,
      and(
        eq(userTrophies.gameId, gameTrophies.gameId),
        eq(userTrophies.trophyId, gameTrophies.trophyId),
        eq(userTrophies.userId, userId),
      ),
    )
    .where(eq(gameTrophies.groupId, "default"))
    .groupBy(games.id, games.title, games.deviceLabel)
    .having(
      sql`bool_or(${gameTrophies.grade} = 'platinum')
          and not bool_or(${gameTrophies.grade} = 'platinum' and ${userTrophies.earned} is true)
          and count(*) filter (
            where ${userTrophies.earned} is not true and ${gameTrophies.grade} <> 'platinum'
          ) between 1 and ${CERCA_DEL_PLATINO}`,
    );

  return filas.map((f) => {
    const faltan = Number(f.faltan);
    // El dispositivo va en el título porque el mismo juego suele estar dos
    // veces (PS4 y PS5) con listas de trofeos distintas: sin él salen dos
    // avisos idénticos con cifras diferentes y no se sabe cuál es cuál.
    const nombre = `${f.titulo} (${f.dispositivo})`;

    return {
      userId,
      type: "platino_cerca" as const,
      title:
        faltan === 1
          ? `Te queda 1 trofeo para el platino de ${nombre}`
          : `Te quedan ${faltan} trofeos para el platino de ${nombre}`,
      body: "Sin contar los de DLC, que no cuentan para el platino.",
      href: handle ? `/u/${handle}/${f.gameId}` : undefined,
      gameId: f.gameId,
      // La cifra entra en la clave: si pasas de 3 a 1, es noticia otra vez.
      dedupeKey: `platino_cerca:${f.gameId}:${faltan}`,
    };
  });
}

/**
 * Un juego que ya platinaste ha ganado trofeos base nuevos.
 *
 * Pasa cuando un parche o un DLC añade logros a un juego que dabas por
 * cerrado: la barra se queda como estaba, así que sin esto no hay forma de
 * enterarse salvo tropezando con ello. Solo mira el grupo "default": si lo
 * nuevo es una expansión con grupo propio, ya avisa de eso el juego en sí al
 * mostrar "Trofeos de DLC pendientes" en su ficha.
 */
async function avisosDeLogrosNuevos(userId: string, handle: string | null): Promise<NuevoAviso[]> {
  const filas = await db
    .select({
      gameId: games.id,
      titulo: games.title,
      dispositivo: games.deviceLabel,
      definedTotal: games.definedTotal,
      faltan: sql<number>`count(*) filter (
        where ${userTrophies.earned} is not true and ${gameTrophies.grade} <> 'platinum'
      )`,
    })
    .from(gameTrophies)
    .innerJoin(games, eq(games.id, gameTrophies.gameId))
    .innerJoin(
      userGames,
      and(eq(userGames.gameId, games.id), eq(userGames.userId, userId)),
    )
    .leftJoin(
      userTrophies,
      and(
        eq(userTrophies.gameId, gameTrophies.gameId),
        eq(userTrophies.trophyId, gameTrophies.trophyId),
        eq(userTrophies.userId, userId),
      ),
    )
    .where(eq(gameTrophies.groupId, "default"))
    .groupBy(games.id, games.title, games.deviceLabel, games.definedTotal)
    .having(
      sql`bool_or(${gameTrophies.grade} = 'platinum' and ${userTrophies.earned} is true)
          and count(*) filter (
            where ${userTrophies.earned} is not true and ${gameTrophies.grade} <> 'platinum'
          ) > 0`,
    );

  return filas.map((f) => {
    const faltan = Number(f.faltan);
    const nombre = `${f.titulo} (${f.dispositivo})`;

    return {
      userId,
      type: "logros_nuevos" as const,
      title: `${nombre} tiene trofeos nuevos`,
      body:
        faltan === 1
          ? "Ya lo platinaste, pero un parche o DLC ha añadido 1 trofeo nuevo al juego base."
          : `Ya lo platinaste, pero un parche o DLC ha añadido ${faltan} trofeos nuevos al juego base.`,
      href: handle ? `/u/${handle}/${f.gameId}` : undefined,
      gameId: f.gameId,
      // El total definido entra en la clave: si vuelve a crecer más adelante
      // (otro parche), es noticia otra vez.
      dedupeKey: `logros_nuevos:${f.gameId}:${f.definedTotal}`,
    };
  });
}

/**
 * Juegos empezados y parados hace tiempo.
 *
 * El filtro de "abandonados" en la biblioteca es pasivo — hay que ir a
 * mirarlo. Esto es lo mismo pero empujando: si nadie te lo recuerda, un
 * juego al 60% simplemente desaparece de la cabeza. `dedupeKey` lleva el
 * año-mes para que, si se sigue sin tocar, vuelva a avisar el mes que viene
 * en vez de una sola vez para siempre.
 */
const DIAS_ABANDONO = 90;

async function avisosDeAbandonados(userId: string, handle: string | null): Promise<NuevoAviso[]> {
  const limite = new Date(Date.now() - DIAS_ABANDONO * 86_400_000);

  const filas = await db
    .select({
      gameId: games.id,
      titulo: games.title,
      dispositivo: games.deviceLabel,
      progreso: userGames.progressPercent,
      ultimaVez: userGames.lastPlayedAt,
    })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(
      and(
        eq(userGames.userId, userId),
        eq(userGames.isWishlist, false),
        sql`${userGames.progressPercent} between 1 and 99`,
        sql`${userGames.lastPlayedAt} is not null and ${userGames.lastPlayedAt} < ${limite}`,
      ),
    );

  const mesActual = new Date().toISOString().slice(0, 7);

  return filas.map((f) => ({
    userId,
    type: "abandonado" as const,
    title: `${f.titulo} (${f.dispositivo}) lleva tiempo parado`,
    body: `Al ${f.progreso}%, sin tocarlo desde ${relativeDate(f.ultimaVez) ?? "hace tiempo"}.`,
    href: handle ? `/u/${handle}/${f.gameId}` : undefined,
    gameId: f.gameId,
    dedupeKey: `abandonado:${f.gameId}:${mesActual}`,
  }));
}

/**
 * "Esta semana en Paragon": cuántos trofeos y en cuántos juegos, últimos 7
 * días. Se llama solo los lunes (ver `generarAvisos`) — no tiene sentido un
 * resumen semanal a mitad de semana, y así solo sale un aviso por semana en
 * vez de uno cada pasada del cron.
 *
 * Sin trofeos que resumir no se genera nada: un aviso vacío ("0 trofeos esta
 * semana") no informa, solo ocupa sitio en la bandeja.
 */
async function avisosDeResumenSemanal(userId: string): Promise<NuevoAviso[]> {
  const desde = new Date(Date.now() - 7 * 86_400_000);

  const [fila] = await db
    .select({
      trofeos: sql<number>`count(*)`,
      juegos: sql<number>`count(distinct ${userTrophies.gameId})`,
    })
    .from(userTrophies)
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        sql`${userTrophies.earnedAt} >= ${desde}`,
      ),
    );

  const trofeos = Number(fila?.trofeos ?? 0);
  if (trofeos === 0) return [];

  const juegos = Number(fila?.juegos ?? 0);

  return [
    {
      userId,
      type: "resumen_semanal" as const,
      title: `Esta semana: ${trofeos} ${trofeos === 1 ? "trofeo" : "trofeos"}`,
      body: `Repartidos en ${juegos} ${juegos === 1 ? "juego" : "juegos"}. Sigue así.`,
      href: "/ritmo",
      // La fecha de hoy: con el cron gateado a los lunes, alcanza para que
      // no se duplique si la pasada se repitiera el mismo día.
      dedupeKey: `resumen_semanal:${new Date().toISOString().slice(0, 10)}`,
    },
  ];
}

/**
 * Juegos de la lista de deseados cuya fecha de salida ya ha pasado.
 *
 * La fecha se pide a IGDB, no se guarda: son pocos juegos por usuario y la
 * respuesta ya viene cacheada del catálogo.
 */
async function avisosDeLanzamiento(
  userId: string,
  fechaDeSalida: (igdbId: number) => Promise<{ titulo: string; salida?: string } | null>,
): Promise<NuevoAviso[]> {
  const deseados = await db
    .select({ gameId: games.id, nativeId: games.nativeId, titulo: games.title })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(
      and(
        eq(userGames.userId, userId),
        eq(userGames.isWishlist, true),
        eq(games.platform, "manual"),
      ),
    );

  const avisos: NuevoAviso[] = [];

  for (const d of deseados) {
    const igdbId = Number(d.nativeId.split(":")[0]);
    if (!Number.isFinite(igdbId)) continue;

    const ficha = await fechaDeSalida(igdbId);
    if (!ficha?.salida) continue;

    // Solo cuando ya ha salido. Un juego anunciado "para 2027" no es noticia.
    if (new Date(ficha.salida).getTime() > Date.now()) continue;

    avisos.push({
      userId,
      type: "lanzamiento",
      title: `Ya ha salido ${ficha.titulo}`,
      body: "Estaba en tu lista de deseados.",
      href: `/juego/${igdbId}`,
      gameId: d.gameId,
      dedupeKey: `lanzamiento:${igdbId}`,
    });
  }

  return avisos;
}

/**
 * Un amigo ha platinado algo que tú tienes a medias.
 *
 * Es la versión honesta de "te ha adelantado": comparar totales de biblioteca
 * no dice nada (quien lleva diez años jugando siempre va por delante), pero
 * que alguien remate un juego que tú tienes empezado sí es una carrera real y
 * comparable.
 */
async function avisosDeAmigos(userId: string, amigos: string[]): Promise<NuevoAviso[]> {
  if (amigos.length === 0) return [];

  const mios = alias(userGames, "mios");
  const suyos = alias(userGames, "suyos");

  const filas = await db
    .select({
      gameId: games.id,
      titulo: games.title,
      dispositivo: games.deviceLabel,
      amigoId: suyos.userId,
      amigo: users.name,
      handleAmigo: users.handle,
    })
    .from(mios)
    .innerJoin(games, eq(games.id, mios.gameId))
    .innerJoin(
      suyos,
      and(
        eq(suyos.gameId, mios.gameId),
        inArray(suyos.userId, amigos),
        sql`coalesce((${suyos.earned}->>'platinum')::int, 0) > 0`,
      ),
    )
    .innerJoin(users, eq(users.id, suyos.userId))
    .where(
      and(
        eq(mios.userId, userId),
        // Tú lo tienes empezado pero sin platinar.
        sql`coalesce((${mios.earned}->>'platinum')::int, 0) = 0`,
        sql`${mios.progressPercent} > 0`,
      ),
    )
    .limit(20);

  return filas.map((f) => ({
    userId,
    type: "amigo_adelanta" as const,
    title: `${f.amigo ?? "Un amigo"} ha platinado ${f.titulo} (${f.dispositivo})`,
    body: "Tú lo tienes empezado y sin platinar.",
    href: f.handleAmigo ? `/comparar/${f.handleAmigo}` : undefined,
    gameId: f.gameId,
    dedupeKey: `amigo_adelanta:${f.amigoId}:${f.gameId}`,
  }));
}

/**
 * Genera los avisos de un usuario. Devuelve cuántos son nuevos.
 *
 * `fechaDeSalida` se inyecta en vez de importar el cliente de IGDB aquí para
 * que este módulo se pueda probar sin red, y para que un fallo del catálogo
 * no impida generar los avisos de platino, que no dependen de él.
 */
export async function generarAvisos(
  userId: string,
  fechaDeSalida?: (igdbId: number) => Promise<{ titulo: string; salida?: string } | null>,
): Promise<number> {
  const [perfil] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const handle = perfil?.handle ?? null;
  const avisos: NuevoAviso[] = [...(await avisosDePlatino(userId, handle))];

  try {
    const amigos = await listFriends(userId);
    avisos.push(...(await avisosDeAmigos(userId, amigos.map((a) => a.userId))));
  } catch {
    // Sin amigos o con la consulta fallando, el resto de avisos sigue saliendo.
  }

  try {
    avisos.push(...(await avisosDeLogrosNuevos(userId, handle)));
  } catch (error) {
    console.error("[avisos] logros_nuevos", userId, error);
  }

  try {
    avisos.push(...(await avisosDeAbandonados(userId, handle)));
  } catch (error) {
    console.error("[avisos] abandonado", userId, error);
  }

  // 1 = lunes en JS (0 es domingo).
  if (new Date().getDay() === 1) {
    try {
      avisos.push(...(await avisosDeResumenSemanal(userId)));
    } catch (error) {
      console.error("[avisos] resumen_semanal", userId, error);
    }
  }

  // Un juego solo puede tener un aviso de platino vivo. Al bajar de 3 a 2
  // trofeos llega uno nuevo, y dejar el viejo sin leer sería tener dos avisos
  // contradictorios del mismo juego en la bandeja.
  for (const aviso of avisos) {
    if (aviso.type !== "platino_cerca" || !aviso.gameId) continue;

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, "platino_cerca"),
          eq(notifications.gameId, aviso.gameId),
          isNull(notifications.readAt),
          sql`${notifications.dedupeKey} <> ${aviso.dedupeKey}`,
        ),
      );
  }

  if (fechaDeSalida) {
    try {
      avisos.push(...(await avisosDeLanzamiento(userId, fechaDeSalida)));
    } catch {
      // Que el catálogo falle no puede impedir el resto de avisos.
    }
  }

  return guardar(avisos);
}

/** Todos los usuarios con cuenta o juegos, para la pasada del cron. */
export async function usuariosConAvisosPosibles(limite = 50): Promise<string[]> {
  const filas = await db
    .select({ id: users.id })
    .from(users)
    .limit(limite);

  return filas.map((f) => f.id);
}
