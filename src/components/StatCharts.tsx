import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MesConTrofeos } from "@/lib/history";

// `PlaytimeBarChart` vive en su propio archivo (components/PlaytimeBarChart.tsx)
// desde que ganó un "ver más" interactivo — necesita "use client", y este
// archivo se queda como Server Component para todo lo demás (TrophyMonthChart
// no necesita interactividad, no tiene sentido forzarlo a cliente con ella).

/** Barras de trofeos por mes — mismo dato y forma que ya usa /ritmo, aquí en compacto para la sección de estadísticas. */
export function TrophyMonthChart({ meses }: { meses: MesConTrofeos[] }) {
  const t = useTranslations("Analitica.statCharts");
  const mesesCortos = t.raw("mesesCortos") as string[];

  function mesCorto(clave: string): string {
    return mesesCortos[Number(clave.split("-")[1]) - 1] ?? clave.slice(5);
  }

  const maximo = Math.max(...meses.map((m) => m.total), 1);

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wide">{t("trofeosPorMes")}</h3>
        <Link href="/ritmo" className="text-xs font-semibold text-accent hover:underline">{t("verDetalle")}</Link>
      </div>
      <div className="mt-4 flex h-[120px] items-end gap-1.5 border-b border-border">
        {meses.map((m) => (
          <div key={m.mes} className="group relative flex-1" title={t("tooltip", { mes: mesCorto(m.mes), count: m.total })}>
            <div
              className="mx-auto w-full rounded-t-sm transition-opacity group-hover:opacity-80"
              style={{ height: Math.max((m.total / maximo) * 110, m.total > 0 ? 3 : 0), background: "var(--accent-grad)" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {meses.map((m) => (
          <span key={m.mes} className="flex-1 text-center text-[0.5625rem] font-semibold text-muted">
            {mesCorto(m.mes)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranking horizontal de horas por juego — estático (total acumulado), no una serie temporal: ver el comentario de lib/profileStats.ts sobre por qué no existe esa segunda. */
