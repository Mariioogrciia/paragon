import { isNull, eq } from "drizzle-orm";
import { db } from "../src/db";
import { games } from "../src/db/schema";
import { matchIgdbGames } from "../src/lib/igdb/client";

// MODO DRY-RUN: pon esto a false para escribir realmente en la BD
const DRY_RUN = false;

async function procesarJuegosManuales() {
  console.log("=== Procesando Juegos Manuales ===");
  const juegosManuales = await db
    .select({ id: games.id, nativeId: games.nativeId, title: games.title })
    .from(games)
    .where(eq(games.platform, "manual"));

  let actualizados = 0;
  for (const juego of juegosManuales) {
    // nativeId = "1234:dispositivo"
    const [igdbIdStr] = juego.nativeId.split(":");
    const igdbId = parseInt(igdbIdStr, 10);
    
    if (!isNaN(igdbId)) {
      if (DRY_RUN) {
        console.log(`[MANUAL] ${juego.title} -> igdbId: ${igdbId}`);
      } else {
        await db.update(games).set({ igdbId }).where(eq(games.id, juego.id));
      }
      actualizados++;
    }
  }
  console.log(`[INFO] Se encontraron ${actualizados} juegos manuales.\n`);
}

async function procesarCatalogoNormal() {
  console.log("=== Procesando Catálogo (PSN, Steam, etc.) ===");
  
  // Buscar juegos sin igdbId que no sean manuales
  const sinIgdbId = await db
    .select({ id: games.id, title: games.title })
    .from(games)
    .where(isNull(games.igdbId));

  const normales = sinIgdbId.filter((j) => !j.id.startsWith("manual-"));
  
  if (normales.length === 0) {
    console.log("[INFO] No hay juegos normales sin igdbId.");
    return;
  }

  console.log(`[INFO] Encontrados ${normales.length} juegos por emparejar con IGDB.`);

  // Vamos en lotes de 100 para no sobrecargar
  for (let i = 0; i < normales.length; i += 100) {
    const lote = normales.slice(i, i + 100);
    const titulosUnicos = [...new Set(lote.map((j) => j.title))];
    
    console.log(`\nProcesando lote ${i + 1} a ${i + lote.length} (${titulosUnicos.length} títulos únicos)...`);
    
    const matches = await matchIgdbGames(titulosUnicos);
    
    for (const juego of lote) {
      const match = matches.get(juego.title);
      
      if (match) {
        if (DRY_RUN) {
          console.log(`[MATCH] "${juego.title}" -> IGDB: "${match.title}" (ID: ${match.igdbId})`);
        } else {
          await db
            .update(games)
            .set({
              igdbId: match.igdbId,
              developer: match.developer ?? null,
              publisher: match.publisher ?? null,
              genres: match.genres ?? null,
              pegi: match.pegi ?? null,
              metadataSyncedAt: new Date(),
            })
            .where(eq(games.id, juego.id));
        }
      } else {
        console.log(`[FALLO] No se encontró en IGDB: "${juego.title}"`);
      }
    }
  }
}

async function main() {
  console.log(`Modo DRY RUN: ${DRY_RUN ? "ACTIVADO (No se guardará nada)" : "DESACTIVADO (Escribiendo en BD)"}\n`);
  
  await procesarJuegosManuales();
  await procesarCatalogoNormal();
  
  console.log("\nProceso terminado.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en unificar-catalogo:", err);
  process.exit(1);
});
