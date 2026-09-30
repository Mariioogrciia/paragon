/**
 * Tercera auditoría (29 sept 2026): logros, personalización por nivel y
 * comunidad.
 *
 *   - `mission_completion`: misiones semanales cumplidas. Hasta ahora las
 *     misiones se calculaban en vivo y su "+XP" no se guardaba en ningún
 *     sitio; esto es lo que permite sumarla al nivel (lib/missions.ts).
 *   - `user.tituloDesbloqueado`: título especial elegido entre los que se
 *     desbloquean por nivel o insignia (lib/titulos.ts).
 *   - `user.apariencia`: acento/estilo/tamaño de texto, que antes solo vivían
 *     en el localStorage del navegador (lib/apariencia.ts).
 *   - `user.panelOculto`: secciones del panel que cada uno oculta
 *     (lib/panelPreferences.ts).
 *   - `user.avisosDesactivados`: categorías de aviso que cada uno apaga
 *     (lib/avisosPreferencias.ts).
 *   - `user.efectoNombre`: efecto animado del nombre en el perfil, ganado
 *     con insignias o nivel (lib/efectosNombre.ts).
 *   - `activity.gameId` pasa a admitir null: los estados libres de Comunidad
 *     (tipo "status") no van ligados a ningún juego.
 *   - Relleno de `activity` tipo "platinum" con los platinos de los últimos
 *     60 días: desde ahora la sincronización los apunta sola (lib/sync.ts),
 *     con el mismo id determinista, así que repetir el script no duplica.
 *
 *   npx tsx scripts/crear-tablas-auditoria-3.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL/DIRECT_URL en .env.local");
  const sql = postgres(url, { prepare: false });
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "mission_completion" (
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "semana" text NOT NULL,
        "misionId" text NOT NULL,
        "xp" integer NOT NULL,
        "completadoAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("userId", "semana", "misionId")
      )
    `);
    await sql.unsafe(`ALTER TABLE "mission_completion" ENABLE ROW LEVEL SECURITY`);
    await sql.unsafe(`REVOKE ALL ON "mission_completion" FROM anon, authenticated`);
    console.log("OK: mission_completion");

    await sql.unsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "tituloDesbloqueado" text`);
    await sql.unsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "apariencia" jsonb`);
    await sql.unsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "panelOculto" jsonb`);
    await sql.unsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "avisosDesactivados" jsonb`);
    await sql.unsafe(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "efectoNombre" text`);
    // Estados libres en Comunidad (tipo "status"): no van ligados a un juego.
    await sql.unsafe(`ALTER TABLE "activity" ALTER COLUMN "gameId" DROP NOT NULL`);
    console.log("OK: user.tituloDesbloqueado, user.apariencia, user.panelOculto, user.avisosDesactivados");

    const filas = await sql.unsafe(`
      INSERT INTO "activity" ("id", "userId", "type", "gameId", "createdAt")
      SELECT 'plat-' || ut."userId" || '-' || ut."gameId", ut."userId", 'platinum', ut."gameId", ut."earnedAt"
      FROM "user_trophy" ut
      JOIN "game_trophy" gt ON gt."gameId" = ut."gameId" AND gt."trophyId" = ut."trophyId"
      WHERE ut.earned AND gt.grade = 'platinum' AND ut."earnedAt" > now() - interval '60 days'
      ON CONFLICT ("id") DO NOTHING
      RETURNING 1
    `);
    console.log(`OK: ${filas.length} platinos recientes añadidos al feed`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
