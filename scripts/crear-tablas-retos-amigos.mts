/**
 * Retos entre amigos (30 sept 2026, lib/retosAmigos.ts):
 *
 *   - `friend_challenge`              el reto: quién lo crea, desde/hasta cuándo, cómo acabó
 *   - `friend_challenge_participant`  a quién se invita y si aceptó; resultado al cerrarse
 *
 * Gana quien más trofeos consiga entre los que aceptaron, dentro de las
 * fechas del reto — cada reto tiene su propio grupo cerrado, así que no hay
 * ambigüedad aunque cada uno tenga amigos distintos.
 *
 * Mismo criterio que el resto de `crear-tablas-*.mts`: solo tablas nuevas,
 * idempotente, con RLS y sin permisos para anon/authenticated.
 *
 *   npx tsx scripts/crear-tablas-retos-amigos.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const TABLAS: [string, string][] = [
  [
    "friend_challenge",
    `CREATE TABLE IF NOT EXISTS "friend_challenge" (
      "id" text PRIMARY KEY,
      "creadorId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "titulo" text,
      "inicio" timestamp NOT NULL,
      "fin" timestamp NOT NULL,
      "estado" text NOT NULL DEFAULT 'activo',
      "creadoAt" timestamp NOT NULL DEFAULT now()
    )`,
  ],
  [
    "friend_challenge_participant",
    `CREATE TABLE IF NOT EXISTS "friend_challenge_participant" (
      "challengeId" text NOT NULL REFERENCES "friend_challenge"("id") ON DELETE CASCADE,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "estado" text NOT NULL DEFAULT 'pendiente',
      "resultado" integer,
      "ganador" boolean NOT NULL DEFAULT false,
      PRIMARY KEY ("challengeId", "userId")
    )`,
  ],
];

const INDICES = [
  `CREATE INDEX IF NOT EXISTS "friend_challenge_estado_fin_idx" ON "friend_challenge" ("estado", "fin")`,
  `CREATE INDEX IF NOT EXISTS "friend_challenge_participant_user_idx" ON "friend_challenge_participant" ("userId")`,
];

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL/DIRECT_URL en .env.local");

  const sql = postgres(url, { prepare: false });
  try {
    for (const [nombre, sentencia] of TABLAS) {
      await sql.unsafe(sentencia);
      await sql.unsafe(`ALTER TABLE "${nombre}" ENABLE ROW LEVEL SECURITY`);
      await sql.unsafe(`REVOKE ALL ON "${nombre}" FROM anon, authenticated`);
    }
    for (const indice of INDICES) await sql.unsafe(indice);
    console.log(`OK: ${TABLAS.map(([n]) => n).join(", ")}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
