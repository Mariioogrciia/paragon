/**
 * Crea, con SQL explícito, las tablas nuevas de esta sesión. No se usa
 * `db:push` a propósito: sobre una base de producción, `db:push` compara el
 * esquema entero y puede proponer cambios sobre tablas que no tienen nada que
 * ver con esto (es la misma razón por la que `notification` se creó así). Con
 * `CREATE TABLE IF NOT EXISTS` se puede volver a ejecutar sin miedo.
 *
 *   npx tsx scripts/crear-tablas-nuevas.mts
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
      CREATE TABLE IF NOT EXISTS "game_difficulty_vote" (
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "value" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("userId", "gameId")
      );
    `;
    console.log("OK: game_difficulty_vote");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
