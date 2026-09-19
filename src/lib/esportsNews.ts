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
    item: [["media:content", "mediaContent"]],
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
