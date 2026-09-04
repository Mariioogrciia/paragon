/**
 * Añade, con SQL explícito, `createdAt` a `user_game` — la fecha de alta en
 * biblioteca/deseados, que no existía (solo había `lastPlayedAt` y
 * `trophiesSyncedAt`, que dicen otra cosa). Hace falta para "Tendencias" en
 * Descubrir. No se usa `db:push` a propósito (mismo motivo que siempre: no
 * darle a una herramienta la ocasión de proponer cambios sobre toda la base
 * de producción). `DEFAULT now()` rellena las filas existentes con la fecha
 * de esta migración — no hay forma de saber la fecha real de alta de lo que
 * ya estaba, así que Tendencias empezará plana hasta que pase un tiempo de
 * uso real.
 *
 *   npx tsx scripts/anadir-createdat-user-game.mts
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
      ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
    `;
    console.log("OK: user_game.createdAt");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
