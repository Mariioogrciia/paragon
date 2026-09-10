import Link from "next/link";
import type { PlatinoAlAlcance } from "@/lib/backlog";
import { relativeDate } from "@/lib/design";

/**
 * Radar de "platinos al alcance" — juegos muy avanzados que llevan meses
 * parados. Ver `platinosAlAlcance()` en lib/backlog.ts para el criterio.
 */
export function PlatinosAlAlcance({ juegos }: { juegos: PlatinoAlAlcance[] }) {
  if (juegos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {juegos.map((g) => (
        <Link
          key={g.gameId}
          href={`/juego/${g.gameId}`}
          className="flex items-center gap-3 rounded-xl p-3.5 transition-colors hover:bg-surface-2"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          {g.iconUrl && <img src={g.iconUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold" title={g.titulo}>{g.titulo}</p>
            <p className="text-xs text-muted">
              {g.progressPercent}% · te {g.trofeosRestantes === 1 ? "falta" : "faltan"} {g.trofeosRestantes} {g.trofeosRestantes === 1 ? "trofeo" : "trofeos"}
            </p>
            <p className="text-[0.6875rem] text-muted">
              Sin tocar desde {relativeDate(g.ultimaVez)}
              {g.horasHltb ? ` · ~${g.horasHltb}h según HLTB para terminarlo` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div
              className="h-9 w-9 rounded-full"
              style={{ background: `conic-gradient(var(--accent) 0%, var(--accent) ${g.progressPercent}%, var(--surface-2) ${g.progressPercent}%, var(--surface-2) 100%)` }}
              aria-hidden="true"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
