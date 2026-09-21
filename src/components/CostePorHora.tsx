import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CosteHora, ResumenFinanciero } from "@/lib/backlog";

function Fila({ g, t }: { g: CosteHora; t: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <Link
      href={`/juego/${g.gameId}`}
      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {g.iconUrl && <img src={g.iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" title={g.titulo}>{g.titulo}</p>
        <p className="text-xs text-muted">{t("CostePorHora.hoursPlayed", { price: g.precio.toFixed(2), hours: Math.round(g.horas) })}</p>
      </div>
      <p className="shrink-0 text-right font-heading text-base font-bold">{t("CostePorHora.perHour", { value: g.costeHora.toFixed(2) })}</p>
    </Link>
  );
}

/**
 * Coste por hora — solo tiene sentido con al menos un par de juegos con
 * precio y horas puestos a mano (ver `costePorHora()` en lib/backlog.ts).
 * Enseña los mejores y los peores, no la lista entera: es una curiosidad,
 * no una tabla que consultar a fondo.
 */
export async function CostePorHora({ juegos, resumen }: { juegos: CosteHora[]; resumen: ResumenFinanciero }) {
  if (juegos.length === 0) return null;

  const t = await getTranslations("Biblioteca");
  const mejores = juegos.slice(0, 3);
  const peores = juegos.length > 3 ? [...juegos].reverse().slice(0, 3) : [];

  return (
    <div>
      {/* El panel de conjunto — cuánto has metido en total y qué €/hora te
          ha salido de media, no solo el mejor/peor caso suelto de abajo. */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">{t("CostePorHora.invested")}</p>
          <p className="font-heading text-2xl font-bold">{resumen.totalGastado.toFixed(2)}€</p>
        </div>
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">{t("CostePorHora.hoursGained")}</p>
          <p className="font-heading text-2xl font-bold">{Math.round(resumen.totalHoras)}h</p>
        </div>
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">{t("CostePorHora.averagePerHour")}</p>
          <p className="font-heading text-2xl font-bold">{resumen.costeHoraMedio != null ? `${resumen.costeHoraMedio.toFixed(2)}€` : "—"}</p>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted">
        {t("CostePorHora.dataCoverage", { count: resumen.juegosConDatos })}
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t("CostePorHora.bestValue")}</h3>
        <div className="flex flex-col gap-2">
          {mejores.map((g) => <Fila key={g.gameId} g={g} t={t} />)}
        </div>
      </div>
      {peores.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t("CostePorHora.worstValue")}</h3>
          <div className="flex flex-col gap-2">
            {peores.map((g) => <Fila key={g.gameId} g={g} t={t} />)}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
