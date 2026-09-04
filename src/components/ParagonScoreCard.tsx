import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import type { ParagonScoreBreakdown } from "@/lib/paragonScore";

/**
 * "Paragon Score" — puntuación unificada entre plataformas (lib/paragonScore.ts).
 * Distinto del nivel Paragon de la navbar/tarjeta de perfil (ese sigue
 * siendo solo PSN, a propósito, ver el comentario en paragonScore.ts) —
 * esto es una cifra nueva pensada para poder comparar de verdad entre
 * quien juega en PSN, Xbox o Steam.
 */
export function ParagonScoreCard({ score }: { score: ParagonScoreBreakdown }) {
  if (score.total === 0) return null;

  const max = Math.max(...score.porPlataforma.map((p) => p.puntos), 1);

  return (
    <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Paragon Score</h2>
        <span className="text-[13px] text-muted">Puntuación unificada entre plataformas</span>
      </div>

      <p className="font-heading text-4xl font-bold tabular-nums" style={{ color: "var(--accent-text)" }}>
        {score.total.toLocaleString("es-ES")}
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {score.porPlataforma.map((p) => (
          <div key={p.platform}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-semibold text-foreground">{PLATFORM_LABEL[p.platform as Platform] ?? p.platform}</span>
              <span className="text-muted">
                {p.puntos.toLocaleString("es-ES")} pts · {p.trofeos} {p.trofeos === 1 ? "trofeo" : "trofeos"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(4, Math.round((p.puntos / max) * 100))}%`, background: "var(--accent-grad)" }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        PSN pesa por metal (bronce/plata/oro/platino) y Xbox por su Gamerscore real — los dos son datos oficiales de
        cada plataforma. Steam no tiene un peso propio por logro, así que aquí se estima por su rareza global (más
        raro, más puntos): es una aproximación, no un dato verificable como los otros dos.
      </p>
    </section>
  );
}
