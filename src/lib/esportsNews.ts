import "server-only";
import Parser from "rss-parser";

/**
 * Noticias de eSports (LoL, VALORANT, torneos españoles...) para su propio
 * apartado en /noticias — pedido explícito del usuario (ver HANDOFF.md).
 * Mismo patrón que `psNews.ts`: `fetch` a mano (no `parser.parseURL`, que
 * hace su propio fetch por dentro) para poder cachearlo con
 * `next: { revalidate }`, y falla en silencio a `[]` si el feed no
 * responde — no tiene sentido tumbar toda /noticias por esto.
 *
 * Fuente: el RSS de eSports de Marca (marca.com/rss/esports.xml) — activo
 * de verdad (probado en vivo, noticias de horas, no años), en español, y
 * con imagen por noticia (`media:content`). Probados antes y descartados:
 * el RSS de eSports de AS (as.com/rss/esports/portada.xml) lleva congelado
 * desde 2018; Vandal y Mundo Deportivo no tienen un feed de eSports propio
 * bajo esas rutas (404).
 */

export interface EsportsNewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string | null;
  imageUrl: string | null;
}

const FEED_URL = "https://www.marca.com/rss/esports.xml";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser({
  customFields: {
    item: [["media:content", "mediaContent"], ["source", "source"]],
  },
});

function limpiarTexto(texto: string | undefined): string | null {
  if (!texto) return null;
  const limpio = texto.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return limpio || null;
}

export async function getEsportsNews(limit = 6): Promise<EsportsNewsItem[]> {
  try {
    const res = await fetch(FEED_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 }, // 6h, mismo criterio que psNews.ts.
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    return (feed.items ?? [])
      .filter((item) => item.title && item.link)
      .slice(0, limit)
      .map((item) => ({
        id: item.guid || item.link!,
        title: limpiarTexto(item.title) ?? "Sin título",
        link: item.link!,
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        summary: limpiarTexto(item.contentSnippet ?? item.content),
        imageUrl: (item as { mediaContent?: { $?: { url?: string } } }).mediaContent?.$?.url ?? null,
      }));
  } catch (error) {
    console.error("[esportsNews] no se pudo leer el feed", error);
    return [];
  }
}

/* ------------------------------------------------------------------ *
 * Noticias de los equipos que sigue el usuario                       *
 *                                                                    *
 * El feed de Marca casi nunca nombra a un equipo concreto, así que    *
 * se busca cada equipo en el RSS de Google News (probado: noticias    *
 * reales y del día para equipos grandes; vacío para los pequeños).    *
 * Se quitan las fuentes que solo son marcadores o cotizaciones.       *
 * ------------------------------------------------------------------ */

export interface NoticiaDeEquipo extends EsportsNewsItem {
  equipo: string;
  fuente: string | null;
}

const GNEWS_REGION: Record<string, string> = {
  es: "hl=es&gl=ES&ceid=ES:es",
  en: "hl=en-US&gl=US&ceid=US:en",
  de: "hl=de&gl=DE&ceid=DE:de",
  fr: "hl=fr&gl=FR&ceid=FR:fr",
};

/** Fuentes que en la búsqueda solo aportan marcadores, apuestas o cotizaciones. */
const FUENTES_RUIDO = /sofascore|flashscore|coinmarketcap|coingecko|bet|odds|livescore|aiscore|365scores/i;

async function noticiasDeUnEquipo(equipo: string, locale: string, porEquipo: number): Promise<NoticiaDeEquipo[]> {
  const q = encodeURIComponent(`"${equipo}" esports`);
  const region = GNEWS_REGION[locale] ?? GNEWS_REGION.es;
  try {
    const res = await fetch(`https://news.google.com/rss/search?q=${q}&${region}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 10_800 }, // 3h
    });
    if (!res.ok) return [];
    const feed = await parser.parseString(await res.text());
    return (feed.items ?? [])
      .filter((item) => item.title && item.link)
      .map((item) => {
        // <source url="…">Nombre</source>: xml2js lo da como texto o como { _ }.
        const crudo = (item as { source?: string | { _?: string } }).source;
        const fuente = (typeof crudo === "string" ? crudo : crudo?._) ?? null;
        // Google News añade " - Fuente" al final del título.
        const titulo = limpiarTexto(item.title)!.replace(/\s+-\s+[^-]+$/, "");
        return {
          id: item.guid || item.link!,
          title: titulo,
          link: item.link!,
          pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          summary: null,
          imageUrl: null,
          equipo,
          fuente,
        };
      })
      .filter((n) => !FUENTES_RUIDO.test(n.fuente ?? "") && !/marcador en vivo|live score/i.test(n.title))
      .slice(0, porEquipo);
  } catch (error) {
    console.error(`[esportsNews] no se pudieron leer las noticias de ${equipo}`, error);
    return [];
  }
}

/** Las más recientes de todos los equipos, sin repetir enlace. */
export async function getNoticiasDeEquipos(equipos: string[], locale: string, limite = 12): Promise<NoticiaDeEquipo[]> {
  const unicos = Array.from(new Set(equipos)).slice(0, 8);
  const listas = await Promise.all(unicos.map((e) => noticiasDeUnEquipo(e, locale, 5)));
  const vistos = new Set<string>();
  return listas
    .flat()
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate))
    .filter((n) => (vistos.has(n.link) ? false : (vistos.add(n.link), true)))
    .slice(0, limite);
}
