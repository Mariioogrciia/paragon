import Link from "@/components/Enlace";
import { getLocale, getTranslations } from "next-intl/server";
import { TrophyPhoto } from "@/components/TrophyList";
import { rarity } from "@/lib/design";
import type { PlanPlatino } from "@/lib/planPlatino";

const MAX_POR_FASE = 4;

/**
 * Plan de platino guiado en la ficha del juego (lib/planPlatino.ts): las
 * fases en orden, con su progreso, y los siguientes trofeos de cada una. La
 * fase actual va abierta; el resto, plegadas. Server Component: sin estado,
 * con <details> nativos.
 */
export async function PlanPlatinoCard({ plan, gameId, esMio }: { plan: PlanPlatino; gameId: string; esMio: boolean }) {
  const t = await getTranslations("Biblioteca.planPlatino");
  const locale = await getLocale();

  return (
    <section className="rounded-[18px] p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("titulo")}</h2>
        <span className="text-xs text-muted">{t("faltan", { count: plan.faltan })}</span>
      </div>
      <p className="mb-4 text-[0.8125rem] text-muted">{esMio ? t("descripcion") : t("descripcionAjeno")}</p>

      <ol className="flex flex-col gap-2">
        {plan.fases.map((f, i) => {
          const hecha = f.pendientes.length === 0;
          const actual = f.fase === plan.actual;
          const porcentaje = Math.round((f.conseguidos / f.total) * 100);
          return (
            <li key={f.fase}>
              <details open={actual} className="group rounded-[12px]" style={{ background: actual ? "var(--accent-soft)" : "var(--surface-2)", border: `1px solid ${actual ? "var(--accent-line)" : "var(--border)"}` }}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:text-[var(--accent-text)]">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={hecha ? { background: "rgb(52 168 83 / 0.15)", color: "#86efac" } : { background: "var(--surface)", color: "var(--accent-text)", border: "1px solid var(--accent-line)" }}
                    aria-hidden="true"
                  >
                    {hecha ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(`fase.${f.fase}.nombre`)}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
                        <span className="block h-full rounded-full" style={{ width: `${porcentaje}%`, background: hecha ? "#34a853" : "var(--accent)" }} />
                      </span>
                      <span className="text-[0.6875rem] font-bold tabular-nums text-muted">
                        {f.conseguidos}/{f.total}
                      </span>
                    </span>
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  <p className="mb-3 text-xs leading-relaxed text-muted">{t(`fase.${f.fase}.consejo`)}</p>
                  {f.pendientes.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {f.pendientes.slice(0, MAX_POR_FASE).map((trofeo) => (
                        <li key={trofeo.id} className="flex items-center gap-3">
                          <TrophyPhoto trophy={trofeo} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.8125rem] font-semibold">{trofeo.name}</span>
                            {trofeo.detail && <span className="block truncate text-xs text-muted">{trofeo.detail}</span>}
                          </span>
                          {trofeo.rarityPercent !== undefined && (
                            <span className="shrink-0 text-[0.6875rem] font-semibold text-muted">{rarity(trofeo.rarityPercent, locale).label}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {f.pendientes.length > MAX_POR_FASE && (
                    <p className="mt-2 text-xs text-muted">{t("masPendientes", { count: f.pendientes.length - MAX_POR_FASE })}</p>
                  )}
                  {f.fase === "online" && f.pendientes.length > 0 && esMio && (
                    <Link
                      href={`/sesiones?juego=${encodeURIComponent(gameId)}`}
                      className="mt-3 inline-flex rounded-[10px] px-3 py-2 text-xs font-bold transition-all hover:brightness-110"
                      style={{ background: "var(--accent)", color: "var(--background)" }}
                    >
                      {t("organizarSesion")}
                    </Link>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
