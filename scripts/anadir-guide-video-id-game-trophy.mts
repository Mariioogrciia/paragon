/**
 * Añade, con SQL explícito, `guideVideoId` a `game_trophy` — el vídeo de
 * YouTube de guía para ese trofeo, cacheado a nivel de trofeo (no por
 * usuario). Null = nunca se ha buscado; cadena vacía = se buscó y no se
 * encontró nada. Ver el comentario en schema.ts y `searchTrophyGuideAction`
 * en app/actions.ts.
 *
 *   npx tsx scripts/anadir-guide-video-id-game-trophy.mts
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
      ALTER TABLE "game_trophy"
      ADD COLUMN IF NOT EXISTS "guideVideoId" text;
    `;
    console.log("OK: game_trophy.guideVideoId");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
