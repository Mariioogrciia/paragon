/**
 * Las 5 columnas que quedaron en schema.ts sin pasar por `db:push` (bloqueado
 * por un aviso interactivo sin relación, sobre `push_subscription` — ver
 * HANDOFF.md). Con SQL explícito, como el resto de migraciones de este
 * proyecto, para no darle a drizzle-kit ocasión de proponer nada sobre el
 * resto de la base.
 *
 * Urgente de verdad: `getLibrary` (lib/profiles.ts) ya selecciona
 * `acquisitionFormat`/`pricePaid` sin comprobar que existan — con el código
 * ya desplegado y la columna sin crear, CUALQUIER carga de biblioteca en
 * producción rompe con "column does not exist". Encontrado depurando el
 * bot de Discord, no es un problema solo del bot.
 *
 *   npx tsx scripts/anadir-columnas-sesion-9-10-sept.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "hiddenNavItems" jsonb DEFAULT '[]'::jsonb;`;
    console.log("OK: user.hiddenNavItems");

    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "discordDmEnabled" boolean NOT NULL DEFAULT false;`;
    console.log("OK: user.discordDmEnabled");

    await sql`ALTER TABLE "user_trophy" ADD COLUMN IF NOT EXISTS "manualProgressCurrent" integer;`;
    await sql`ALTER TABLE "user_trophy" ADD COLUMN IF NOT EXISTS "manualProgressTarget" integer;`;
    console.log("OK: user_trophy.manualProgressCurrent/Target");

    await sql`ALTER TABLE "user_game" ADD COLUMN IF NOT EXISTS "acquisitionFormat" text;`;
    await sql`ALTER TABLE "user_game" ADD COLUMN IF NOT EXISTS "pricePaid" double precision;`;
    console.log("OK: user_game.acquisitionFormat/pricePaid");

    console.log("Listo — las 5 columnas ya existen.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
