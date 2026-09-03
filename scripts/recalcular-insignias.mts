/**
 * Vuelve a comprobar las insignias de TODOS los usuarios.
 *
 * `checkAndGrantBadges` (lib/profiles.ts) solo se llama al vincular o
 * sincronizar una cuenta. Cuando cambia la propia regla — como al añadir
 * que un 100% de Steam cuenta como platino (lib/stats.ts,
 * esPlatinoEquivalente) — quien ya cumplía esa condición de antes se queda
 * sin la insignia hasta su próxima sincronización. Esto la fuerza para todo
 * el mundo, ahora, sin esperar.
 *
 * No importa `lib/profiles.ts` directamente: lleva `import "server-only"`,
 * que revienta fuera de Next. La consulta de abajo es la misma que
 * `checkAndGrantBadges`, copiada a mano — si esa función cambia, esto hay
 * que actualizarlo o volverá a quedarse corto la próxima vez que cambie la
 * regla.
 *
 *   npx tsx scripts/recalcular-insignias.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { games, userBadges, userGames, users } from "../src/db/schema";

async function grantBadge(userId: string, badgeId: string) {
  await db.insert(userBadges).values({ userId, badgeId }).onConflictDoNothing();
}

async function checkAndGrantBadges(userId: string) {
  await grantBadge(userId, "madrugador");

  const result = await db
    .select({
      totalGames: sql<number>`count(distinct ${userGames.gameId})`,
      totalPlatinums: sql<number>`
        coalesce(sum(CAST(${userGames.earned}->>'platinum' AS INTEGER)), 0)
        + count(*) filter (
          where ${games.platform} = 'steam' and ${userGames.progressPercent} = 100
        )
      `,
    })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(eq(userGames.userId, userId));

  const platinums = Number(result[0]?.totalPlatinums ?? 0);
  const juegos = Number(result[0]?.totalGames ?? 0);

  if (platinums >= 1) await grantBadge(userId, "first_blood");
  if (platinums >= 10) await grantBadge(userId, "cazador");
  if (platinums >= 50) await grantBadge(userId, "experto");
  if (platinums >= 100) await grantBadge(userId, "leyenda");
  if (juegos >= 100) await grantBadge(userId, "coleccionista");

  return platinums;
}

async function main() {
  const filas = await db.select({ id: users.id, handle: users.handle }).from(users);

  for (const u of filas) {
    const platinums = await checkAndGrantBadges(u.id);
    console.log(`OK: @${u.handle ?? u.id} — ${platinums} platinos (incluye Steam al 100%)`);
  }

  console.log(`Listo. ${filas.length} usuarios revisados.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
