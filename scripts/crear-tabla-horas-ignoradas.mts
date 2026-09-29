/**
 * Tabla `playtime_ignored`: juegos cuyas horas ha pedido ignorar el usuario
 * (lib/horasIgnoradas.ts). Caso real: PSN atribuye a la cuenta 2.109 h de
 * Fortnite que jugó otra persona en esa consola. Tabla aparte y no una
 * columna de `user_game` a propósito: la sincronización reescribe las horas
 * en cada pasada, y así el dato de Sony se queda intacto (y se puede
 * deshacer). Con RLS, como el resto.
 *
 *   npx tsx scripts/crear-tabla-horas-ignoradas.mts
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
      CREATE TABLE IF NOT EXISTS "playtime_ignored" (
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
        "creadoAt" timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY ("userId", "gameId")
      )
    `);
    await sql.unsafe(`ALTER TABLE "playtime_ignored" ENABLE ROW LEVEL SECURITY`);
    await sql.unsafe(`REVOKE ALL ON "playtime_ignored" FROM anon, authenticated`);
    console.log("OK: playtime_ignored");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
