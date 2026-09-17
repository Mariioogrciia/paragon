/**
 * Crea las tablas de ligas creadas por el usuario (league, league_member) —
 * distintas de la "Liga Mensual" global (lib/ligas.ts, sin tabla propia, se
 * calcula al vuelo). SQL explícito, mismo motivo que el resto de tablas
 * nuevas de esta app (ver scripts/crear-tabla-fcm-token.mts).
 *
 *   npx tsx scripts/crear-tablas-ligas.mts
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
      CREATE TABLE IF NOT EXISTS "league" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "ownerId" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "league_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS "league_member" (
        "leagueId" text NOT NULL,
        "userId" text NOT NULL,
        "joinedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("leagueId", "userId"),
        CONSTRAINT "league_member_leagueId_league_id_fk" FOREIGN KEY ("leagueId") REFERENCES "league"("id") ON DELETE CASCADE,
        CONSTRAINT "league_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `;
    console.log("OK: tablas league y league_member creadas (o ya existían).");
  } finally {
    await sql.end();
  }
}

main();
