/**
 * Crea la tabla de guías escritas de trofeo (trophy_guide), con SQL
 * explícito — mismo motivo que el resto de tablas nuevas: db:push compara
 * el esquema entero y es más arriesgado sobre producción que un CREATE
 * TABLE IF NOT EXISTS con alcance propio.
 *
 *   npx tsx scripts/crear-tabla-guias-trofeo.mts
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
      CREATE TABLE IF NOT EXISTS "trophy_guide" (
        "id" text PRIMARY KEY,
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "trophyId" text NOT NULL,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "body" text NOT NULL,
        "language" text NOT NULL DEFAULT 'es',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "trophy_guide_user_trophy_idx"
      ON "trophy_guide" ("userId", "gameId", "trophyId");
    `;
    console.log("OK: trophy_guide");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
