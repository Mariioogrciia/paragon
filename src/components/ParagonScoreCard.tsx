import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import type { ParagonScoreBreakdown } from "@/lib/paragonScore";
import { getTranslations } from "next-intl/server";

/**
 * "Paragon Score" — puntuación unificada entre plataformas (lib/paragonScore.ts).
 * Distinto del nivel Paragon de la navbar/tarjeta de perfil (ese sigue
 * siendo solo PSN, a propósito, ver el comentario en paragonScore.ts) —
 * esto es una cifra nueva pensada para poder comparar de verdad entre
 * quien juega en PSN, Xbox o Steam.
 */
export async function ParagonScoreCard({ score }: { score: ParagonScoreBreakdown }) {
  if (score.total === 0) return null;

  const t = await getTranslations("Perfil");
  const max = Math.max(...score.porPlataforma.map((p) => p.puntos), 1);

  return (
    <section className="mb-8 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h2 className="font-heading text-xl font-bold uppercase tracking-wide">{t("ParagonScoreCard.title")}</h2>
        <span className="text-[0.8125rem] text-muted">{t("ParagonScoreCard.subtitle")}</span>
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
                {t("ParagonScoreCard.platformStats", { puntos: p.puntos.toLocaleString("es-ES"), count: p.trofeos })}
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

      <p className="mt-4 text-[0.6875rem] leading-relaxed text-muted">
        {t("ParagonScoreCard.explanation")}
      </p>
    </section>
  );
}
