/**
 * Añade la columna `challengeGameId` a `league` — el "reto" de la liga (un
 * juego concreto para picarse a ver quién llega antes al platino), aparte
 * de la clasificación por puntos del mes. SQL explícito, mismo motivo que
 * el resto de cambios de esquema de esta app (ver crear-tabla-fcm-token.mts).
 *
 *   npx tsx scripts/anadir-reto-a-ligas.mts
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
      ALTER TABLE "league"
      ADD COLUMN IF NOT EXISTS "challengeGameId" text REFERENCES "game"("id") ON DELETE SET NULL
    `;
    console.log("OK: columna challengeGameId añadida a league (o ya existía).");
  } finally {
    await sql.end();
  }
}

main();
