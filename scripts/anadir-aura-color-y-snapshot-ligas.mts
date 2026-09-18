/**
 * Añade, con SQL explícito, `game.auraColor`/`game.auraColorCheckedAt`
 * (color dominante de la carátula, cacheado por juego — ver
 * lib/coverAura.ts) y la tabla `league_standing_snapshot` (foto semanal
 * de la clasificación de cada liga, para poder calcular "+2 puestos esta
 * semana" — ver /api/cron/league-snapshot y `getLeagueRankings` en
 * lib/leagues.ts).
 *
 * Hecho a mano en vez de con `drizzle-kit push` porque ese comando se
 * paró en un prompt interactivo AJENO a este cambio (una constraint
 * `unique` pendiente en `fcm_token` que pide confirmar si truncar la
 * tabla) — sin TTY no hay forma de responder ese prompt, y no es cosa de
 * este cambio como para decidir por él. Mismo patrón que el resto de
 * scripts de esta carpeta (ver anadir-missable-trophies-game.mts).
 *
 *   npx tsx scripts/anadir-aura-color-y-snapshot-ligas.mts
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
      ALTER TABLE "game"
      ADD COLUMN IF NOT EXISTS "auraColor" text,
      ADD COLUMN IF NOT EXISTS "auraColorCheckedAt" timestamp;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "league_standing_snapshot" (
        "leagueId" text NOT NULL REFERENCES "league"("id") ON DELETE CASCADE,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "rank" integer NOT NULL,
        "points" integer NOT NULL,
        "capturedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("leagueId", "userId")
      );
    `;

    console.log("OK: game.auraColor/auraColorCheckedAt, league_standing_snapshot");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
