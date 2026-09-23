/**
 * Backfill puntual del bug arreglado en lib/steam/client.ts (23 sept
 * 2026): juegos de Steam con `playtimeRecentMinutes` > 0 (se jugaron en
 * las últimas 2 semanas, según la propia Steam) pero `lastPlayedAt` NULL
 * porque Steam omitió `rtime_last_played` esa sincronización — hasta la
 * próxima pasada del cron para esas cuentas, "Jugado recientemente"
 * seguía sin enseñarlos. Se corrigen a mano una sola vez con la fecha de
 * este script como aproximación (mismo criterio que el fix real: mejor
 * una fecha aproximada que desaparecer de la lista).
 *
 *   npx tsx --conditions react-server scripts/rellenar-lastplayedat-steam.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/db";
import { userGames, games } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

// `playtimeRecentMinutes` solo lo rellena Steam (ver el comentario en
// schema.ts) — no hace falta el join a `games` para filtrar por
// plataforma, cualquier fila con ese campo > 0 ya es de Steam.
const CONDICION = and(isNull(userGames.lastPlayedAt), gt(userGames.playtimeRecentMinutes, 0));

async function main() {
  const afectados = await db
    .select({ userId: userGames.userId, gameId: userGames.gameId, title: games.title })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(and(eq(games.platform, "steam"), CONDICION));

  console.log(`Encontrados ${afectados.length} juegos afectados:`, afectados.map((a) => a.title));

  if (afectados.length === 0) {
    console.log("Nada que corregir.");
    process.exit(0);
  }

  await db.update(userGames).set({ lastPlayedAt: new Date() }).where(CONDICION);

  console.log(`OK: ${afectados.length} filas actualizadas.`);
  process.exit(0);
}

main();
