/**
 * Tablas de la segunda tanda de funciones (29 sept 2026):
 *
 *   - `league_position`    último puesto conocido en la liga del mes, para
 *                          avisar de "te han adelantado" (lib/adelantos.ts)
 *   - `boost_session`      sesiones de trofeos online (lib/sesiones.ts)
 *   - `boost_participant`  quién se apunta a cada sesión
 *   - `coop_challenge`     "platinar juntos" entre dos amigos (lib/coop.ts)
 *   - `showcase_shelf`     vitrinas temáticas del perfil (lib/vitrinas.ts)
 *   - `season_result`      nivel final de cada temporada (lib/temporadas.ts)
 *
 * Mismo criterio que `crear-tablas-funciones-nuevas.mts`: solo tablas
 * nuevas, idempotente, con RLS y sin permisos para anon/authenticated.
 *
 *   npx tsx scripts/crear-tablas-funciones-nuevas-2.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const TABLAS: [string, string][] = [
  [
    "league_position",
    `CREATE TABLE IF NOT EXISTS "league_position" (
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "clave" text NOT NULL,
      "puesto" integer NOT NULL,
      "actualizadoAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("userId", "clave")
    )`,
  ],
  [
    "boost_session",
    `CREATE TABLE IF NOT EXISTS "boost_session" (
      "id" text PRIMARY KEY,
      "hostId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "gameId" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
      "trofeo" text NOT NULL,
      "descripcion" text,
      "fechaHora" timestamp NOT NULL,
      "plazas" integer NOT NULL,
      "cancelada" boolean NOT NULL DEFAULT false,
      "creadoAt" timestamp NOT NULL DEFAULT now()
    )`,
  ],
  [
    "boost_participant",
    `CREATE TABLE IF NOT EXISTS "boost_participant" (
      "sessionId" text NOT NULL REFERENCES "boost_session"("id") ON DELETE CASCADE,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "joinedAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("sessionId", "userId")
    )`,
  ],
  [
    "coop_challenge",
    `CREATE TABLE IF NOT EXISTS "coop_challenge" (
      "id" text PRIMARY KEY,
      "creadorId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "invitadoId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "gameIdCreador" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
      "gameIdInvitado" text NOT NULL REFERENCES "game"("id") ON DELETE CASCADE,
      "titulo" text NOT NULL,
      "fechaObjetivo" date NOT NULL,
      "estado" text NOT NULL DEFAULT 'pendiente',
      "creadoAt" timestamp NOT NULL DEFAULT now()
    )`,
  ],
  [
    "showcase_shelf",
    `CREATE TABLE IF NOT EXISTS "showcase_shelf" (
      "id" text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "titulo" text NOT NULL,
      "tipo" text NOT NULL,
      "filtro" text,
      "gameIds" jsonb,
      "orden" integer NOT NULL DEFAULT 0,
      "creadoAt" timestamp NOT NULL DEFAULT now()
    )`,
  ],
  [
    "season_result",
    `CREATE TABLE IF NOT EXISTS "season_result" (
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "temporada" text NOT NULL,
      "puntos" integer NOT NULL,
      "nivel" integer NOT NULL,
      "cerradoAt" timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY ("userId", "temporada")
    )`,
  ],
];

const INDICES = [
  `CREATE INDEX IF NOT EXISTS "boost_session_fechaHora_idx" ON "boost_session" ("fechaHora")`,
  `CREATE INDEX IF NOT EXISTS "coop_challenge_invitado_idx" ON "coop_challenge" ("invitadoId")`,
  `CREATE INDEX IF NOT EXISTS "showcase_shelf_user_idx" ON "showcase_shelf" ("userId")`,
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
