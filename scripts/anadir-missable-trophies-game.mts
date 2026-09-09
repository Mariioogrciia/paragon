/**
 * Añade, con SQL explícito, `missableTrophies`/`missableTrophiesCheckedAt`
 * a `game` — caché real (en base, no en la caché de `fetch` de Next, que
 * medida en vivo no estaba acertando) de los trofeos perdibles de
 * PowerPyx. Ver el comentario en schema.ts y `getGameDetail` en
 * lib/profiles.ts.
 *
 *   npx tsx scripts/anadir-missable-trophies-game.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`
      ALTER TABLE "game"
      ADD COLUMN IF NOT EXISTS "missableTrophies" jsonb,
      ADD COLUMN IF NOT EXISTS "missableTrophiesCheckedAt" timestamp;
    `;
    console.log("OK: game.missableTrophies, game.missableTrophiesCheckedAt");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
