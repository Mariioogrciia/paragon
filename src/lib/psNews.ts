import "server-only";
import Parser from "rss-parser";

/**
 * Noticias de PlayStation (lanzamientos de PS Store, PS Plus, etc.) para un
 * apartado pequeño en el panel — `rss-parser` ya estaba en package.json sin
 * usarse en ningún sitio.
 *
 * Fuente: el blog oficial de PlayStation (blog.playstation.com/feed), que sí
 * cubre PS Store y PS Plus de primera mano — no hay un feed público de
 * "ofertas" propiamente dicho (la PS Store no publica uno), así que esto es
 * "noticias relevantes", no un rastreador de precios.
 *
 * Se pide el XML a mano con `fetch` (no con `parser.parseURL`, que hace su
 * propio fetch por dentro) para poder cachearlo con `next: { revalidate }` —
 * mismo motivo que ya usa `lib/prices.ts`: no tiene sentido pedir el feed en
 * cada carga del panel si solo se actualiza unas pocas veces al día.
 */

export interface PsNewsItem {
  title: string;
  link: string;
  pubDate: string | null;
  resumen: string | null;
}

const FEED_URL = "https://blog.playstation.com/feed/";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser();

function limpiarResumen(html: string | undefined, max = 140): string | null {
  if (!html) return null;
  const texto = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (!texto) return null;
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}…` : texto;
}

export async function getPsNews(limit = 6): Promise<PsNewsItem[]> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 }, // 6h: es un blog, no hace falta al minuto.
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    return (feed.items ?? []).slice(0, limit).map((item) => ({
      title: item.title ?? "Sin título",
      link: item.link ?? FEED_URL,
      pubDate: item.pubDate ?? null,
      resumen: limpiarResumen(item.contentSnippet ?? item.content),
    }));
  } catch (error) {
    console.error("[psNews] no se pudo leer el feed", error);
    return [];
  }
}
