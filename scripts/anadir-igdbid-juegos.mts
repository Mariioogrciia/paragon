import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("Añadiendo columna 'igdbId' a la tabla 'game'...");
  
  await db.execute(sql`
    ALTER TABLE "game" ADD COLUMN IF NOT EXISTS "igdbId" integer;
    CREATE INDEX IF NOT EXISTS "game_igdb_idx" ON "game" ("igdbId");
  `);

  console.log("¡Hecho! Columna 'igdbId' añadida correctamente.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
