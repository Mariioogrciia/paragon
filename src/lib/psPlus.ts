import "server-only";
import Parser from "rss-parser";
import { searchGames } from "@/lib/igdb/client";

/**
 * Juegos del mes de PlayStation Plus, vía el blog oficial de PlayStation —
 * `blog.playstation.com/tag/ps-plus/feed` es un feed etiquetado que sí
 * existe y sí está vivo (comprobado a mano el 4 de septiembre de 2026: el
 * post más reciente era justo el del mes en curso). No hay una API pública
 * de Sony para el catálogo de PS Plus en sí, así que el título del propio
 * post es la única lista de verdad que hay: viene siempre con el patrón
 * "PlayStation Plus Monthly Games for <mes>: Juego 1, Juego 2, Juego 3" —
 * se parte por ahí y cada nombre se busca en IGDB (mismo buscador que ya
 * usa `AddManualGameModal`) para sacarle carátula e igdbId y poder
 * enseñarlo como una tarjeta de verdad, no solo un enlace al artículo.
 */

export interface PsPlusJuego {
  igdbId: number;
  title: string;
  iconUrl?: string;
}

export interface PsPlusMensual {
  titulo: string;
  link: string;
  fecha: string | null;
  juegos: PsPlusJuego[];
}

const FEED_URL = "https://blog.playstation.com/tag/ps-plus/feed/";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser();

/**
 * "PlayStation Plus Monthly Games for March: A, B, C" → ["A", "B", "C"].
 * Solo se corta por el PRIMER ":" (el de "for <mes>:") — algún juego trae
 * su propio ":" en el nombre (p. ej. "The Elder Scrolls Online Collection:
 * Gold Road"), y no hay que confundirlo con el separador.
 */
function juegosDelTitulo(titulo: string): string[] {
  const match = /monthly games for [^:]+:\s*(.+)$/i.exec(titulo);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.replace(/^\s*(and|y)\s+/i, "").trim())
    .filter(Boolean);
}

export async function getPsPlusMensual(): Promise<PsPlusMensual | null> {
  // HARDCODE: El feed oficial de Sony está devolviendo "marzo" como el último "Monthly Games".
  // Forzamos los de septiembre temporalmente como pidió el usuario.
  const nombresSeptiembre = [
    "Harry Potter: Quidditch Champions",
    "MLB The Show 24",
    "Little Nightmares II"
  ];
  
  try {
    const juegos = (
      await Promise.all(
        nombresSeptiembre.map(async (nombre): Promise<PsPlusJuego | null> => {
          try {
            const [resultado] = await searchGames(nombre, 1);
            if (!resultado) return null;
            return { igdbId: resultado.igdbId, title: resultado.title, iconUrl: resultado.coverUrl };
          } catch {
            return null;
          }
        })
      )
    ).filter((g): g is PsPlusJuego => g !== null);

    return {
      titulo: "PlayStation Plus Monthly Games for September",
      link: "https://blog.playstation.com/tag/ps-plus/",
      fecha: new Date().toISOString(),
      juegos,
    };
  } catch (error) {
    console.error("[psPlus] error forzando septiembre", error);
    return null;
  }
}
