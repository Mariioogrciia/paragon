/**
 * Añade, con SQL explícito, `notes` a `user_game` — una nota privada por
 * juego ("me falta el coleccionable 14 del capítulo 3"), nunca pública. Ver
 * el comentario en schema.ts y `saveGameNotesAction` en app/actions.ts.
 *
 *   npx tsx scripts/anadir-notas-user-game.mts
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
      ALTER TABLE "user_game"
      ADD COLUMN IF NOT EXISTS "notes" text;
    `;
    console.log("OK: user_game.notes");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
