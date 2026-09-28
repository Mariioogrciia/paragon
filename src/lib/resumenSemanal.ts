import "server-only";
import { and, count, countDistinct, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, gameTrophies, notificationLog, userTrophies, users } from "@/db/schema";
import { enviarDmSiActivo } from "@/lib/discordBot";
import { rachas } from "@/lib/history";
import { getLigaMensual } from "@/lib/ligas";
import { claveSemana, esMomentoDelResumen } from "@/lib/semana";

const TIPO = "resumen-semanal";

/**
 * Resumen semanal por DM de Discord, los domingos por la tarde (hora de
 * Madrid): trofeos y platinos de la semana, racha y puesto en la liga
 * mensual. Solo a quien tiene Discord vinculado y los DM activados en
 * Ajustes — el mismo interruptor que el resto de avisos del bot.
 *
 * Lo lanza el cron (cada 10 min): en cada pasada del domingo por la tarde
 * se ocupa de unos pocos usuarios que aún no lo tengan esta semana
 * (`notification_log`), hasta que no queda ninguno.
 */
export async function enviarResumenesSemanales(hasta: number, ahora = new Date(), maximo = 8): Promise<number> {
  if (!esMomentoDelResumen(ahora)) return 0;
  const clave = claveSemana(ahora);

  const candidatos = await db
    .select({ userId: users.id, name: users.name })
    .from(users)
    .innerJoin(accounts, and(eq(accounts.userId, users.id), eq(accounts.provider, "discord")))
    .where(
      and(
        eq(users.discordDmEnabled, true),
        sql`not exists (select 1 from ${notificationLog} n where n."userId" = ${users.id} and n.tipo = ${TIPO} and n.clave = ${clave})`,
      ),
    )
    .limit(maximo);
  if (candidatos.length === 0) return 0;

  const hace7Dias = new Date(ahora.getTime() - 7 * 86_400_000);
  const ids = candidatos.map((c) => c.userId);
  const [semana, liga] = await Promise.all([
    db
      .select({
        userId: userTrophies.userId,
        trofeos: count(),
        platinos: sql<number>`count(*) filter (where ${gameTrophies.grade} = 'platinum')`,
        juegos: countDistinct(userTrophies.gameId),
      })
      .from(userTrophies)
      .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
      .where(and(inArray(userTrophies.userId, ids), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, hace7Dias)))
      .groupBy(userTrophies.userId),
    getLigaMensual(ahora).catch(() => []),
  ]);
  const porUsuario = new Map(semana.map((s) => [s.userId, s]));

  let enviados = 0;
  for (const { userId } of candidatos) {
    if (Date.now() > hasta) break;
    const datos = porUsuario.get(userId);
    const racha = await rachas(userId).catch(() => null);
    const puesto = liga.findIndex((l) => l.userId === userId);

    const lineas = [
      datos
        ? `🏆 **${Number(datos.trofeos)}** trofeos en **${Number(datos.juegos)}** juegos${Number(datos.platinos) > 0 ? ` · 💎 **${Number(datos.platinos)}** platino${Number(datos.platinos) > 1 ? "s" : ""}` : ""}`
        : "Esta semana no ha caído ningún trofeo — ¿retomamos algo?",
      racha && racha.actual > 0 ? `🔥 Racha de **${racha.actual}** día${racha.actual > 1 ? "s" : ""}${racha.hoyCuenta ? "" : " (¡consigue uno hoy para no perderla!)"}` : null,
      puesto >= 0 ? `📊 Vas **${puesto + 1}º** de ${liga.length} en la liga del mes` : null,
    ].filter(Boolean);

    await enviarDmSiActivo(userId, { titulo: "📅 Tu semana en Paragon", texto: lineas.join("\n"), ruta: "/ritmo" });
    // Se apunta aunque el DM falle por dentro (enviarDmSiActivo no lanza):
    // mejor perder un resumen que mandar el mismo cada 10 minutos.
    await db.insert(notificationLog).values({ userId, tipo: TIPO, clave }).onConflictDoNothing();
    enviados++;
  }
  return enviados;
}
