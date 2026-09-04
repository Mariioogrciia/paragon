/** Lista de noticias (mismo formato para PlayStation y Steam) — ver lib/psNews.ts / lib/steamNews.ts. */
export function NewsFeed({
  titulo,
  badge,
  items,
}: {
  titulo: string;
  badge: string;
  items: { title: string; link: string; pubDate: string | null; resumen: string | null }[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[18px] p-6" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide">{titulo}</h2>
        <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold uppercase text-accent">{badge}</span>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex flex-col gap-1 rounded-lg px-2 py-3 -mx-2 transition-colors hover:bg-surface-2 first:pt-3 last:pb-3"
          >
            <p className="text-sm font-semibold leading-snug group-hover:text-accent">{item.title}</p>
            {item.resumen && <p className="text-xs text-muted">{item.resumen}</p>}
          </a>
        ))}
      </div>
    </section>
  );
}
