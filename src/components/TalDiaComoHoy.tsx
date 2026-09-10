import Link from "next/link";
import type { Efemeride } from "@/lib/history";
import { TrophyPhoto } from "@/components/TrophyList";
import { gradeLabel } from "@/components/TrophyIcon";
import { colorFor } from "@/lib/design";

/**
 * "Tal día como hoy": trofeos conseguidos el mismo día y mes que hoy, en
 * años anteriores — ver `talDiaComoHoy()` en lib/history.ts. Solo se monta
 * si hay algo que enseñar (la mayoría de los días no habrá coincidencia
 * exacta con años anteriores) — no tiene sentido una tarjeta vacía
 * diciendo "hoy no pasó nada hace tiempo".
 */
export function TalDiaComoHoy({ efemerides, handle }: { efemerides: Efemeride[]; handle: string }) {
  if (efemerides.length === 0) return null;

  return (
    <section
      className="rounded-2xl p-5"
      style={{ border: "1px solid var(--border)", background: "linear-gradient(165deg, rgba(159, 212, 236, 0.08), var(--surface))" }}
    >
      <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold uppercase tracking-wide">
        🕰️ Tal día como hoy
      </h2>
      <div className="flex flex-col gap-3">
        {efemerides.slice(0, 4).map((e) => (
          <Link
            key={`${e.gameId}-${e.trophyId}`}
            href={`/u/${handle}/${e.gameId}`}
            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
          >
            <TrophyPhoto trophy={{ iconUrl: e.iconUrl, grade: e.grade }} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{e.nombre}</p>
              <p className="truncate text-xs text-muted">{e.juego}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: colorFor(e.grade ?? undefined) }}>
                {gradeLabel(e.grade ?? undefined)}
              </p>
              <p className="text-[0.6875rem] text-muted">hace {e.aniosAtras} {e.aniosAtras === 1 ? "año" : "años"}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
