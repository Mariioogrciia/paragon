import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { NewsItem } from "@/lib/rss";

/** Misma tarjeta para "Noticias de tus juegos" y "Últimas Noticias" — el `badge` opcional es lo único que cambia. */
export function TarjetaNoticia({ item, badge }: { item: NewsItem; badge?: string }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-[rgb(var(--accent-rgb)/0.5)]"
    >
      {item.imageUrl ? (
        <div
          className="h-48 w-full bg-cover bg-center border-b border-border transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${item.imageUrl})` }}
        />
      ) : (
        <div className="h-48 w-full bg-muted/20 border-b border-border flex items-center justify-center">
          <span className="text-muted font-heading font-bold text-xl">PARAGON</span>
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-[rgb(var(--accent-rgb))] uppercase tracking-wider">
            {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: es })}
          </span>
          {badge && (
            <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.15)] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[rgb(var(--accent-rgb))]">
              {badge}
            </span>
          )}
        </div>
        <h3 className="font-bold text-lg leading-snug mb-2 group-hover:text-[rgb(var(--accent-rgb))] transition-colors line-clamp-3">
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-muted text-sm line-clamp-2 mt-auto">
            {item.summary.replace(/<[^>]+>/g, '') /* Quitar HTML tags si las hay */}
          </p>
        )}
      </div>
    </a>
  );
}
