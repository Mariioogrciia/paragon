/**
 * Registro diario de horas por juego (`playtime_snapshot`), para poder
 * decir cuántas horas se jugaron EN un periodo (lib/horasPeriodo.ts).
 *
 * PSN y Steam solo dan el total acumulado de cada juego, nunca cuándo se
 * jugó: el ranking de "este año" enseñaba las horas de siempre de cualquier
 * juego tocado este año (2.109 h de Fortnite desde 2017). Guardando el total
 * cada día, las horas de un periodo son la resta entre hoy y el inicio del
 * periodo. Solo se guarda una fila nueva cuando el total cambia.
 *
 * Además de crear la tabla, hace la foto de partida de hoy con los totales
 * actuales: a partir de aquí empieza a haber historia.
 *
 *   npx tsx scripts/crear-tabla-registro-horas.mts
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
      CREATE TABLE IF NOT EXISTS "playtime_snapshot" (
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "fecha" date NOT NULL,
        "minutos" integer NOT NULL,
        PRIMARY KEY ("userId", "gameId", "fecha")
      )
    `);
    await sql.unsafe(`ALTER TABLE "playtime_snapshot" ENABLE ROW LEVEL SECURITY`);
    await sql.unsafe(`REVOKE ALL ON "playtime_snapshot" FROM anon, authenticated`);
    const filas = await sql.unsafe(`
      INSERT INTO "playtime_snapshot" ("userId", "gameId", "fecha", "minutos")
      SELECT "userId", "gameId", current_date, "playtimeMinutes"
      FROM "user_game"
      WHERE "playtimeMinutes" IS NOT NULL AND NOT "isWishlist"
      ON CONFLICT DO NOTHING
      RETURNING 1
    `);
    console.log(`OK: playtime_snapshot (foto inicial: ${filas.length} juegos)`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
