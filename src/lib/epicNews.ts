import "server-only";
import Parser from "rss-parser";
import type { PsNewsItem } from "@/lib/psNews";

/**
 * Noticias de la Epic Games Store para su página de Descubrir.
 *
 * Epic no tiene un feed propio que se pueda leer: su web y su sección de
 * noticias responden con un reto de Cloudflare (403) y la API del blog de la
 * tienda devuelve `{}` (comprobado el 1 oct 2026). La fuente es el RSS
 * público de Google News buscando "Epic Games Store" en los últimos 30 días,
 * que agrega medios (Vandal, 3DJuegos...) y el propio blog de Epic. El título
 * de Google News lleva " - Medio" al final: se separa y el medio va como
 * entradilla, porque el feed no trae resumen útil.
 */

const FEED_URL = "https://news.google.com/rss/search?q=%22Epic+Games+Store%22+when:30d&hl=es&gl=ES&ceid=ES:es";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser();

export async function getEpicNews(limit = 6): Promise<PsNewsItem[]> {
  try {
    const res = await fetch(FEED_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 },
    });
    if (!res.ok) return [];
    const feed = await parser.parseString(await res.text());
    const vistos = new Set<string>();
    const items: PsNewsItem[] = [];
    for (const item of feed.items ?? []) {
      const completo = (item.title ?? "").trim();
      const corte = completo.lastIndexOf(" - ");
      const titulo = corte > 0 ? completo.slice(0, corte) : completo;
      const medio = corte > 0 ? completo.slice(corte + 3) : null;
      // Google News repite la misma noticia de varios medios: una por titular.
      const clave = titulo.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      if (!titulo || vistos.has(clave)) continue;
      vistos.add(clave);
      items.push({ title: titulo, link: item.link ?? FEED_URL, pubDate: item.pubDate ?? null, resumen: medio });
    }
    // Google News ordena por relevancia; aquí se quieren las más recientes.
    return items.sort((a, b) => new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime()).slice(0, limit);
  } catch (error) {
    console.error("[epicNews] no se pudo leer el feed", error);
    return [];
  }
}
