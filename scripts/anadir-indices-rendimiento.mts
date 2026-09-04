/**
 * Índices que faltaban, con SQL explícito (no `db:push`, mismo motivo de
 * siempre: no darle a una herramienta la ocasión de proponer cambios sobre
 * toda la base de producción).
 *
 * `user_game` tiene PK (userId, gameId) y `user_trophy` PK (userId, gameId,
 * trophyId) — un índice compuesto no sirve para buscar solo por la SEGUNDA
 * columna. Y hay más de 10 sitios en el código (estadísticas de un juego,
 * reseñas, recomendaciones, Descubrir, dificultad comunitaria...) que
 * filtran `WHERE gameId = X` sin `userId`: cada uno de esos es hoy un
 * recorrido completo de la tabla. Con 5 usuarios no se nota; en cuanto
 * crezca, sí — más barato añadir el índice ahora que perseguir consultas
 * lentas más adelante.
 *
 * `activity` no tenía NINGÚN índice más allá de su propia PK (`id`) — el
 * feed de actividad (`getFeed`, la portada de cada usuario) filtra por
 * `userId` de los amigos en una tabla que crece con cada valoración/reseña/
 * platino.
 *
 * `CONCURRENTLY` para no bloquear escrituras mientras se construye el
 * índice — a costa de no poder ir dentro de una transacción, por eso cada
 * `CREATE INDEX` es su propia sentencia, no todas juntas.
 *
 *   npx tsx scripts/anadir-indices-rendimiento.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const INDICES = [
  { nombre: "user_game_gameId_idx", sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_game_gameId_idx" ON "user_game" ("gameId")` },
  { nombre: "user_trophy_gameId_idx", sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_trophy_gameId_idx" ON "user_trophy" ("gameId")` },
  { nombre: "activity_userId_idx", sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "activity_userId_idx" ON "activity" ("userId")` },
  { nombre: "activity_gameId_idx", sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "activity_gameId_idx" ON "activity" ("gameId")` },
  { nombre: "activity_comment_activityId_idx", sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "activity_comment_activityId_idx" ON "activity_comment" ("activityId")` },
];

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL/DIRECT_URL en .env.local");

  // CONCURRENTLY no puede ir dentro de una transacción implícita, así que
  // cada sentencia necesita su propia conexión "sin preparar".
  const sql = postgres(url, { prepare: false });

  try {
    for (const { nombre, sql: ddl } of INDICES) {
      await sql.unsafe(ddl);
      console.log(`OK: ${nombre}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
