/**
 * Columna del "Cerrojo de Hitos" (schema.ts, `users.reservedMilestoneGameId`)
 * — con SQL explícito, mismo patrón que el resto de migraciones de este
 * proyecto, para no darle a drizzle-kit ocasión de proponer nada sobre el
 * resto de la base.
 *
 *   npx tsx scripts/anadir-columna-hito-reservado.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reservedMilestoneGameId" text;`;
    console.log("OK: user.reservedMilestoneGameId");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
