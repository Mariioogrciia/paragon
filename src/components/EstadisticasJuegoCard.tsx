import { getLocale, getTranslations } from "next-intl/server";
import { estadisticasSteamDeJuego } from "@/lib/estadisticasSteam";
import { formatearEstadistica } from "@/lib/estadisticasJuego";
import type { ProfileRow } from "@/lib/profiles";

/**
 * «Estadísticas del juego» de la ficha (9 nov 2026, "como un tracker"): lo
 * que el juego de Steam guarda de ti (bajas, partidas, distancia…). Va en un
 * <Suspense> de la página para no retrasarla: si Steam tarda o no hay nada,
 * la sección simplemente no sale.
 */
export async function EstadisticasJuegoCard({ profile, gameId }: { profile: ProfileRow; gameId: string }) {
  const locale = await getLocale();
  const lista = await estadisticasSteamDeJuego(profile, gameId, locale).catch(() => null);
  if (!lista || lista.length === 0) return null;
  const t = await getTranslations("Biblioteca.EstadisticasJuego");
  const destacadas = lista.slice(0, 6);
  const resto = lista.slice(6);

  return (
    <section className="rounded-[18px] p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("titulo")}</h2>
        <span className="text-[0.6875rem] text-muted">{t("fuente")}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {destacadas.map((e) => (
          <div key={e.id} className="min-w-0 rounded-[12px] px-3.5 py-3" style={{ background: "var(--surface-2)" }}>
            <p className="font-heading text-xl font-bold tabular-nums" style={{ color: "var(--accent-text)" }}>
              {formatearEstadistica(e, locale)}
            </p>
            <p className="mt-0.5 truncate text-[0.75rem] text-muted" title={e.nombre}>
              {e.nombre}
            </p>
          </div>
        ))}
      </div>
      {resto.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wide text-accent hover:underline">
            <span className="group-open:hidden">{t("verTodas", { n: resto.length })}</span>
            <span className="hidden group-open:inline">{t("verMenos")}</span>
          </summary>
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {resto.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-muted">{e.nombre}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatearEstadistica(e, locale)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
