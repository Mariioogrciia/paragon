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
export async function getGamingNews(): Promise<NewsItem[]> {
  try {
    // Usamos Eurogamer.es como fuente principal para noticias en español
    const feed = await parser.parseURL("https://www.eurogamer.es/feed/news");
    
    return feed.items.slice(0, 12).map(item => {
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
