import "server-only";
import Parser from "rss-parser";

/**
 * Noticias de Steam — mismo patrón que `lib/psNews.ts`, para la sección
 * "Noticias" de `/descubrir/steam`. Fuente: el feed RSS oficial de Valve
 * (`store.steampowered.com/feeds/news.xml`, formato RDF/RSS1.0 — `rss-parser`
 * lo entiende igual que un RSS 2.0 normal) — son sobre todo anuncios de
 * actualización de juegos concretos, no "novedades de la tienda" en el
 * sentido amplio, pero es la única fuente pública y oficial que hay.
 */

export interface SteamNewsItem {
  title: string;
  link: string;
  pubDate: string | null;
  resumen: string | null;
}

const FEED_URL = "https://store.steampowered.com/feeds/news.xml";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser();

function limpiarResumen(html: string | undefined, max = 140): string | null {
  if (!html) return null;
  const texto = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (!texto) return null;
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}…` : texto;
}

export async function getSteamNews(limit = 6): Promise<SteamNewsItem[]> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 }, // 6h, igual que el resto de feeds de esta app.
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
    console.error("[steamNews] no se pudo leer el feed", error);
    return [];
  }
}
