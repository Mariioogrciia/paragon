/**
 * Borra actividades de "rating"/"review" duplicadas de antes de que
 * rateGameAction/submitExpressReviewAction actualizaran la existente en vez
 * de insertar una nueva en cada click. Se queda solo la más reciente de
 * cada (usuario, juego, tipo).
 *
 *   npx tsx scripts/limpiar-actividad-duplicada.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { activities } from "../src/db/schema";

async function main() {
  const filas = await db
    .select({
      id: activities.id,
      userId: activities.userId,
      gameId: activities.gameId,
      type: activities.type,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(inArray(activities.type, ["rating", "review"]));

  const grupos = new Map<string, typeof filas>();
  for (const f of filas) {
    const clave = `${f.userId}:${f.gameId}:${f.type}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }

  let borradas = 0;

  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;

    const [, ...sobrantes] = [...grupo].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    for (const f of sobrantes) {
      await db.delete(activities).where(eq(activities.id, f.id));
      borradas++;
    }
  }

  console.log(`Listo. ${borradas} actividades duplicadas borradas.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
