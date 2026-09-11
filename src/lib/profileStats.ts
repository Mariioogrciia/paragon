import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games as gamesTable, gameTrophies, userGames, userTrophies } from "@/db/schema";
import { listFriends, getProfileByUserId, getUserTimezone, resolveAvatarUrl } from "@/lib/profiles";

/**
 * Datos para /u/[handle]/estadisticas.
 *
 * Ojo con lo que es real y lo que no: PSN y Steam dan un TOTAL acumulado de
 * minutos jugados por juego (`userGames.playtimeMinutes`) y, como mucho, la
 * última vez que se jugó (`lastPlayedAt`) — ninguna de las dos APIs da un
 * registro de sesiones ni de horas por día. Así que "tiempo de juego en el
 * tiempo" no es un dato que exista: lo que SÍ es real, día a día, es cuándo
 * se ganó cada trofeo (`userTrophies.earnedAt`, lo mismo que ya usa
 * `/ritmo`). El mapa de actividad y "días jugados" salen de ahí — son un
 * proxy honesto ("días con trofeos ganados"), no un registro exhaustivo de
 * cada día que se encendió el mando.
 */

export interface DiaActividad {
  /** "YYYY-MM-DD" */
  dia: string;
  trofeos: number;
}

/** Un valor por cada día de la ventana, con los días a cero incluidos — igual que `desgloseDelMes`, pero para todo un año en vez de un mes. */
export async function actividadPorDia(userId: string, dias = 365): Promise<DiaActividad[]> {
  const desde = new Date();
  desde.setUTCDate(desde.getUTCDate() - dias + 1);
  desde.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      dia: sql<string>`to_char(date(${userTrophies.earnedAt}), 'YYYY-MM-DD')`,
      total: sql<number>`count(*)`,
    })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, desde)))
    .groupBy(sql`date(${userTrophies.earnedAt})`);

  const conteo = new Map(rows.map((r) => [r.dia, Number(r.total)]));

  const resultado: DiaActividad[] = [];
  const cursor = new Date(desde);
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);
  while (cursor <= hoy) {
    const clave = cursor.toISOString().slice(0, 10);
    resultado.push({ dia: clave, trofeos: conteo.get(clave) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return resultado;
}

/**
 * Horas totales por juego, de más a menos — no es "en el tiempo" (ver el
 * comentario de arriba), es un ranking estático de dónde se han ido las
 * horas. Excluye deseados, mismo criterio que el resto de estadísticas de
 * la app.
 *
 * Agrupado por `igdbId`, no por `games.id`: el mismo juego en PSN y en
 * Steam son dos filas (`psn-X` / `steam-X`, arquitectura de toda la app),
 * cada una con sus propias horas — aquí interesa "cuánto le he echado a
 * este juego en total", así que se suman en una sola fila. Los manuales sin
 * `igdbId` (o cualquier fila suelta) caen cada uno en la suya, con su
 * propio `games.id` como clave.
 */
export async function horasPorJuego(userId: string, limit?: number): Promise<{ gameId: string; titulo: string; iconUrl: string | null; horas: number }[]> {
  const clave = sql<string>`coalesce(${gamesTable.igdbId}::text, ${userGames.gameId})`;

  // `limit` es opcional a propósito: `PlaytimeBarChart` (componente) pide
  // la lista COMPLETA (sin pasar `limit`) para poder enseñar un "Ver más"
  // que despliegue TODOS los juegos con horas, no solo el top 8 que se
  // pedía antes directamente en esta consulta — recortar aquí habría
  // hecho imposible el "ver más" sin volver a pedir datos al servidor.
  let query = db
    .select({
      clave,
      titulo: sql<string>`max(${gamesTable.title})`,
      iconUrl: sql<string | null>`max(${gamesTable.iconUrl})`,
      minutos: sql<number>`sum(${userGames.playtimeMinutes})`,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), isNotNull(userGames.playtimeMinutes)))
    .groupBy(clave)
    .orderBy(desc(sql`sum(${userGames.playtimeMinutes})`))
    .$dynamic();

  if (limit != null) query = query.limit(limit);

  const rows = await query;

  return rows.map((r) => ({
    gameId: r.clave,
    titulo: r.titulo,
    iconUrl: r.iconUrl,
    horas: Math.round(Number(r.minutos ?? 0) / 60),
  }));
}

/** Suma de TODAS las horas registradas (no solo el top N de `horasPorJuego`) — para "si las juntas seguidas, son X días". */
export async function horasTotales(userId: string): Promise<number> {
  const [row] = await db
    .select({ minutos: sql<number>`coalesce(sum(${userGames.playtimeMinutes}), 0)` })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false)));

  return Math.round(Number(row?.minutos ?? 0) / 60);
}

export interface StatsAmigo {
  userId: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | undefined;
  horas: number;
  trofeos: number;
  platinos: number;
  juegos: number;
}

/**
 * Tú y tus amigos, con los mismos números que ya enseña cada perfil.
 *
 * Antes esto llamaba a `getLibrary()` (la consulta más cara del
 * proyecto — trae CADA juego con su rareza de platino por subconsulta,
 * y de paso puede disparar un backfill de PEGI contra IGDB) una vez POR
 * PERSONA — con 20 amigos, 20 consultas pesadas en paralelo solo para
 * sacar 4 números de cada uno. Encontrado en el repaso de rendimiento
 * del 10 de septiembre de 2026; el comentario que había aquí antes
 * ("con el puñado de amigos que tiene cualquiera, es barato") ya no se
 * sostiene con las funciones que se han ido sumando encima de
 * `getLibrary` desde entonces.
 *
 * Arreglado con UNA sola consulta agregada (`userId IN (...)`) que
 * replica EXACTAMENTE la misma regla que `summarise()`/
 * `esPlatinoEquivalente()` (lib/stats.ts) — platino real O 100% de
 * Steam, deseados excluidos — para no reimplementar el conteo con una
 * regla que se pueda desincronizar de la que usa el resto de la app.
 * Sin tocar `getLibrary` para nada de esto: de paso, mirar tus
 * estadísticas de amigos ya no dispara backfills de metadatos sobre SUS
 * juegos, que nunca debió depender de que tú abrieras esta pantalla.
 */
export async function estadisticasAmigos(userId: string): Promise<StatsAmigo[]> {
  const propio = await getProfileByUserId(userId);
  if (!propio) return [];

  const amigos = await listFriends(userId);
  const personas = [
    { userId, handle: propio.handle, displayName: propio.displayName, avatarUrl: resolveAvatarUrl(propio) },
    ...amigos.map((a) => ({ userId: a.userId, handle: a.handle, displayName: a.displayName, avatarUrl: a.avatarUrl ?? undefined })),
  ];

  const ids = personas.map((p) => p.userId);
  const filas = await db
    .select({
      userId: userGames.userId,
      juegos: sql<number>`count(*) filter (where ${userGames.isWishlist} = false)`,
      trofeos: sql<number>`coalesce(sum(${userGames.earnedTotal}) filter (where ${userGames.isWishlist} = false), 0)`,
      // Misma regla que esPlatinoEquivalente(): platino real (metal) O
      // 100% en Steam — no hay platino real que contar en Steam.
      platinos: sql<number>`count(*) filter (
        where ${userGames.isWishlist} = false
          and (
            (${userGames.earned}->>'platinum')::int > 0
            or (${gamesTable.platform} = 'steam' and ${userGames.progressPercent} = 100)
          )
      )`,
      minutos: sql<number>`coalesce(sum(${userGames.playtimeMinutes}) filter (where ${userGames.isWishlist} = false), 0)`,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(inArray(userGames.userId, ids))
    .groupBy(userGames.userId);

  const statsPorId = new Map(filas.map((f) => [f.userId, f]));

  return personas
    .map((persona) => {
      const s = statsPorId.get(persona.userId);
      return {
        ...persona,
        horas: Math.round(Number(s?.minutos ?? 0) / 60),
        trofeos: Number(s?.trofeos ?? 0),
        platinos: Number(s?.platinos ?? 0),
        juegos: Number(s?.juegos ?? 0),
      };
    })
    .sort((a, b) => b.horas - a.horas);
}

export interface CeldaHoraria {
  /** 0 = domingo ... 6 = sábado (como `extract(dow)` de Postgres). */
  dow: number;
  /** 0-23, en la zona horaria del propio usuario, no en UTC. */
  hora: number;
  trofeos: number;
}

/**
 * Igual que `actividadPorDia`, pero cruzado por franja horaria — a qué hora
 * del día y qué día de la semana caen de verdad tus trofeos, no solo qué
 * día. Se convierte a la zona horaria guardada en Ajustes (`users.timezone`,
 * por defecto Europe/Madrid): sin esto, todo el mundo aparecería jugando de
 * madrugada en UTC. Sin ventana de tiempo a propósito — a diferencia del
 * heatmap anual, aquí interesa el patrón de siempre, no solo el último año.
 */
export async function franjasHorarias(userId: string): Promise<CeldaHoraria[]> {
  const tz = await getUserTimezone(userId);

  const rows = await db
    .select({
      dow: sql<number>`extract(dow from (${userTrophies.earnedAt} at time zone 'UTC' at time zone ${tz}))::int`,
      hora: sql<number>`extract(hour from (${userTrophies.earnedAt} at time zone 'UTC' at time zone ${tz}))::int`,
      total: sql<number>`count(*)`,
    })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), isNotNull(userTrophies.earnedAt)))
    .groupBy(sql`1`, sql`2`);

  return rows.map((r) => ({ dow: Number(r.dow), hora: Number(r.hora), trofeos: Number(r.total) }));
}

export interface PrimerPlatino {
  gameId: string;
  titulo: string;
  iconUrl: string | null;
  fecha: string;
}

export interface TrofeoMasRaro {
  gameId: string;
  tituloJuego: string;
  nombre: string;
  iconUrl: string | null;
  rarityPercent: number;
  fecha: string | null;
}

export interface PlatinoAnejo {
  gameId: string;
  titulo: string;
  iconUrl: string | null;
  dias: number;
  desde: string;
  hasta: string;
}

export interface RachaMasLarga {
  dias: number;
  desde: string;
  hasta: string;
}

export interface HitosHistoricos {
  primerPlatino: PrimerPlatino | null;
  trofeoMasRaro: TrofeoMasRaro | null;
  platinoAnejo: PlatinoAnejo | null;
  rachaMasLarga: RachaMasLarga | null;
}

/**
 * Hitos de toda tu carrera de trofeos, no de una ventana de tiempo: tu
 * primer platino, el trofeo más raro que tienes, el platino que más tardó en
 * caer desde el primer trofeo del juego (el "añejo"), y tu racha más larga de
 * días seguidos ganando al menos un trofeo.
 *
 * "Platino" usa el mismo criterio que el resto de la app
 * (`esPlatinoEquivalente` en lib/stats.ts: platino real en PSN, o 100% en
 * Steam — no hay trofeo de platino que contar ahí) reescrito en SQL porque
 * aquí hace falta cruzarlo con fechas de trofeos, no con la lista de juegos
 * ya resuelta que usa `summarise()`.
 */
export async function hitosHistoricos(userId: string): Promise<HitosHistoricos> {
  const platinoCond = sql`(
    coalesce((${userGames.earned}->>'platinum')::int, 0) > 0
    or (${gamesTable.platform} = 'steam' and ${userGames.progressPercent} = 100)
  )`;

  const [platinos, [raro], rachaDias] = await Promise.all([
    db
      .select({
        gameId: userGames.gameId,
        titulo: sql<string>`max(${gamesTable.title})`,
        iconUrl: sql<string | null>`max(${gamesTable.iconUrl})`,
        inicio: sql<string | null>`min(${userTrophies.earnedAt})`,
        fin: sql<string | null>`max(${userTrophies.earnedAt})`,
      })
      .from(userGames)
      .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
      .innerJoin(
        userTrophies,
        and(eq(userTrophies.userId, userGames.userId), eq(userTrophies.gameId, userGames.gameId), eq(userTrophies.earned, true)),
      )
      .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), platinoCond))
      .groupBy(userGames.gameId),

    db
      .select({
        gameId: userTrophies.gameId,
        tituloJuego: gamesTable.title,
        nombre: gameTrophies.name,
        iconUrl: gameTrophies.iconUrl,
        rarityPercent: userTrophies.rarityPercent,
        fecha: userTrophies.earnedAt,
      })
      .from(userTrophies)
      .innerJoin(gamesTable, eq(gamesTable.id, userTrophies.gameId))
      .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
      .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), isNotNull(userTrophies.rarityPercent)))
      .orderBy(asc(userTrophies.rarityPercent))
      .limit(1),

    db
      .select({ dia: sql<string>`to_char(date(${userTrophies.earnedAt}), 'YYYY-MM-DD')` })
      .from(userTrophies)
      .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), isNotNull(userTrophies.earnedAt)))
      .groupBy(sql`date(${userTrophies.earnedAt})`)
      .orderBy(sql`date(${userTrophies.earnedAt})`),
  ]);

  const validos = platinos.filter((p): p is typeof p & { inicio: string; fin: string } => p.inicio != null && p.fin != null);

  const masAntiguo = validos.length ? validos.reduce((a, b) => (new Date(a.fin) <= new Date(b.fin) ? a : b)) : null;
  const primerPlatino: PrimerPlatino | null = masAntiguo
    ? { gameId: masAntiguo.gameId, titulo: masAntiguo.titulo, iconUrl: masAntiguo.iconUrl, fecha: new Date(masAntiguo.fin).toISOString() }
    : null;

  const platinoAnejo: PlatinoAnejo | null = validos.length
    ? (() => {
        const conDias = validos.map((p) => ({
          ...p,
          dias: Math.round((new Date(p.fin).getTime() - new Date(p.inicio).getTime()) / 86_400_000),
        }));
        const peor = conDias.reduce((a, b) => (a.dias >= b.dias ? a : b));
        return {
          gameId: peor.gameId,
          titulo: peor.titulo,
          iconUrl: peor.iconUrl,
          dias: peor.dias,
          desde: new Date(peor.inicio).toISOString(),
          hasta: new Date(peor.fin).toISOString(),
        };
      })()
    : null;

  // Racha más larga de días consecutivos con al menos un trofeo — sin
  // ventana de tiempo, todo el historial. Los días vienen ya ordenados por
  // la consulta; solo hace falta contar tramos de días seguidos.
  let rachaMasLarga: RachaMasLarga | null = null;
  if (rachaDias.length > 0) {
    let mejorLargo = 1;
    let mejorDesde = rachaDias[0].dia;
    let mejorHasta = rachaDias[0].dia;
    let largoActual = 1;
    let desdeActual = rachaDias[0].dia;

    for (let i = 1; i < rachaDias.length; i++) {
      const anterior = new Date(`${rachaDias[i - 1].dia}T00:00:00Z`);
      const actual = new Date(`${rachaDias[i].dia}T00:00:00Z`);
      const diff = Math.round((actual.getTime() - anterior.getTime()) / 86_400_000);

      if (diff === 1) {
        largoActual++;
      } else {
        largoActual = 1;
        desdeActual = rachaDias[i].dia;
      }

      if (largoActual > mejorLargo) {
        mejorLargo = largoActual;
        mejorDesde = desdeActual;
        mejorHasta = rachaDias[i].dia;
      }
    }

    rachaMasLarga = { dias: mejorLargo, desde: mejorDesde, hasta: mejorHasta };
  }

  return {
    primerPlatino,
    trofeoMasRaro: raro
      ? {
          gameId: raro.gameId,
          tituloJuego: raro.tituloJuego,
          nombre: raro.nombre,
          iconUrl: raro.iconUrl,
          rarityPercent: raro.rarityPercent!,
          fecha: raro.fecha ? raro.fecha.toISOString() : null,
        }
      : null,
    platinoAnejo,
    rachaMasLarga,
  };
}

/**
 * "Detector de Atascos": días desde el último trofeo CONSEGUIDO de un
 * juego — para el aviso del juego anclado (`pinnedAt`) en la portada. `null`
 * si nunca se ha conseguido ningún trofeo con fecha en ese juego (recién
 * empezado, o sincronizado sin fechas todavía) — ahí no hay "atasco" que
 * detectar, solo falta de dato, y las dos cosas no deben confundirse.
 */
export async function diasSinAvance(userId: string, gameId: string): Promise<number | null> {
  const [fila] = await db
    .select({ ultimo: sql<Date | null>`max(${userTrophies.earnedAt})` })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.gameId, gameId), eq(userTrophies.earned, true)));

  if (!fila?.ultimo) return null;
  return Math.floor((Date.now() - new Date(fila.ultimo).getTime()) / 86_400_000);
}
