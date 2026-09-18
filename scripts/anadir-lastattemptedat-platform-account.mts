/**
 * Añade `platform_account.lastAttemptedAt` — distinto de `syncedAt` (que
 * solo avanza en un éxito, a propósito). Arregla un bug real en
 * producción (18 sept 2026): el cron elegía las cuentas más rancias por
 * `syncedAt`, así que una cuenta que falla SIEMPRE se quedaba siendo "la
 * más rancia" para siempre y bloqueaba a todo el mundo detrás suyo — ver
 * el comentario en schema.ts y en api/cron/sync/route.ts.
 *
 * El backfill (`coalesce(syncedAt, now())`) es solo para que las cuentas
 * ya sincronizadas alguna vez no queden con `lastAttemptedAt` null (que
 * ordena primero) — las que nunca se han intentado se quedan en null a
 * propósito, para seguir teniendo prioridad real la primera vez.
 *
 *   npx tsx scripts/anadir-lastattemptedat-platform-account.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DIRECT_URL/DATABASE_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`
      ALTER TABLE "platform_account"
      ADD COLUMN IF NOT EXISTS "lastAttemptedAt" timestamp;
    `;
    await sql`
      UPDATE "platform_account"
      SET "lastAttemptedAt" = "syncedAt"
      WHERE "syncedAt" IS NOT NULL AND "lastAttemptedAt" IS NULL;
    `;
    console.log("OK: platform_account.lastAttemptedAt (con backfill desde syncedAt)");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
