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
 *
 * IMPORTANTE — no volver a poner una lista a mano aquí: hubo una versión
 * con los nombres de un mes concreto escritos a fuego ("el feed está
 * devolviendo el mes viejo, forzamos estos mientras tanto") que se quedó
 * así de una sesión a otra y acabó enseñando un mes que ya no era el
 * actual, siendo indistinguible en pantalla de un dato real. Si el feed de
 * verdad no ha publicado el mes en curso todavía, lo honesto es enseñar el
 * último real (con su fecha) hasta que Sony publique el siguiente — nunca
 * inventar los nombres.
 */

export interface PsPlusJuego {
  igdbId: number;
  title: string;
  iconUrl?: string;
}

export interface PsPlusMensual {
  titulo: string;
  /** "March", tal cual sale en el título en inglés del post — para pintar "hace N meses" si no es el actual. */
  mes: string | null;
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

function mesDelTitulo(titulo: string): string | null {
  const match = /monthly games for ([^:]+):/i.exec(titulo);
  return match ? match[1].trim() : null;
}

export async function getPsPlusMensual(): Promise<PsPlusMensual | null> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 }, // 6h, como el resto de feeds — esto cambia una vez al mes.
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    // El tag "ps-plus" trae de todo (subidas de precio, noticias de
    // catálogo...); el anuncio mensual siempre lleva "Monthly Games" en el
    // título en inglés — es el patrón estable, no adivinar por fecha.
    const anuncio = (feed.items ?? []).find((item) => /monthly games/i.test(item.title ?? ""));
    if (!anuncio?.title) return null;

    const nombres = juegosDelTitulo(anuncio.title);

    // Una búsqueda de IGDB por nombre, en paralelo. `search` es difuso
    // (mismo motivo que ya evita el emparejador de PEGI), pero aquí el
    // coste de acertar con la edición equivocada de un mismo juego es
    // bajo — es una carátula promocional, no un dato que se guarde.
    const juegos = (
      await Promise.all(
        nombres.map(async (nombre): Promise<PsPlusJuego | null> => {
          try {
            const [resultado] = await searchGames(nombre, 1);
            if (!resultado) return null;
            return { igdbId: resultado.igdbId, title: resultado.title, iconUrl: resultado.coverUrl };
          } catch {
            return null;
          }
        }),
      )
    ).filter((g): g is PsPlusJuego => g !== null);

    return {
      titulo: anuncio.title,
      mes: mesDelTitulo(anuncio.title),
      link: anuncio.link ?? FEED_URL,
      fecha: anuncio.pubDate ?? null,
      juegos,
    };
  } catch (error) {
    console.error("[psPlus] no se pudo leer el feed", error);
    return null;
  }
}
