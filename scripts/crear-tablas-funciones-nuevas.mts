/**
 * Tablas de las funciones nuevas del 28 de septiembre de 2026:
 *
 *   - `price_alert`       alertas de precio (lib/priceAlerts.ts)
 *   - `game_goal`         objetivos con fecha del Planificador (lib/goals.ts)
 *   - `notification_log`  qué avisos periódicos ya se mandaron (resumen
 *                         semanal de Discord), para no repetirlos
 *   - `clan_war`          guerras de clanes (lib/clanWars.ts)
 *
 * Todas NUEVAS a propósito, ninguna columna en tablas existentes: si el
 * código se despliega antes de ejecutar esto, las consultas de siempre no
 * se rompen (una columna que falta sí las rompería); cada función nueva se
 * limita a no aparecer hasta que su tabla exista.
 *
 * Idempotente (IF NOT EXISTS). RLS activado y sin permisos para
 * anon/authenticated, igual que el resto tras `activar-rls.mts`.
 *
 *   npx tsx scripts/crear-tablas-funciones-nuevas.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const TABLAS = [
  `CREATE TABLE IF NOT EXISTS "price_alert" (
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "steamAppId" text NOT NULL,
    "gameId" text NOT NULL,
    "titulo" text NOT NULL,
    "precioObjetivo" real NOT NULL,
    "creadoAt" timestamp NOT NULL DEFAULT now(),
    "comprobadoAt" timestamp,
    "avisadoAt" timestamp,
    "precioAvisado" real,
    PRIMARY KEY ("userId", "steamAppId")
  )`,
  `CREATE INDEX IF NOT EXISTS "price_alert_comprobadoAt_idx" ON "price_alert" ("comprobadoAt")`,
  `CREATE TABLE IF NOT EXISTS "game_goal" (
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
    "fechaObjetivo" date NOT NULL,
    "creadoAt" timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY ("userId", "gameId")
  )`,
  `CREATE TABLE IF NOT EXISTS "notification_log" (
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "tipo" text NOT NULL,
    "clave" text NOT NULL,
    "enviadoAt" timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY ("userId", "tipo", "clave")
  )`,
  `CREATE TABLE IF NOT EXISTS "clan_war" (
    "id" text PRIMARY KEY,
    "retadorId" text NOT NULL REFERENCES "clans"("id") ON DELETE CASCADE,
    "retadoId" text NOT NULL REFERENCES "clans"("id") ON DELETE CASCADE,
    "estado" text NOT NULL DEFAULT 'pendiente',
    "creadoAt" timestamp NOT NULL DEFAULT now(),
    "empiezaAt" timestamp,
    "terminaAt" timestamp,
    "ganadorId" text,
    "puntosRetador" integer,
    "puntosRetado" integer
  )`,
  `CREATE INDEX IF NOT EXISTS "clan_war_retador_idx" ON "clan_war" ("retadorId")`,
  `CREATE INDEX IF NOT EXISTS "clan_war_retado_idx" ON "clan_war" ("retadoId")`,
];

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL/DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });
  try {
    for (const sentencia of TABLAS) await sql.unsafe(sentencia);
    for (const tabla of ["price_alert", "game_goal", "notification_log", "clan_war"]) {
      await sql.unsafe(`ALTER TABLE "${tabla}" ENABLE ROW LEVEL SECURITY`);
      await sql.unsafe(`REVOKE ALL ON "${tabla}" FROM anon, authenticated`);
    }
    console.log("OK: price_alert, game_goal, notification_log, clan_war");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
