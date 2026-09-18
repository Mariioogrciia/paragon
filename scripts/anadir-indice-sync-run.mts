/**
 * Índice que faltaba en `sync_run.createdAt` — mismo motivo y patrón que
 * `anadir-indices-rendimiento.mts` (SQL explícito, no `db:push`).
 *
 * El cron (`/api/cron/sync`, cada 15 min) borra las filas viejas de
 * `sync_run` en cada pasada (~800 filas/día, según su propio comentario) con
 * `WHERE createdAt < X` — sin índice en `createdAt`, cada una de esas 96
 * pasadas diarias hace un recorrido completo de la tabla, que solo crece
 * entre limpiezas.
 *
 *   npx tsx scripts/anadir-indice-sync-run.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL/DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql.unsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "sync_run_createdAt_idx" ON "sync_run" ("createdAt")`);
    console.log("OK: sync_run_createdAt_idx");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
