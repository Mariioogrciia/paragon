/**
 * Vuelve a traer las horas de PSN de todos los usuarios con esa cuenta
 * vinculada, con el reparto corregido (repartirHoras en psn/client.ts):
 * la primera versión del arreglo colapsaba sesiones REALES y distintas de
 * un mismo juego (p. ej. 1620h en PS4 + 95h en PS5) en una sola, perdiendo
 * la mayor. Esto solo toca `playtimeMinutes` — nada de trofeos ni progreso,
 * que ya estaban bien — así que es más rápido y más seguro que una
 * resincronización completa.
 *
 *   npx tsx scripts/resincronizar-horas-psn.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, and } from "drizzle-orm";
import { db } from "../src/db";
import { platformAccounts, userGames, users } from "../src/db/schema";
import { fetchLibrary } from "../src/lib/psn/client";

async function main() {
  const cuentas = await db
    .select({ userId: platformAccounts.userId, accountId: platformAccounts.accountId, handle: users.handle })
    .from(platformAccounts)
    .innerJoin(users, eq(users.id, platformAccounts.userId))
    .where(eq(platformAccounts.platform, "psn"));

  for (const cuenta of cuentas) {
    console.log(`--- @${cuenta.handle ?? cuenta.userId} ---`);

    let library;
    try {
      library = await fetchLibrary(cuenta.accountId);
    } catch (error) {
      console.error("  fetchLibrary falló:", error);
      continue;
    }

    let actualizados = 0;
    for (const game of library) {
      if (game.playtimeMinutes === undefined) continue;

      const resultado = await db
        .update(userGames)
        .set({ playtimeMinutes: game.playtimeMinutes })
        .where(and(eq(userGames.userId, cuenta.userId), eq(userGames.gameId, game.id)));

      actualizados++;
      void resultado;
    }
    console.log(`  ${actualizados} filas con horas actualizadas.`);
  }

  console.log("Listo.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
