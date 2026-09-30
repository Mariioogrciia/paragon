import "server-only";
import { and, eq, gt, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, leaguePositions, notificationLog, userGames, users } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";
import { fechasLanzamiento } from "@/lib/igdb/client";
import { getLigaMensual } from "@/lib/ligas";
import { normalizarPerdibles } from "@/lib/perdibles";

/**
 * Avisos que lanza el cron solos (29 sept 2026): perdibles al empezar un
 * juego, lanzamiento de un deseado y "te han adelantado en la liga". Cada
 * uno se apunta en `notification_log` para no repetirse.
 */

/**
 * Solo juegos que entran en la biblioteca a partir de hoy: los de antes
 * tienen todos la misma fecha de alta (la de la migración de `createdAt`,
 * ver schema.ts) y sin este tope el primer despliegue avisaría de golpe de
 * todos los perdibles de toda la biblioteca de todo el mundo.
 */
const INICIO_AVISO_PERDIBLES = new Date("2026-09-29T00:00:00Z");

async function yaAvisado(userId: string, tipo: string, clave: string): Promise<boolean> {
  const [fila] = await db
    .select({ userId: notificationLog.userId })
    .from(notificationLog)
    .where(and(eq(notificationLog.userId, userId), eq(notificationLog.tipo, tipo), eq(notificationLog.clave, clave)))
    .limit(1);
  return Boolean(fila);
}

async function apuntar(userId: string, tipo: string, clave: string): Promise<void> {
  await db.insert(notificationLog).values({ userId, tipo, clave }).onConflictDoNothing();
}

/** "⚠️ Este juego tiene trofeos perdibles" al empezar uno (progreso > 0 y < 50%). */
export async function avisarPerdibles(hasta: number, maximo = 10): Promise<number> {
  const hace14Dias = new Date(Date.now() - 14 * 86_400_000);
  const desde = hace14Dias > INICIO_AVISO_PERDIBLES ? hace14Dias : INICIO_AVISO_PERDIBLES;

  const candidatos = await db
    .select({
      userId: userGames.userId,
      gameId: userGames.gameId,
      titulo: games.title,
      perdibles: games.missableTrophies,
      handle: users.handle,
    })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .innerJoin(users, eq(users.id, userGames.userId))
    .where(
      and(
        eq(userGames.isWishlist, false),
        gt(userGames.createdAt, desde),
        gt(userGames.progressPercent, 0),
        lt(userGames.progressPercent, 50),
        // `jsonb_typeof` antes que la longitud: hay filas con el JSON
        // codificado dos veces (ver lib/perdibles.ts) y `jsonb_array_length`
        // revienta con un valor que no es lista.
        sql`jsonb_typeof(${games.missableTrophies}) in ('array', 'string')`,
        sql`not exists (select 1 from ${notificationLog} n where n."userId" = ${userGames.userId} and n.tipo = 'perdibles' and n.clave = ${userGames.gameId})`,
      ),
    )
    .limit(maximo);

  let enviados = 0;
  for (const c of candidatos) {
    if (Date.now() > hasta) break;
    const lista = normalizarPerdibles(c.perdibles);
    if (lista.length > 0) {
      const primeros = lista.slice(0, 3).map((n) => `«${n}»`).join(", ");
      await avisarUsuario(c.userId, {
        titulo: `⚠️ ${c.titulo} tiene ${lista.length} trofeo${lista.length === 1 ? "" : "s"} perdible${lista.length === 1 ? "" : "s"}`,
        texto: `Míralos antes de avanzar: ${primeros}${lista.length > 3 ? "…" : ""}`,
        ruta: c.handle ? `/u/${c.handle}/${c.gameId}` : undefined,
      }, "perdibles");
      enviados++;
    }
    // Se apunta también si al final la lista estaba vacía: no hay nada que
    // avisar ni ahora ni en la próxima pasada.
    await apuntar(c.userId, "perdibles", c.gameId);
  }
  return enviados;
}

/** "🎮 Sale hoy/mañana" un juego de la lista de deseados. */
export async function avisarLanzamientos(hasta: number, ahora = new Date()): Promise<number> {
  const deseados = await db
    .select({ userId: userGames.userId, gameId: userGames.gameId, igdbId: games.igdbId, titulo: games.title })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(and(eq(userGames.isWishlist, true), isNotNull(games.igdbId)));
  if (deseados.length === 0) return 0;

  const fechas = await fechasLanzamiento(deseados.map((d) => d.igdbId!));
  const hoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());

  let enviados = 0;
  for (const d of deseados) {
    if (Date.now() > hasta) break;
    const fecha = fechas.get(d.igdbId!);
    if (!fecha) continue;
    const dias = Math.round((fecha.getTime() - hoy) / 86_400_000);
    if (dias !== 0 && dias !== 1) continue;
    if (await yaAvisado(d.userId, "lanzamiento", d.gameId)) continue;

    await avisarUsuario(d.userId, {
      titulo: dias === 0 ? `🎮 ¡${d.titulo} sale hoy!` : `🎮 ${d.titulo} sale mañana`,
      texto: "Está en tu lista de deseados de Paragon.",
      ruta: `/juego/${encodeURIComponent(d.igdbId ? String(d.igdbId) : d.gameId)}`,
    }, "lanzamientos");
    await apuntar(d.userId, "lanzamiento", d.gameId);
    enviados++;
  }
  return enviados;
}

/**
 * "📉 Te han adelantado en la liga del mes". Compara el ranking actual con
 * el último guardado en `league_position`; como mucho un aviso al día por
 * persona, para que una tarde de trofeos de otro no se convierta en diez
 * notificaciones.
 */
export async function avisarAdelantos(hasta: number, ahora = new Date()): Promise<number> {
  const liga = await getLigaMensual(ahora);
  if (liga.length < 2) return 0;
  const mes = ahora.toISOString().slice(0, 7);
  const dia = ahora.toISOString().slice(0, 10);

  const anteriores = await db
    .select({ userId: leaguePositions.userId, puesto: leaguePositions.puesto })
    .from(leaguePositions)
    .where(and(eq(leaguePositions.clave, mes), inArray(leaguePositions.userId, liga.map((l) => l.userId))));
  const puestoAnterior = new Map(anteriores.map((a) => [a.userId, a.puesto]));

  let enviados = 0;
  for (let i = 0; i < liga.length; i++) {
    if (Date.now() > hasta) break;
    const yo = liga[i];
    const antes = puestoAnterior.get(yo.userId);
    const ahoraPuesto = i + 1;
    // Sin puesto anterior (primera pasada del mes o recién llegado) no hay
    // con qué comparar: se guarda y ya.
    if (antes === undefined || ahoraPuesto <= antes || yo.points === 0) continue;

    // Quien tengo justo delante y antes iba por detrás de mí.
    const adelantador = liga[i - 1];
    const suAnterior = adelantador ? puestoAnterior.get(adelantador.userId) : undefined;
    if (!adelantador || (suAnterior !== undefined && suAnterior < antes)) continue;
    if (await yaAvisado(yo.userId, "adelanto", dia)) continue;

    const nombre = adelantador.name?.trim().split(/\s+/)[0] || (adelantador.handle ? `@${adelantador.handle}` : "Alguien");
    await avisarUsuario(yo.userId, {
      titulo: `📉 ${nombre} te ha adelantado en la liga`,
      texto: `Ahora vas ${ahoraPuesto}º de ${liga.length} en la liga del mes (${adelantador.points - yo.points} puntos por detrás).`,
      ruta: "/ligas",
    }, "ligas");
    await apuntar(yo.userId, "adelanto", dia);
    enviados++;
  }

  // Foto del ranking actual para la próxima comparación.
  await db
    .insert(leaguePositions)
    .values(liga.map((l, i) => ({ userId: l.userId, clave: mes, puesto: i + 1, actualizadoAt: ahora })))
    .onConflictDoUpdate({
      target: [leaguePositions.userId, leaguePositions.clave],
      set: { puesto: sql`excluded."puesto"`, actualizadoAt: sql`excluded."actualizadoAt"` },
    });
  return enviados;
}
