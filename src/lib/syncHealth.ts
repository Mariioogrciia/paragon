import "server-only";
import { and, asc, eq, isNull, or, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { userGames } from "@/db/schema";
import type { Platform } from "@/lib/types";

/**
 * Salud de la sincronización de una biblioteca.
 *
 * El problema real que resuelve: la biblioteca guarda cuántos trofeos tiene
 * cada juego, pero el DETALLE (qué trofeo y cuándo) solo llega al pedirlo
 * juego a juego, y eso pasa al abrir su ficha o cuando el cron va rellenando
 * unos cuantos por pasada. Con una biblioteca grande eso deja durante días
 * un montón de juegos "a medias" — y hasta ahora no había NINGUNA forma de
 * verlo desde la app: ni cuántos van, ni cuántos faltan, ni si algo se quedó
 * atascado. Medido en la base real: 59 juegos de PSN sin detalle nunca y 204
 * sin refrescar en más de 6 horas, sin que nada lo dijera en pantalla.
 */

/** A partir de aquí se considera que un juego está "sin refrescar". Mismo
 * umbral que usa la sincronización automática de la ficha de juego. */
export const HORAS_CADUCIDAD = 6;

/**
 * Lo mismo, pero solo para Xbox — bajado a 1h el 21 de septiembre de 2026 a
 * petición del usuario, que es (todavía) el ÚNICO con Xbox vinculado en toda
 * la plataforma: con un solo usuario, el riesgo real de agotar el cupo
 * compartido de OpenXBL (150/hora) es minúsculo, y 6h de caché hacía que un
 * trofeo recién conseguido tardara horas en aparecer. Si se suman más
 * usuarios de Xbox, esto habrá que revisarlo — volver a subirlo, o volver a
 * medir el cupo real gastado por hora.
 */
export const HORAS_CADUCIDAD_XBOX = 1;

/** El umbral de caducidad que toca según la plataforma — ver `HORAS_CADUCIDAD_XBOX`. */
export function horasCaducidadDe(plataforma: string): number {
  return plataforma === "xbox" ? HORAS_CADUCIDAD_XBOX : HORAS_CADUCIDAD;
}

export interface SaludPlataforma {
  plataforma: Platform;
  /** Juegos de esa plataforma en la biblioteca. */
  total: number;
  /** Nunca se ha pedido su detalle de trofeos. */
  sinDetalle: number;
  /** Tienen detalle, pero de hace más de `HORAS_CADUCIDAD`. */
  caducados: number;
}

/** `gameId` es "<plataforma>-<idNativo>", así que la plataforma sale del id
 * sin tener que unir con `games`. */
const PLATAFORMA = sql<string>`split_part(${userGames.gameId}, '-', 1)`;

export async function saludSincronizacion(userId: string): Promise<SaludPlataforma[]> {
  // ISO string, NO un Date: meter un `Date` de JS dentro de un fragmento
  // `sql` crudo revienta siempre ("The string argument must be of type
  // string... Received an instance of Date"), porque ahi drizzle no conoce
  // el tipo de la columna y lo pasa tal cual al driver. Con los operadores
  // tipados de drizzle (`lt`, `gte`...) si funciona un Date, porque esos si
  // saben contra que columna comparan. Comprobado a mano contra la base.
  const desde = new Date(Date.now() - HORAS_CADUCIDAD * 60 * 60 * 1000).toISOString();
  const desdeXbox = new Date(Date.now() - HORAS_CADUCIDAD_XBOX * 60 * 60 * 1000).toISOString();

  const filas = await db
    .select({
      plataforma: PLATAFORMA,
      total: sql<number>`count(*)::int`,
      sinDetalle: sql<number>`count(*) filter (where ${userGames.trophiesSyncedAt} is null)::int`,
      // Xbox caduca antes que el resto (HORAS_CADUCIDAD_XBOX) — ver el
      // comentario de esa constante. El `::timestamp` del `case` es
      // obligatorio: sin él, Postgres recibe los dos ISO strings como
      // `text` (el driver no sabe que van a compararse con una columna de
      // fecha) y revienta con "operator does not exist: timestamp without
      // time zone < text" — visto en producción el 22 de septiembre de
      // 2026 al abrir Ajustes → Plataformas.
      caducados: sql<number>`count(*) filter (
        where ${userGames.trophiesSyncedAt} < (case when ${PLATAFORMA} = 'xbox' then ${desdeXbox} else ${desde} end)::timestamp
      )::int`,
    })
    .from(userGames)
    .where(eq(userGames.userId, userId))
    .groupBy(PLATAFORMA);

  return filas
    .map((f) => ({
      plataforma: f.plataforma as Platform,
      total: Number(f.total),
      sinDetalle: Number(f.sinDetalle),
      caducados: Number(f.caducados),
    }))
    // Los juegos añadidos a mano no se sincronizan contra nada: contarlos
    // como "pendientes" sería prometer un trabajo que nunca va a ocurrir.
    .filter((f) => f.plataforma !== "manual")
    .sort((a, b) => b.total - a.total);
}

/**
 * Los juegos que más falta hacen refrescar, en orden: primero los que no
 * tienen detalle NUNCA (son los que dejan huecos en el histórico), luego los
 * más antiguos.
 *
 * Solo PSN y Steam, igual que la sincronización automática de la ficha:
 * OpenXBL da 150 peticiones/hora COMPARTIDAS entre todos los usuarios de
 * Paragon (ver lib/xbl/client.ts), así que una puesta al día masiva de Xbox
 * a petición de una sola persona puede dejar sin cuota a todos los demás.
 */
export async function juegosPendientes(userId: string, limite: number): Promise<string[]> {
  const desde = new Date(Date.now() - HORAS_CADUCIDAD * 60 * 60 * 1000);

  const filas = await db
    .select({ gameId: userGames.gameId })
    .from(userGames)
    .where(
      and(
        eq(userGames.userId, userId),
        or(isNull(userGames.trophiesSyncedAt), lt(userGames.trophiesSyncedAt, desde)),
        or(
          sql`${PLATAFORMA} = 'psn'`,
          sql`${PLATAFORMA} = 'steam'`,
        ),
      ),
    )
    // `nulls first` es justo lo que hace falta: los que no se han pedido
    // nunca van antes que los simplemente viejos.
    .orderBy(sql`${userGames.trophiesSyncedAt} asc nulls first`)
    .limit(limite);

  return filas.map((f) => f.gameId);
}
