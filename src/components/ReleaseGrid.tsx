import Link from "next/link";
import { coverGradient } from "@/lib/design";
import { releaseLabelEs, type IgdbGameResult } from "@/lib/igdb/client";

/**
 * Lista de lanzamientos — miniatura, título, etiquetas y fecha a la derecha
 * con flecha, en filas dentro de una tarjeta — para "Próximos lanzamientos"
 * y "Últimos lanzamientos" en las páginas de plataforma. Distinta de
 * `GameGrid` (carátulas iguales en rejilla) y de `RankedList` (puesto
 * numerado): aquí lo que importa es la fecha de cada fila, no un orden.
 */
export function ReleaseGrid({ items }: { items: IgdbGameResult[] }) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      {items.map((g) => (
        <Link
          key={g.igdbId}
          href={`/juego/${g.igdbId}`}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-surface-2"
        >
          <span
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
            style={{ background: coverGradient(String(g.igdbId)) }}
          >
            {g.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{g.title}</p>
            {g.genres.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {g.genres.slice(0, 2).map((genre) => (
                  <span key={genre} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="shrink-0 text-right text-xs font-bold text-muted">{releaseLabelEs(g.releaseDate, g.releasePrecision)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
