import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { platinosDeOferta } from "@/lib/platinosOferta";

/** Etiqueta traducida del nivel de dificultad (1-10, lib/difficulty.ts). */
function claveNivel(nivel: number): "difMuyFacil" | "difFacil" | "difMedia" | "difDificil" {
  if (nivel <= 1) return "difMuyFacil";
  if (nivel <= 2) return "difFacil";
  if (nivel <= 4) return "difMedia";
  return "difDificil";
}

/**
 * "Platinos de oferta" en Descubrir › Steam (lib/platinosOferta.ts). Va en
 * su propio <Suspense>: la primera vez consulta Steam juego a juego (~8 s)
 * y no debe frenar el resto de la página.
 */
export async function PlatinosDeOferta({ userId }: { userId: string | null }) {
  const t = await getTranslations("Descubrir.PlatinosOferta");
  const idioma = await getLocale();
  const lista = await platinosDeOferta(userId, 12).catch(() => []);
  if (lista.length === 0) return null;
  const eur = (n: number) => n.toLocaleString(idioma, { style: "currency", currency: "EUR" });

  return (
    <section className="mb-12" aria-labelledby="platinos-oferta">
      <h2 id="platinos-oferta" className="mb-1 font-heading text-2xl font-bold uppercase">
        {t("titulo")}
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">{t("descripcion")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((p) => {
          const contenido = (
            <>
              <div className="relative aspect-[460/215] w-full overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- cabeceras de Steam */}
                <img loading="lazy" decoding="async" src={p.caratula} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {p.ahorro > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-good px-2 py-0.5 text-[0.6875rem] font-bold text-black">-{p.ahorro}%</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <p className="truncate font-semibold">{p.titulo}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md px-2 py-0.5 text-[0.6875rem] font-bold text-white" style={{ background: p.dificultad.color }}>
                    {t(claveNivel(p.dificultad.nivel))}
                  </span>
                  <span className="text-xs text-muted">
                    {t("logros", { n: p.logros, raro: p.logroMasRaro.toLocaleString(idioma) })}
                    {p.horas ? ` · ${t("horas", { h: Math.round(p.horas) })}` : ""}
                  </span>
                </div>
                <div className="mt-auto flex items-baseline gap-2">
                  {p.precio ? (
                    <>
                      <span className="font-heading text-lg font-bold text-good">{eur(p.precio.final)}</span>
                      {p.precio.inicial > p.precio.final && <span className="text-xs text-muted line-through">{eur(p.precio.inicial)}</span>}
                    </>
                  ) : (
                    <span className="font-heading text-lg font-bold text-good">{p.precioUsd.toFixed(2)} US$</span>
                  )}
                  <span className="ml-auto text-[0.6875rem] font-semibold text-muted">{p.gameId ? t("verFicha") : t("verEnSteam")}</span>
                </div>
              </div>
            </>
          );
          const clase =
            "group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.5)]";
          return p.gameId ? (
            <Link key={p.steamAppId} href={`/juego/${encodeURIComponent(p.gameId)}`} className={clase}>
              {contenido}
            </Link>
          ) : (
            <a key={p.steamAppId} href={p.url} target="_blank" rel="noopener noreferrer nofollow" className={clase}>
              {contenido}
            </a>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">{t("nota")}</p>
    </section>
  );
}

/** Mientras carga: la misma rejilla, vacía. */
export function PlatinosDeOfertaCargando() {
  return (
    <section className="mb-12 animate-pulse motion-reduce:animate-none" aria-hidden="true">
      <div className="mb-2 h-7 w-64 rounded bg-surface-2/70" />
      <div className="mb-4 h-4 w-96 max-w-full rounded bg-surface-2/50" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-64 rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </section>
  );
}
