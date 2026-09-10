/**
 * Repaso de limpieza del 10 de septiembre de 2026 — borra de verdad dos
 * cosas huérfanas, con confirmación explícita del usuario tras comprobar
 * que no eran scaffolding vacío:
 *
 *   - Tabla `notification`: 8 filas reales de la campana que se quitó del
 *     todo (sesión del 9 de septiembre). El número se congeló a mano en
 *     `AVISOS_CONGELADOS` (lib/admin.ts) antes de este borrado.
 *   - Columna `user.discordWebhookUrl`: sustituida por el bot de Discord,
 *     ningún código la leía ni la escribía ya (1 cuenta real la tenía
 *     puesta, su URL antigua e inútil desde que existe el bot).
 *
 *   npx tsx scripts/borrar-notification-y-webhook.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");

  const sql = postgres(url, { prepare: false });

  try {
    await sql`DROP TABLE IF EXISTS "notification";`;
    console.log("OK: tabla notification borrada");

    await sql`ALTER TABLE "user" DROP COLUMN IF EXISTS "discordWebhookUrl";`;
    console.log("OK: user.discordWebhookUrl borrada");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
