import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EficienciaJuego, ResumenEficiencia } from "@/lib/backlog";

function Fila({ g, t }: { g: EficienciaJuego; t: ReturnType<typeof useTranslations> }) {
  const rapido = g.diferenciaPct > 0;
  return (
    <Link
      href={`/juego/${g.gameId}`}
      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {g.iconUrl && <img src={g.iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" title={g.titulo}>{g.titulo}</p>
        <p className="text-xs text-muted">
          {t("horasComparadas", { horas: Math.round(g.horasReales), horasHltb: Math.round(g.horasHltb) })}
        </p>
      </div>
      <p className="shrink-0 text-right font-heading text-base font-bold" style={{ color: rapido ? "var(--gold)" : "var(--muted)" }}>
        {rapido ? "+" : ""}{g.diferenciaPct}%
      </p>
    </Link>
  );
}

/**
 * Tu ritmo real de caza frente a HowLongToBeat — solo con lo que ya tienes
 * platinado/100% y que trae los dos datos (ver `eficienciaPersonal()` en
 * lib/backlog.ts). Enseña los extremos (más rápido / con más calma), no la
 * lista entera.
 */
export function EficienciaPersonal({ juegos, resumen }: { juegos: EficienciaJuego[]; resumen: ResumenEficiencia }) {
  const t = useTranslations("Analitica.eficienciaPersonal");
  if (juegos.length === 0) return null;

  // `juegos` ya viene ordenado descendente por `diferenciaPct` (lib/backlog.ts).
  // Antes esto era `slice(0, 3)` / `reverse().slice(0, 3)` a secas, sin mirar
  // el signo — con pocos platinos comparados (el caso real de casi cualquier
  // cuenta hoy) eso metía un juego más LENTO que la media bajo el título
  // "Más rápido que la media" solo porque era el único que había. Ahora cada
  // columna filtra por signo antes de recortar.
  const rapidos = juegos.filter((g) => g.diferenciaPct > 0).slice(0, 3);
  const pausados = juegos.filter((g) => g.diferenciaPct <= 0).slice(-3).reverse();

  return (
    <div>
      {resumen.ritmoMedioPct !== null && (
        <div className="mb-5 rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">{t("tuRitmoMedio")}</p>
          <p className="font-heading text-2xl font-bold">
            {resumen.ritmoMedioPct > 0 ? t("masRapido", { pct: resumen.ritmoMedioPct }) : resumen.ritmoMedioPct < 0 ? t("conMasCalma", { pct: Math.abs(resumen.ritmoMedioPct) }) : t("justoEnLaMedia")}
          </p>
          <p className="mt-1 text-xs text-muted">{t("comparadoCon", { count: resumen.juegosConDatos })}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {rapidos.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t("masRapidoQueLaMedia")}</h3>
            <div className="flex flex-col gap-2">
              {rapidos.map((g) => <Fila key={g.gameId} g={g} t={t} />)}
            </div>
          </div>
        )}
        {pausados.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t("conMasCalmaExploracion")}</h3>
            <div className="flex flex-col gap-2">
              {pausados.map((g) => <Fila key={g.gameId} g={g} t={t} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
