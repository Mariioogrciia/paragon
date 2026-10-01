import { getLocale } from "next-intl/server";

/**
 * Noticias de una plataforma (PlayStation, Steam, Xbox — ver lib/psNews.ts,
 * lib/steamNews.ts, lib/xboxNews.ts). Mismo teletipo que /noticias
 * (rediseño del 1 oct 2026): fecha a la izquierda, titular y entradilla.
 */
export async function NewsFeed({
  titulo,
  badge,
  items,
}: {
  titulo: string;
  badge: string;
  items: { title: string; link: string; pubDate: string | null; resumen: string | null }[];
}) {
  const locale = await getLocale();
  if (items.length === 0) return null;
  const fecha = (iso: string | null) =>
    iso && !Number.isNaN(new Date(iso).getTime())
      ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", timeZone: "Europe/Madrid" }).replace(".", "")
      : "";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-2xl font-bold uppercase">{titulo}</h2>
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{badge}</span>
      </div>

      <ol className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)]">
        {items.map((item) => (
          <li key={item.link} className="border-b border-[var(--border)] last:border-0">
            <a href={item.link} target="_blank" rel="noopener noreferrer nofollow" className="noticia-fila group">
              <time dateTime={item.pubDate ?? undefined} className="font-heading pt-0.5 text-[0.8125rem] font-bold uppercase tabular-nums text-[var(--accent-text)]">
                {fecha(item.pubDate)}
              </time>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-semibold leading-snug transition-colors group-hover:text-[var(--accent-text)]">{item.title}</span>
                {item.resumen && <span className="mt-1 block text-[0.8125rem] text-muted line-clamp-2">{item.resumen}</span>}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
