import { useTranslations } from "next-intl";
import type { DeudaBacklog as DeudaBacklogData } from "@/lib/backlog";

/**
 * "Deuda de backlog" en horas reales, no en número de juegos — ver
 * `deudaBacklog()` en lib/backlog.ts para por qué no hay una fecha
 * estimada de "cuándo la liquidas": no hay dato real para eso, y una
 * fecha inventada sería peor que no ponerla.
 */
export function DeudaBacklog({ deuda }: { deuda: DeudaBacklogData }) {
  const t = useTranslations("Analitica.deudaBacklog");
  if (deuda.juegosContados === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">{t("paraVerCreditos")}</p>
        <p className="font-heading text-2xl font-bold">{deuda.horasHistoriaRestantes}h</p>
        <p className="mt-1 text-xs text-muted">{t("deHistoriaFaltan")}</p>
      </div>
      <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">{t("para100")}</p>
        <p className="font-heading text-2xl font-bold">{deuda.horasPlatinoRestantes}h</p>
        <p className="mt-1 text-xs text-muted">{t("faltanPlatinar")}</p>
      </div>
      <p className="sm:col-span-2 text-xs text-muted">
        {t("footer", { count: deuda.juegosContados })}
      </p>
    </div>
  );
}
