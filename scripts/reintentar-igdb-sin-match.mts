/**
 * Reintenta el emparejado con IGDB de los juegos con `igdbId` sin poner, y
 * repasa también los que YA tienen `igdbId` pero se quedaron sin
 * género/desarrolladora/editora — señal de que el emparejado anterior no
 * llegó a guardar esos campos, o de que acertó con una entrada "satélite"
 * (port/dlc/remake...) en vez del juego principal, ver el comentario de
 * `searchGamesWithFallback` en lib/igdb/client.ts.
 *
 * `syncIgdbMetadata`/`syncStoreMetadata` (lib/sync.ts) ya usan ese fallback
 * con prioridad de categoría para cualquier juego nuevo, pero los que YA se
 * marcaron `metadataSyncedAt` se quedan como estaban para siempre — de ahí
 * que sin este script sigan cayendo en una ficha global pobre en vez de la
 * rica (ver getGlobalGame en lib/community.ts).
 *
 *   npx tsx scripts/reintentar-igdb-sin-match.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const { db } = await import("../src/db/index");
const { games } = await import("../src/db/schema");
const { isNull, isNotNull, or, and, eq } = await import("drizzle-orm");
const { searchGamesWithFallback } = await import("../src/lib/igdb/client");

const pendientes = await db
  .select({ id: games.id, title: games.title, igdbId: games.igdbId })
  .from(games)
  .where(and(isNotNull(games.metadataSyncedAt), or(isNull(games.igdbId), isNull(games.genres))));

console.log(`${pendientes.length} juegos a revisar.`);

let actualizados = 0;
for (const g of pendientes) {
  try {
    const [match] = await searchGamesWithFallback(g.title, 1);
    if (!match?.igdbId) {
      console.log(`✗ ${g.title} (sigue sin match)`);
      continue;
    }

    await db
      .update(games)
      .set({
        igdbId: match.igdbId,
        developer: match.developer ?? null,
        publisher: match.publisher ?? null,
        genres: match.genres.length > 0 ? match.genres : null,
        pegi: match.pegi ?? null,
        ...(match.coverUrl ? { iconUrl: match.coverUrl } : {}),
      })
      .where(eq(games.id, g.id));

    const cambioDeId = g.igdbId !== null && g.igdbId !== match.igdbId;
    console.log(`✓ ${g.title} -> igdbId ${match.igdbId}${cambioDeId ? ` (antes ${g.igdbId})` : ""}`);
    actualizados++;
  } catch (error) {
    console.error(`ERROR con "${g.title}":`, error);
  }
}

console.log(`\n${actualizados}/${pendientes.length} actualizados.`);
process.exit(0);
