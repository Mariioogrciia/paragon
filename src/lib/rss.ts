import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent']
    ]
  }
});

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  creator?: string;
  summary?: string;
  imageUrl?: string | null;
}

/**
 * Lee el feed RSS de Eurogamer.es o Vandal y devuelve las noticias parseadas.
 */
export async function getGamingNews(limit = 12): Promise<NewsItem[]> {
  try {
    // Usamos Eurogamer.es como fuente principal para noticias en español
    const feed = await parser.parseURL("https://www.eurogamer.es/feed/news");

    return feed.items.slice(0, limit).map(item => {
      // Intentar extraer una imagen si viene en los campos multimedia
      let imageUrl = null;
      if (item.mediaThumbnail && item.mediaThumbnail['$'] && item.mediaThumbnail['$'].url) {
        imageUrl = item.mediaThumbnail['$'].url;
      } else if (item.mediaContent && item.mediaContent['$'] && item.mediaContent['$'].url) {
        imageUrl = item.mediaContent['$'].url;
      } else if (item.content) {
        // Fallback: extraer primera imagen del contenido HTML
        const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }

      return {
        id: item.guid || item.link || Math.random().toString(),
        title: item.title || "Noticia sin título",
        link: item.link || "#",
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        creator: item.creator,
        summary: item.contentSnippet || item.summary,
        imageUrl,
      };
    });
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    return [];
  }
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Noticias que mencionan un juego de tu biblioteca o tu Wishlist —
 * "Noticias de tus juegos" en /noticias. Coincidencia por PALABRA COMPLETA
 * (`\b...\b`, no `includes`) y solo con títulos de más de 3 caracteres: el
 * feed es de actualidad general (Eurogamer), no etiquetado por juego, así
 * que un título corto o una palabra común de verdad ("Up", "Push", "It")
 * daría falsos positivos constantes — mismo cuidado que ya se aplicó al
 * decidir NO usar una heurística de subtítulo para PowerPyx. Con esto
 * algunos aciertos reales de títulos muy cortos se pierden a propósito;
 * es preferible a una lista de "coincide con tu juego" que miente la
 * mitad de las veces.
 */
export function noticiasDeTuBiblioteca(news: NewsItem[], titulosBiblioteca: string[]): (NewsItem & { juego: string })[] {
  const titulos = Array.from(new Set(titulosBiblioteca.filter((t) => t.trim().length > 3)));
  if (titulos.length === 0) return [];

  const resultado: (NewsItem & { juego: string })[] = [];
  for (const item of news) {
    const texto = `${item.title} ${item.summary ?? ""}`;
    const encontrado = titulos.find((t) => new RegExp(`\\b${escaparRegex(t)}\\b`, "i").test(texto));
    if (encontrado) resultado.push({ ...item, juego: encontrado });
  }
  return resultado;
}
