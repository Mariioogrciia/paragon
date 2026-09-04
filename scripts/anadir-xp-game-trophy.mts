/**
 * Añade, con SQL explícito, `xp` a `game_trophy` — el Gamerscore real de
 * cada logro de Xbox (Microsoft ya le pone un peso oficial a cada uno,
 * antes se descartaba al guardar). PSN y Steam se quedan a NULL a
 * propósito: su puntuación se estima en lib/paragonScore.ts a partir de
 * `grade`/`rarityPercent`, no se inventa un número aquí. No se usa
 * `db:push` (mismo motivo de siempre: no darle a una herramienta la
 * ocasión de proponer cambios sobre toda la base de producción).
 *
 *   npx tsx scripts/anadir-xp-game-trophy.mts
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
      ADD COLUMN IF NOT EXISTS "xp" integer;
    `;
    console.log("OK: game_trophy.xp");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
