import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, games, notificationLog, userGames } from "@/db/schema";

/**
 * "¿Lo compartes?" al sacar un platino (16 oct 2026). La idea: cada platino
 * compartido en Instagram o TikTok, con la dirección de Paragon visible, es
 * publicidad que no cuesta nada. Ya existían las tarjetas (la de la web en
 * /api/trophy-card y la de la app en TrophyShareCard.kt), pero solo si
 * alguien iba a buscar el botón en la ficha del juego.
 *
 * El platino suele llegar con la sincronización de fondo (el cron), sin
 * nadie delante de la pantalla: por eso no se pregunta en el momento, sino
 * la próxima vez que se abre la web o la app. La fuente es la actividad
 * `platinum` que ya crea `syncGameTrophies` (lib/sync.ts) solo con un
 * platino nuevo de verdad (nunca en la primera sincronización). Se pregunta
 * una sola vez por platino: al compartir o al decir "ahora no" se apunta en
 * `notification_log` (tipo `compartir-platino`, clave = gameId).
 */

const TIPO = "compartir-platino";
/** Un platino de hace más de una semana ya no se celebra: no se pregunta. */
const DIAS_VIGENTE = 7;

export interface PlatinoPorCompartir {
  gameId: string;
  titulo: string;
  coverUrl: string | null;
  earnedTotal: number;
  definedTotal: number;
}

export async function platinoPorCompartir(userId: string): Promise<PlatinoPorCompartir | null> {
  const desde = new Date(Date.now() - DIAS_VIGENTE * 24 * 60 * 60 * 1000);
  const [fila] = await db
    .select({
      gameId: games.id,
      titulo: games.title,
      coverUrl: games.iconUrl,
      earnedTotal: userGames.earnedTotal,
      definedTotal: games.definedTotal,
    })
    .from(activities)
    .innerJoin(games, eq(games.id, activities.gameId))
    .innerJoin(userGames, and(eq(userGames.userId, activities.userId), eq(userGames.gameId, activities.gameId)))
    .where(
      and(
        eq(activities.userId, userId),
        eq(activities.type, "platinum"),
        gte(activities.createdAt, desde),
        sql`not exists (select 1 from ${notificationLog} n where n."userId" = ${userId} and n.tipo = ${TIPO} and n.clave = ${activities.gameId})`,
      ),
    )
    .orderBy(desc(activities.createdAt))
    .limit(1);
  return fila ?? null;
}

/** Ya se preguntó por este platino (compartido o "ahora no"): no se vuelve a sacar. */
export async function marcarPlatinoPreguntado(userId: string, gameId: string): Promise<void> {
  await db.insert(notificationLog).values({ userId, tipo: TIPO, clave: gameId }).onConflictDoNothing();
}
