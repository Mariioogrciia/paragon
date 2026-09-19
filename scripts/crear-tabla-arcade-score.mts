/**
 * Crea la tabla del easter egg de /offline (Cazador de Platinos, el
 * "dinosaurio" de Paragon) — mismo motivo de siempre para SQL explícito en
 * vez de `db:push`: no darle a una herramienta la ocasión de proponer
 * cambios sobre el esquema entero de producción por una tabla nueva y
 * aislada.
 *
 *   npx tsx scripts/crear-tabla-arcade-score.mts
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
      CREATE TABLE IF NOT EXISTS "arcade_score" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "game" text NOT NULL DEFAULT 'cazador',
        "score" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "arcade_score_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "arcade_score_game_score_idx" ON "arcade_score" ("game", "score" DESC)`;
    console.log("OK: tabla arcade_score creada (o ya existía), con su índice de ranking.");
  } finally {
    await sql.end();
  }
}

main();
