/**
 * Añade, con SQL explícito, `avatarPersonalizado` a `user` — distingue una
 * foto de perfil subida a mano (que debe ganarle a PSN) de la que puso
 * Google/Discord al entrar por primera vez (que no debe). Las dos viven en
 * la misma columna `image`, así que sin este booleano no hay forma de
 * saber cuál es cuál. Ver el comentario en schema.ts y resolveAvatarUrl en
 * lib/profiles.ts.
 *
 *   npx tsx scripts/anadir-avatar-personalizado.mts
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
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "avatarPersonalizado" boolean NOT NULL DEFAULT false;
    `;
    console.log("OK: user.avatarPersonalizado");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
