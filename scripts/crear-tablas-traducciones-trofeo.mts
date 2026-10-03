/**
 * Crea las tablas de traducciones de trofeos y de vídeos de guía por idioma
 * (1 oct 2026), con SQL explícito y RLS activado (regla de las tablas nuevas,
 * ver HANDOFF.md). Idempotente, solo aditivo.
 *
 * - game_trophy_i18n: nombre y descripción de cada trofeo en un idioma
 *   (es/en/de/fr), tal como los da la propia plataforma en ese idioma.
 * - game_trophy_i18n_estado: qué (juego, idioma) ya se pidió y cuántos
 *   trofeos devolvió, para no repetir la petición en cada visita.
 * - trophy_guide_video: candidatos de vídeo de guía por trofeo e idioma.
 *
 *   npx tsx scripts/crear-tablas-traducciones-trofeo.mts
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
      CREATE TABLE IF NOT EXISTS "game_trophy_i18n" (
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "trophyId" text NOT NULL,
        "lang" text NOT NULL,
        "name" text NOT NULL,
        "detail" text NOT NULL DEFAULT '',
        "groupName" text,
        PRIMARY KEY ("gameId", "trophyId", "lang")
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS "game_trophy_i18n_estado" (
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "lang" text NOT NULL,
        "checkedAt" timestamp NOT NULL DEFAULT now(),
        "found" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("gameId", "lang")
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS "trophy_guide_video" (
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "trophyId" text NOT NULL,
        "lang" text NOT NULL,
        "videoIds" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "checkedAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("gameId", "trophyId", "lang")
      );
    `;

    for (const tabla of ["game_trophy_i18n", "game_trophy_i18n_estado", "trophy_guide_video"]) {
      await sql.unsafe(`ALTER TABLE "${tabla}" ENABLE ROW LEVEL SECURITY`);
      await sql.unsafe(`REVOKE ALL ON "${tabla}" FROM anon, authenticated`);
      console.log("OK:", tabla);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
