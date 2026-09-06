import Link from "next/link";
import { coverGradient, relativeDate } from "@/lib/design";
import { TrophyPhoto } from "@/components/TrophyList";
import type { TrofeoReciente } from "@/lib/history";

/**
 * "Últimos trofeos" del perfil — los más recientes de TODA la biblioteca
 * (no de un juego suelto), con fecha real (`earnedAt`). Visible tanto para
 * el dueño del perfil como para quien lo visita, igual que el resto de la
 * ficha: es la foto de "qué se ha estado cazando últimamente", pública por
 * lo mismo que ya lo es la biblioteca entera.
 */
export function RecentTrophies({ trofeos, handle }: { trofeos: TrofeoReciente[]; handle: string }) {
  if (trofeos.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 font-heading text-2xl font-bold">Últimos trofeos</h2>
      <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        {trofeos.map((t) => (
          <Link
            key={`${t.gameId}-${t.trophyId}`}
            href={`/u/${handle}/${t.gameId}`}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-surface-2"
          >
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg" style={{ background: coverGradient(t.gameId) }}>
              {t.gameIconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.gameIconUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
              )}
            </span>

            <TrophyPhoto trophy={t} size={30} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.nombre}</p>
              <p className="truncate text-xs text-muted">{t.juego}</p>
            </div>

            <span className="shrink-0 text-xs font-bold text-muted">{relativeDate(t.earnedAt)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
