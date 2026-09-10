import "server-only";
import Parser from "rss-parser";
import { searchGames } from "@/lib/igdb/client";

/**
 * Últimos juegos añadidos a Xbox Game Pass, vía el tag oficial de Xbox Wire
 * — `news.xbox.com/en-us/tag/xbox-game-pass/feed`. A diferencia de PS Plus
 * (lib/psPlus.ts), Game Pass no tiene UN anuncio al mes: Microsoft publica
 * varias "waves" (tandas) al mes, cada una como su propio post "Coming to
 * XBOX Game Pass: A, B, C, and More". Por eso esto no se llama "del mes" —
 * es "lo último añadido", el post más reciente de ese tipo, ni más ni
 * menos. El mismo tag también mezcla otros tipos de post (Free Play Days,
 * juegos que SALEN del catálogo…) que no son esto — se filtra por el
 * título, no por el tag a secas.
 *
 * Mismo criterio que PS Plus: nunca una lista escrita a mano. Si el feed
 * no tiene ningún post de este tipo, se devuelve `null` — no se inventa.
 */

export interface GamePassJuego {
  igdbId: number;
  title: string;
  iconUrl?: string;
}

export interface GamePassNuevos {
  titulo: string;
  link: string;
  fecha: string | null;
  juegos: GamePassJuego[];
}

const FEED_URL = "https://news.xbox.com/en-us/tag/xbox-game-pass/feed/";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser();

const PATRON_TITULO = /coming to xbox game pass:\s*(.+)$/i;

// Aquí SÍ se puede confiar en que la coma de Oxford está siempre puesta
// ("A, B, C, and More") — a diferencia del español de PS Plus, que unas
// veces lleva coma antes del "y" final y otras no. Solo hace falta
// quitar el "and" de cabecera de cada trozo y descartar la coletilla.
const COLETILLAS = new Set(["and more", "more"]);

function juegosDelTitulo(titulo: string): string[] {
  const match = PATRON_TITULO.exec(titulo);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.replace(/^\s*and\s+/i, "").trim())
    .filter((s) => s && !COLETILLAS.has(s.toLowerCase()));
}

export async function getXboxGamePassNuevos(): Promise<GamePassNuevos | null> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 }, // 6h, igual que el resto de feeds de esta app.
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    const anuncio = (feed.items ?? []).find((item) => PATRON_TITULO.test(item.title ?? ""));
    if (!anuncio?.title) return null;

    const nombres = juegosDelTitulo(anuncio.title);

    const juegos = (
      await Promise.all(
        nombres.map(async (nombre): Promise<GamePassJuego | null> => {
          try {
            const [resultado] = await searchGames(nombre, 1);
            if (!resultado) return null;
            return { igdbId: resultado.igdbId, title: resultado.title, iconUrl: resultado.coverUrl };
          } catch {
            return null;
          }
        }),
      )
    ).filter((g): g is GamePassJuego => g !== null);

    return {
      titulo: anuncio.title,
      link: anuncio.link ?? FEED_URL,
      fecha: anuncio.pubDate ?? null,
      juegos,
    };
  } catch (error) {
    console.error("[xboxGamePass] no se pudo leer el feed", error);
    return null;
  }
}
