/**
 * Añade, con SQL explícito, `pinnedAt` a `user_game` — marca qué juego ha
 * anclado cada usuario como "el objetivo ahora mismo" (el platino al que le
 * está dando prioridad). Null significa que no hay ninguno anclado. Ver el
 * comentario en schema.ts y `togglePinGameAction` en app/actions.ts.
 *
 *   npx tsx scripts/anadir-pinned-at-user-game.mts
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
      ADD COLUMN IF NOT EXISTS "pinnedAt" timestamp;
    `;
    console.log("OK: user_game.pinnedAt");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
