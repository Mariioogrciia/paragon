import Link from "next/link";
import { coverGradient, relativeDate } from "@/lib/design";
import type { Game } from "@/lib/types";

/**
 * "Jugado recientemente" — los juegos ordenados por `lastPlayedAt`, lo más
 * cerca que hay de "últimas sesiones" con datos reales (ver el comentario
 * en la página que llama a esto). Formato de lista compacta, coherente con
 * `ReleaseGrid`/`RankedList` del resto de la app.
 */
export function RecentlyPlayed({ games, handle }: { games: Game[]; handle: string }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      {games.map((g) => (
        <Link
          key={g.id}
          href={`/u/${handle}/${g.id}`}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-surface-2"
        >
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: coverGradient(g.id) }}>
            {g.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.iconUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{g.title}</p>
            <p className="text-xs text-muted">{g.deviceLabel}</p>
          </div>
          <span className="shrink-0 text-xs font-bold text-muted">{relativeDate(g.lastPlayedAt)}</span>
        </Link>
      ))}
    </div>
  );
}
