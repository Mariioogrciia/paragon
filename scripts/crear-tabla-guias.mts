/**
 * Crea las tablas de guías escritas (game_guide, game_guide_reply), con SQL
 * explícito — mismo motivo que el resto de tablas nuevas de esta sesión:
 * db:push compara el esquema entero y es más arriesgado sobre producción
 * que un CREATE TABLE IF NOT EXISTS con alcance propio.
 *
 *   npx tsx scripts/crear-tabla-guias.mts
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
      CREATE TABLE IF NOT EXISTS "game_guide" (
        "id" text PRIMARY KEY,
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log("OK: game_guide");

    await sql`
      CREATE TABLE IF NOT EXISTS "game_guide_reply" (
        "id" text PRIMARY KEY,
        "guideId" text NOT NULL REFERENCES "game_guide"("id") ON DELETE CASCADE,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "body" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log("OK: game_guide_reply");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
