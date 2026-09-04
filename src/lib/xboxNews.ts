import "server-only";
import Parser from "rss-parser";

/**
 * Noticias de Xbox — mismo patrón que `lib/steamNews.ts`/`lib/psNews.ts`.
 * Fuente: el feed RSS oficial de Xbox Wire (`news.xbox.com`), comprobado a
 * mano (10 entradas reales, RSS 2.0 normal) antes de escribir esto.
 *
 * Epic y Ubisoft NO tienen esto: la web de Epic está detrás de Cloudflare y
 * bloquea hasta su propio feed RSS oficial con una petición de servidor
 * normal (comprobado, 403 con la pantalla de reto anti-bot); Ubisoft no
 * tiene ningún feed RSS público (su web de noticias es una SPA sin RSS
 * descubierto). No se inventa nada para esas dos.
 */

export interface XboxNewsItem {
  title: string;
  link: string;
  pubDate: string | null;
  resumen: string | null;
}

const FEED_URL = "https://news.xbox.com/en-us/feed/";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser();

function limpiarResumen(html: string | undefined, max = 140): string | null {
  if (!html) return null;
  const texto = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (!texto) return null;
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}…` : texto;
}

export async function getXboxNews(limit = 6): Promise<XboxNewsItem[]> {
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
    console.error("[xboxNews] no se pudo leer el feed", error);
    return [];
  }
}
