import { getLocale } from "next-intl/server";
import type { NewsItem } from "@/lib/rss";

/**
 * Últimas noticias como teletipo (Noticias, rediseño del 1 oct 2026): una
 * línea por titular con su hora a la izquierda, como en el panel de salidas.
 * Misma información que la tarjeta de antes (hora, titular, entradilla,
 * imagen, enlace a la fuente), en lista para poder repasarla de un vistazo.
 */
export async function TeletipoNoticias({ items }: { items: NewsItem[] }) {
  const locale = await getLocale();
  const hora = (iso: string) => {
    const d = new Date(iso);
    const hoy = new Date();
    const mismoDia = d.toDateString() === hoy.toDateString();
    return mismoDia
      ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
      : d.toLocaleDateString(locale, { day: "2-digit", month: "short", timeZone: "Europe/Madrid" }).replace(".", "");
  };

  return (
    <ol className="salidas salidas-tablero">
      {items.map((item) => (
        <li key={item.id} className="border-b border-[var(--border)] last:border-0">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="teletipo-fila group">
            <time dateTime={item.pubDate} className="teletipo-hora">
              {hora(item.pubDate)}
            </time>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-semibold leading-snug transition-colors group-hover:text-[var(--accent-text)] line-clamp-2">
                {item.title}
              </span>
              {item.summary && (
                <span className="mt-1 block text-[0.8125rem] text-muted line-clamp-1">{item.summary.replace(/<[^>]+>/g, "")}</span>
              )}
              {item.creator && <span className="mt-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">{item.creator}</span>}
            </span>
            {item.imageUrl ? (
              <span className="teletipo-foto" style={{ backgroundImage: `url(${item.imageUrl})` }} aria-hidden="true" />
            ) : (
              <span className="teletipo-foto" aria-hidden="true" />
            )}
          </a>
        </li>
      ))}
    </ol>
  );
}
