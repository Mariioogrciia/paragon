/**
 * Limpia las horas de PSN duplicadas por el bug de psn/client.ts: la misma
 * cifra de horas copiada en cada versión (PS4/PS5/PS3...) de un juego con el
 * mismo nombre, en vez de solo en una. Se queda la de la versión jugada más
 * recientemente (o, si ninguna tiene fecha, la de mayor progreso) y el resto
 * pasa a NULL — no a 0, que significaría "nunca jugado".
 *
 * Solo toca filas con horas duplicadas EXACTAS entre sí para el mismo
 * usuario y título normalizado: si algún día alguien tiene de verdad horas
 * distintas por versión (podría pasar, PSN no lo garantiza), esas no se
 * tocan.
 *
 *   npx tsx scripts/limpiar-horas-duplicadas.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../src/db";
import { games, userGames } from "../src/db/schema";

function normaliza(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const filas = await db
    .select({
      userId: userGames.userId,
      gameId: userGames.gameId,
      title: games.title,
      platform: games.platform,
      playtimeMinutes: userGames.playtimeMinutes,
      lastPlayedAt: userGames.lastPlayedAt,
      progressPercent: userGames.progressPercent,
    })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(and(eq(games.platform, "psn"), isNotNull(userGames.playtimeMinutes)));

  // Agrupa por usuario + título normalizado.
  const grupos = new Map<string, typeof filas>();
  for (const f of filas) {
    const clave = `${f.userId}:${normaliza(f.title)}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }

  let limpiadas = 0;

  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;

    // Duplicado exacto: todas las filas del grupo con las mismas horas.
    const horas = grupo[0].playtimeMinutes;
    const todasIguales = grupo.every((f) => f.playtimeMinutes === horas);
    if (!todasIguales) continue;

    // La que se queda: la jugada más recientemente; si nadie tiene fecha, la
    // de más progreso.
    const ganadora = [...grupo].sort((a, b) => {
      const fechaA = a.lastPlayedAt?.getTime() ?? 0;
      const fechaB = b.lastPlayedAt?.getTime() ?? 0;
      if (fechaA !== fechaB) return fechaB - fechaA;
      return b.progressPercent - a.progressPercent;
    })[0];

    for (const f of grupo) {
      if (f.gameId === ganadora.gameId) continue;

      await db
        .update(userGames)
        .set({ playtimeMinutes: null })
        .where(and(eq(userGames.userId, f.userId), eq(userGames.gameId, f.gameId)));

      limpiadas++;
      console.log(`Limpiado: ${f.title} (${f.platform}, fila ${f.gameId}) para ${f.userId}`);
    }
  }

  console.log(`Listo. ${limpiadas} filas limpiadas.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
