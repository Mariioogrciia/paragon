import "server-only";
import { HowLongToBeatService } from "howlongtobeat";
import { getDb } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";

const hltbService = new HowLongToBeatService();

// Umbral mínimo de similitud (0-1, la propia librería la calcula por
// Levenshtein entre el título buscado y el nombre devuelto) para aceptar un
// resultado. Sin esto se cogía "el primer resultado" a ciegas — el mismo
// error que ya causó el caso real de "The Witcher 3" emparejando con el DLC
// "Blood and Wine" en PowerPyx (ver lib/powerpyx.ts): la propia librería NO
// ordena por similitud, sino por popularidad en HLTB (`sortCategory:
// "popular"`), así que el resultado más popular que contenga alguna palabra
// de la búsqueda puede salir primero aunque sea un juego distinto (una
// secuela, un spin-off, un remaster con nombre distinto). 0.5 es
// deliberadamente permisivo (deja pasar títulos con puntuación/subtítulo
// distinto) pero descarta coincidencias flojas antes que guardar un tiempo
// de otro juego.
const SIMILITUD_MINIMA = 0.5;

/**
 * Busca un juego en HLTB y guarda los tiempos en la base de datos.
 * Si no encuentra nada, guarda un objeto vacío para no volver a buscarlo.
 *
 * @param gameId El ID nativo del juego en la base de datos (ej. "psn-NPWR12345_00")
 * @param title El título del juego (ej. "The Witcher 3")
 */
export async function syncGameHltb(gameId: string, title: string) {
  try {
    // Buscar en HLTB
    const results = await hltbService.search(title);

    // Si no hay resultados, guardamos un objeto vacío
    if (!results || results.length === 0) {
      const db = getDb();
      await db.update(games).set({ hltb: {} }).where(eq(games.id, gameId));
      return null;
    }

    // El mejor resultado por similitud de título, no "el primero" (ver
    // SIMILITUD_MINIMA arriba). Si ni el mejor llega al umbral, es mejor no
    // guardar nada que guardar el tiempo de un juego distinto.
    const mejor = results.reduce((a, b) => (b.similarity > a.similarity ? b : a));
    if (mejor.similarity < SIMILITUD_MINIMA) {
      const db = getDb();
      await db.update(games).set({ hltb: {} }).where(eq(games.id, gameId));
      return null;
    }
    const match = mejor;

    const hltbData = {
      main: match.gameplayMain,
      mainExtra: match.gameplayMainExtra,
      completionist: match.gameplayCompletionist,
    };

    const db = getDb();
    await db.update(games).set({ hltb: hltbData }).where(eq(games.id, gameId));

    return hltbData;
  } catch (error) {
    console.error(`Error buscando HLTB para ${title}:`, error);
    return null;
  }
}
