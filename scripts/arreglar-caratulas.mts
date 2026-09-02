/**
 * Repara las carátulas de Steam que salen en blanco.
 *
 * La ruta clásica (cdn.cloudflare.steamstatic.com/steam/apps/<id>/header.jpg)
 * devuelve un placeholder de ~1 KB en los juegos recientes en vez de un 404,
 * así que el fallo no se nota hasta que lo miras: la etiqueta <img> carga
 * "algo" y el juego aparece sin foto. La URL buena la da la API de la tienda,
 * con un hash por juego.
 *
 * Comprobamos el tamaño primero porque la API de la tienda va limitada (~200
 * peticiones cada 5 minutos) y la mayoría de juegos no están rotos.
 *
 *   npx tsx --conditions=react-server scripts/arreglar-caratulas.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const { db } = await import("../src/db/index");
const { games } = await import("../src/db/schema");
const { eq } = await import("drizzle-orm");
const { fetchStoreMetadata } = await import("../src/lib/steam/client");

/** Por debajo de esto lo que sirve Steam es el "imagen no disponible". */
const MINIMO_BYTES = 5_000;

const steam = await db
  .select({ id: games.id, nativeId: games.nativeId, title: games.title, iconUrl: games.iconUrl })
  .from(games)
  .where(eq(games.platform, "steam"));

console.log(`Revisando ${steam.length} juegos de Steam…`);

const rotos: typeof steam = [];

for (const juego of steam) {
  if (!juego.iconUrl) {
    rotos.push(juego);
    continue;
  }

  try {
    const res = await fetch(juego.iconUrl, { method: "GET" });
    const bytes = Number(res.headers.get("content-length") ?? 0);
    if (!res.ok || (bytes > 0 && bytes < MINIMO_BYTES)) rotos.push(juego);
  } catch {
    rotos.push(juego);
  }
}

console.log(`  ${rotos.length} con carátula rota.`);

let arregladas = 0;

for (const juego of rotos) {
  const metadata = await fetchStoreMetadata(juego.nativeId);

  if (!metadata?.headerImage) {
    console.log(`  – ${juego.title}: la tienda tampoco da carátula`);
    continue;
  }

  await db
    .update(games)
    .set({ iconUrl: metadata.headerImage })
    .where(eq(games.id, juego.id));

  arregladas++;
  console.log(`  ✓ ${juego.title}`);

  // La tienda corta a las ~200 peticiones cada 5 minutos.
  await new Promise((r) => setTimeout(r, 350));
}

console.log(`\n${arregladas} carátulas arregladas.`);
process.exit(0);
